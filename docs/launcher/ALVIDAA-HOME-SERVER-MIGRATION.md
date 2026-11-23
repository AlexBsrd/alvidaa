# Migração do servidor Alvidaa para um equipamento sempre ligado

Estado em 23/11/2026: a TV Hisense `55A6NV` (nome da plataforma no browser: `55A60QUV`; firmware `V0000.09.60L.Q0623`) usa o Alvidaa Home no endereço definido em `server/config.json` (`serverUrl`). O host atual é o notebook, com endereço LAN configurado localmente. O servidor Python está rodando em uma janela Konsole visível e o watcher está ativado. A TV abre YouTube pelo launcher e o botão Home retorna ao Alvidaa.

## Objetivo

Mover o servidor para um host que fique ligado, mantendo os mesmos recursos e o watcher. Usar uma reserva DHCP/endereço estável no novo host e, se disponível, manter a porta 8765.

## Operação atual no notebook

O destino permanente ainda não foi escolhido; por enquanto, a TV continua usando o notebook. O servidor roda pelo ambiente próprio do projeto em `server/venv` e permanece em uma janela Konsole visível. O processo atende na porta 8765. Para o futuro host dedicado, ainda será necessário escolher um endereço estável e mantê-lo na mesma rede da TV.

Na raiz do repositório, para abrir novamente uma janela visível, execute:

    ./server/start-visible.sh

O script lê o endereço da TV de `server/.host` (arquivo local, não versionado), usa a porta 8765 por padrão e recusa iniciar se a porta já estiver ocupada. A dependência Python está fixada em `server/requirements.txt` (`paho-mqtt` 2.2.0); em uma instalação nova, recrie `server/venv` com esses requisitos. O servidor não foi configurado para iniciar sozinho no login, para manter a execução visível e evitar uma instância oculta.

O tile instalado na TV mantém uma URL própria no registro dela. `serverUrl` em `server/config.json` é a fonte central para as páginas, relatórios e operações de instalação/migração; se o endereço do host mudar, atualize esse campo, reinicie o servidor e abra `/migrate-alvidaa-home-url.html?migrate=confirm` na TV para atualizar o tile persistido. Cada migração cria um backup novo, sem sobrescrever backups anteriores. A migração para um equipamento dedicado fica adiada; não é necessário fazer uma reserva DHCP no roteador para continuar usando o notebook com o IP manual atual.

## Dados necessários antes da migração

- Modelo do equipamento e sistema operacional.
- Endereço IP reservado para ele na rede.
- Conta SSH ou acesso local ao host.
- Confirmar que ele fica ligado e na mesma rede da TV.
- Acesso ao notebook atual durante o corte, para rollback.

Não registrar senhas, tokens ou chaves privadas neste documento.

## Arquivos necessários

O servidor de referência é `server/vidaa_server.py` (Python), com dependência `paho-mqtt`. O diretório `server/keys/` contém as credenciais emparelhadas com esta TV:
- `tokens.json`
- `vidaa_cert.pem`
- `vidaa_key.pem`

São segredos: transferir por SSH/SCP, manter o diretório acessível apenas à conta do servidor (arquivos modo 0600; diretório 0700) e nunca anexá-los a mensagens ou arquivos de revisão. Não parear outro servidor enquanto a sessão atual estiver ativa.

Copiar também `server/config.json` (watcher ligado) e a pasta `launcher/`. Excluir `.git` e o ambiente virtual atual; recriar o ambiente no host.

## Ordem de corte

1. Reservar o IP do host no roteador. Ainda não alterar o tile da TV.
2. Copiar o projeto, as credenciais e a configuração para o host.
3. Criar um ambiente Python, instalar `paho-mqtt` e preparar um serviço de inicialização (por exemplo systemd, em Linux).
4. Parar o servidor do notebook. **Não executar dois servidores com as mesmas credenciais ao mesmo tempo:** a TV/broker desconecta uma sessão em favor da outra.
5. Iniciar o servidor no novo host e verificar conexão MQTT, `GET /`, WebSocket `/ws` e estado Live.
6. Atualizar a entrada `vidaa-home` em `/APPS/websdk/Appinfo.json` para o novo URL e ícone, preservando todas as outras entradas. A instalação atual foi feita por um módulo FaaS dedicado; o instalador original recusa alterar uma entrada existente, então criar uma ação de migração específica com backup e verificação de leitura de volta. Não clicar em “Install as App” sem adaptar esse fluxo.
7. No televisor, abrir o tile H; confirmar Live, abrir YouTube, pressionar Home e confirmar o retorno automático. Conferir logs no novo host.
8. Só após confirmar, deixar o servidor do notebook parado e registrar a reversão.

## Inicialização automática e observabilidade

No host Linux, executar como usuário dedicado, com `Restart=always`, caminho de trabalho explícito, saída no journal e `systemctl enable --now`. Documentar o nome do serviço, caminho do checkout, IP/porta e como consultar logs. Não abrir a porta do MQTT na rede; o host inicia a conexão de saída para a TV na porta 36669. O HTTP 8765 precisa aceitar conexão da TV na rede local.

## Reversão

Manter o checkout, a configuração e as credenciais atuais do notebook sem alterações até o fim do teste. Se o novo host falhar, parar o serviço nele antes de iniciar o servidor do notebook (uma sessão por TV), restaurar a URL antiga da entrada `vidaa-home` com verificação de leitura de volta e conferir o tile.

## Próxima informação

A migração para outro equipamento está pendente porque o destino ainda não foi escolhido. Enquanto isso, manter o servidor atual no notebook e usar `server/start-visible.sh` para repetir sua inicialização. Ao escolher o host 24/7, definir para ele um endereço estável, atualizar localmente `serverUrl` e seguir a ordem de corte e reversão acima. Não publique os endereços LAN usados na configuração local.
