#!/usr/bin/env node
'use strict';
/* Device-class silhouettes for inputs (issue #60).
 *
 * The TV reports the device on each port — displayname2 gives "PlayStation 5",
 * "Nintendo Switch", "Apple TV" — but never per-source art. This matcher maps
 * such names onto the vendored Lucide silhouettes in input-art/, and the
 * installer bakes the result into the candidate's input-art map for every
 * input the owner has not configured art for.
 *
 * Silhouettes, not brand renders, on purpose: vendor photography is not ours
 * to ship and per-device renders are a licensing minefield; the launcher is
 * minimal dark-glass line art, which a photographic render would fight; and a
 * silhouette per device class is reusable across brands. The icons are ISC
 * (three are Feather-derived, MIT) — see input-art/README.md.
 */
const fs = require('node:fs');
const path = require('node:path');

const ART_DIR = path.join(__dirname, 'input-art');
const PNG_DIR = path.join(ART_DIR, 'png');

// Match order matters: "fire tv" and "apple tv" must reach `cast` before the
// bare `tv` keyword does, and the controller keywords come first so a
// "PlayStation 5" is never read as something else. Each group maps to one
// silhouette; the list is most specific intent first.
const RULES = [
  [/(nintendo|switch|playstation|ps4|ps5|xbox|gamepad|controller)/, 'gamepad-2'],
  [/(apple tv|appletv|chromecast|fire tv|fire stick|roku|streaming)/, 'cast'],
  [/(steam|mini pc|desktop|computer|pc)/, 'cpu'],
  [/(blu-?ray|dvd|disc|player)/, 'disc'],
  [/(usb|stick|dongle)/, 'usb'],
  [/(monitor|display)/, 'monitor'],
  [/(tv|television|antenna|cable|satellite|tuner)/, 'tv']
];
const FALLBACK = 'box';

// Finer raster asset rules (Cobalt paints PNG data URIs in background-image
// where SVG data URIs do not paint — findings 13 section 8). Specific consoles,
// streaming boxes, and non-HDMI input types (Screen Sharing, Music Sharing, AV,
// USB/Media) match first; generic HDMI ports fall back to `hdmi`.
const VISUAL_RULES = [
  [/(playstation\s*5|\bps5\b|playstation|\bps4\b)/, 'ps5'],
  [/(nintendo|\bswitch\b)/, 'switch'],
  [/(xbox|gamepad|controller)/, 'xbox'],
  [/(apple\s*tv|appletv|airplay|shield)/, 'apple-tv'],
  [/(fire\s*tv|fire\s*stick|chromecast|roku|streaming|stick|dongle)/, 'fire-tv'],
  [/(screen\s*shar|miracast|smart\s*view|wireless\s*display|mirror|\bcast\b)/, 'screen-share'],
  [/(music\s*shar|bluetooth|soundbar|speaker|audio|\bearc\b|\barc\b|optical|spdif)/, 'audio'],
  [/(steam|mini\s*pc|\bmac\b|desktop|computer|\bpc\b|laptop)/, 'pc'],
  [/(blu-?ray|dvd|disc|player)/, 'disc'],
  [/(\busb\b|\bmedia\b|flash|drive|storage|external)/, 'usb'],
  [/(\bav\b|\bavs\b|composite|component|\brca\b|scart|analog)/, 'av'],
  [/(\btv\b|television|antenna|cable|satellite|tuner|channels|monitor|display)/, 'tv']
];
const PNG_FALLBACK = 'hdmi';
const DOORS = {
  apps: 'door-apps',
  settings: 'door-settings',
  launcher: 'door-launcher'
};

// Icon name -> the baked SVG text, read once. A missing file is a build-time
// error, not a runtime one: the vendored set is part of the repo.
const CACHE = new Map();
function svgFor(icon) {
  if (!CACHE.has(icon)) {
    CACHE.set(icon, fs.readFileSync(path.join(ART_DIR, icon + '.svg'), 'utf8'));
  }
  return CACHE.get(icon);
}

const PNG_CACHE = new Map();
function pngDataUri(name) {
  if (!PNG_CACHE.has(name)) {
    const file = path.join(PNG_DIR, name + '.png');
    if (!fs.existsSync(file)) return null;
    PNG_CACHE.set(name, 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'));
  }
  return PNG_CACHE.get(name);
}

// The matched raster PNG asset for a reported input name, or null for empty.
function pngForName(name) {
  const text = String(name == null ? '' : name).trim().toLowerCase();
  if (!text) return null;
  for (const [rule, asset] of VISUAL_RULES) {
    if (rule.test(text)) {
      const dataUri = pngDataUri(asset);
      return dataUri ? { asset, dataUri } : null;
    }
  }
  const dataUri = pngDataUri(PNG_FALLBACK);
  return dataUri ? { asset: PNG_FALLBACK, dataUri } : null;
}

// The matched icon for the name the TV reports, or null for an empty name.
// Never null for a non-empty name: the fallback silhouette is the point.
function artForName(name) {
  const text = String(name == null ? '' : name).trim().toLowerCase();
  if (!text) return null;
  for (const [rule, icon] of RULES) {
    if (rule.test(text)) return { icon, svg: svgFor(icon) };
  }
  return { icon: FALLBACK, svg: svgFor(FALLBACK) };
}

// The same match as an inline data URI the component's allowlist accepts
// (base64 SVG is in allowedInputArt(); see native-alvidaa.js). Null for an
// empty name, mirroring artForName.
function dataUriFor(name) {
  const art = artForName(name);
  if (!art) return null;
  return 'data:image/svg+xml;base64,' + Buffer.from(art.svg, 'utf8').toString('base64');
}

// The whole set as one build-time payload: the rules as regex sources, the
// SVG silhouettes, and the Cobalt-safe raster PNG hardware + door assets.
// The build does not need to know which ports exist, because the component
// applies the rules to the name the TV reports.
function bundle() {
  const icons = {};
  const names = new Set(RULES.map(rule => rule[1]).concat([FALLBACK]));
  for (const icon of names) {
    icons[icon] = 'data:image/svg+xml;base64,' +
      Buffer.from(svgFor(icon), 'utf8').toString('base64');
  }
  const pngs = {};
  const pngNames = new Set(VISUAL_RULES.map(rule => rule[1]).concat([PNG_FALLBACK]));
  for (const asset of pngNames) {
    const uri = pngDataUri(asset);
    if (uri) pngs[asset] = uri;
  }
  const doors = {};
  for (const [key, file] of Object.entries(DOORS)) {
    const uri = pngDataUri(file);
    if (uri) doors[key] = uri;
  }
  return {
    rules: RULES.map(rule => [rule[0].source, rule[1]]),
    icons,
    fallback: FALLBACK,
    pngRules: VISUAL_RULES.map(rule => [rule[0].source, rule[1]]),
    pngs,
    pngFallback: PNG_FALLBACK,
    doors
  };
}

module.exports = {
  artForName, dataUriFor, pngForName, bundle,
  RULES, FALLBACK, VISUAL_RULES, PNG_FALLBACK, DOORS, ART_DIR, PNG_DIR
};
