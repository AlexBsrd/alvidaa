import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock, patch

from server import vidaa_server


class WatcherSettingsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.temp_dir.name) / "config.json"
        self.config_path.write_text(json.dumps({
            "serverUrl": "http://127.0.0.1:8765",
            "shortcuts": [{"name": "Custom", "url": "/custom"}],
            "watcher": {"enabled": True, "interval": 3, "cooldown": 6,
                        "homeDelay": 0, "paused": False},
        }))
        self.config_patch = patch.object(vidaa_server, "CONFIG_FILE", str(self.config_path))
        self.config_patch.start()
        self.addCleanup(self.config_patch.stop)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_delay_update_preserves_other_config_and_rejects_out_of_range(self):
        state = vidaa_server.update_watcher_settings("set_delay", 12)

        self.assertEqual(state, {"delay": 12, "paused": False})
        saved = json.loads(self.config_path.read_text())
        self.assertEqual(saved["serverUrl"], "http://127.0.0.1:8765")
        self.assertEqual(saved["shortcuts"], [{"name": "Custom", "url": "/custom"}])
        self.assertEqual(saved["watcher"]["homeDelay"], 12)

        before = self.config_path.read_text()
        with self.assertRaises(ValueError):
            vidaa_server.update_watcher_settings("set_delay", 61)
        self.assertEqual(self.config_path.read_text(), before)

    def test_pause_persists_until_resume(self):
        paused = vidaa_server.update_watcher_settings("pause")
        self.assertEqual(paused, {"delay": 0, "paused": True})
        self.assertTrue(json.loads(self.config_path.read_text())["watcher"]["paused"])

        resumed = vidaa_server.update_watcher_settings("resume")
        self.assertEqual(resumed, {"delay": 0, "paused": False})

    def test_delayed_bounce_is_cancelled_if_state_leaves_home(self):
        config = json.loads(self.config_path.read_text())
        config["watcher"]["homeDelay"] = 2
        self.config_path.write_text(json.dumps(config))

        bridge = object.__new__(vidaa_server.TVBridge)
        bridge.state = {"statetype": "remote_launcher"}
        bridge.last_launch = 0
        bridge.bounce_lock = threading.Lock()
        bridge.launch_home = Mock()

        def leave_home(_delay):
            bridge.state = {"statetype": "media"}

        with patch.object(vidaa_server.time, "sleep", side_effect=leave_home) as sleep:
            bridge._maybe_bounce_home()

        sleep.assert_called_once_with(2)
        bridge.launch_home.assert_not_called()

    def test_paused_watcher_does_not_bounce(self):
        config = json.loads(self.config_path.read_text())
        config["watcher"]["paused"] = True
        self.config_path.write_text(json.dumps(config))

        bridge = object.__new__(vidaa_server.TVBridge)
        bridge.state = {"statetype": "remote_launcher"}
        bridge.last_launch = 0
        bridge.bounce_lock = threading.Lock()
        bridge.launch_home = Mock()

        bridge._maybe_bounce_home()

        bridge.launch_home.assert_not_called()

    def test_http_settings_page_and_pause_resume_api(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), vidaa_server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{httpd.server_port}"

        def post(data, origin=base):
            req = urllib.request.Request(
                base + "/api/watcher",
                data=json.dumps(data).encode("utf-8"),
                headers={"Content-Type": "application/json", "Origin": origin},
                method="POST",
            )
            return urllib.request.urlopen(req, timeout=2)

        try:
            with urllib.request.urlopen(base + "/settings.html", timeout=2) as response:
                self.assertEqual(response.status, 200)
                self.assertIn(b"Atraso ao apertar Home", response.read())

            with post({"action": "set_delay", "delay": 4}) as response:
                self.assertEqual(json.load(response)["delay"], 4)
            with post({"action": "pause"}) as response:
                self.assertTrue(json.load(response)["paused"])
            with urllib.request.urlopen(base + "/api/watcher", timeout=2) as response:
                self.assertTrue(json.load(response)["paused"])
            with post({"action": "resume"}) as response:
                self.assertFalse(json.load(response)["paused"])

            with self.assertRaises(urllib.error.HTTPError) as error:
                post({"action": "pause"}, origin="http://other-host")
            self.assertEqual(error.exception.code, 403)
            error.exception.close()
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
