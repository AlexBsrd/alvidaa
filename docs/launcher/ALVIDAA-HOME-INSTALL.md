# Alvidaa Home — instalação própria para a 55A6NV

**Estado:** instalada e verificada em 19/11/2026. A TV carregou `/`, conectou ao WebSocket `/ws` e recebeu os recursos do launcher.

Este procedimento prepara uma entrada `vidaa-home` no registro web da TV e aponta-a para a URL definida por `serverUrl` em `server/config.json`. Ele usa o Fetcher/FaaS já instalado, cujo UID (`314`) é o dono do `/APPS/websdk/Appinfo.json` nesta TV. Assim, não precisa do `postinst` root que foi provado na investigação.

Antes de abrir o instalador, configure `serverUrl` com a origem HTTP do host
que serve o Alvidaa (por exemplo, `http://alvidaa-server.local:8765`). O valor
é local à instalação e não deve conter um endereço LAN real em arquivos
publicados.

## Páginas

- Instalar: `/install-alvidaa-home.html` no servidor configurado.
- Remover: `/remove-alvidaa-home.html` no servidor configurado.

As páginas só fazem a alteração quando o botão correspondente é acionado (ou quando o instalador é aberto com `?install=confirm`, usado nesta execução autorizada). A instalação leu o registro atual, criou a cópia `/APPS/websdk/Appinfo.json.alvidaa-home.bak`, acrescentou uma única entrada e confirmou a leitura de volta. Os outros quatro apps permaneceram iguais. Ela não apaga apps preexistentes, não muda a configuração do servidor e não reinicia a TV.

## Desinstalação

A página de remoção elimina somente a entrada `vidaa-home`. Se nenhuma outra entrada tiver mudado desde a instalação, restaura os bytes originais do registro e apaga a cópia. Se houver alterações posteriores de outros apps, mantém essas alterações, remove só `vidaa-home` e deixa a cópia de segurança para recuperação manual.

## Configurações do Home watcher

No launcher servido pelo servidor Python externo, o ícone de engrenagem ao lado
do indicador de status abre `/settings.html`; use as setas do controle para
focar a engrenagem e pressione OK/Enter. Na página de configurações, as setas
navegam entre o campo e os botões. O campo **Atraso ao apertar Home** define,
em segundos, quanto esperar depois que o servidor detecta a Home original
antes de reabrir o Alvidaa (0–60; padrão 0). **Parar serviço** pausa somente
esse retorno automático; HTTP, WebSocket e MQTT permanecem ativos. Depois,
pressione Home para ir à Home original e abra Alvidaa manualmente. Ao carregar
o launcher, o watcher é reativado. Esses controles não são implementados pela
bridge Go executada na TV.

## Estado e limites

- O servidor Python precisa estar ativo no host definido por `serverUrl`, para o tile abrir.
- O watcher do servidor foi ativado após a instalação: ao detectar a tela inicial nativa da VIDAA, o servidor reabre o app Home do Alvidaa. Isso faz o botão Home retornar ao Alvidaa; o usuário confirmou esse retorno automático após pressionar o botão. A configuração é lida ao vivo pelo servidor.
- A TV precisou ser desligada e ligada para atualizar a lista de apps; depois disso, o tile H apareceu e abriu o Alvidaa.
- Antes da instalação, o `Appinfo.json` era um arquivo regular de 9.667 bytes, dono `314:902`, modo `0664`, JSON válido com 4 entradas, sem `vidaa-home` e sem outros tiles chamados `Home`.
- Após a instalação, contém 5 entradas, uma `vidaa-home` apontando para `serverUrl`, mantendo dono `314:902` e modo `0664`. O backup tem os 9.667 bytes originais e quatro entradas.
- A configuração atual do watcher está ativada (server/config.json, watcher.enabled: true). Uma cópia anterior está em server/config.json.before-watcher-20261119-171537.bak. Para voltar ao comportamento nativo do botão Home, desative watcher.enabled e reinicie o servidor. O servidor permanece ativo na janela Konsole.
- O servidor Alvidaa foi deixado ativo no notebook para a página continuar funcionando. O receptor de diagnóstico foi encerrado.
