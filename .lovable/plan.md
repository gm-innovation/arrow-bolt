# Imagem de capa dos avisos (link preview) com a marca Arrow

## Por que isso acontece

O arquivo `public/og-image.png` do projeto ainda é a captura padrão da tela inicial do Lovable, que vem no template inicial e nunca foi substituída. Quando a Marina envia o link `https://arrow.lecsorinnovation.com.br/account/tickets` pelo WhatsApp, o WhatsApp lê as tags Open Graph da página e usa exatamente essa imagem como capa. Não é a Marina nem o WhatsApp escolhendo a imagem — é o próprio site que está apontando para ela.

Também há tags de compartilhamento incompletas: existe apenas `og:image` (com caminho relativo), sem `og:title`, `og:description`, `og:url`, `og:type` nem `twitter:card`, e o `<html lang="en">` e `<meta name="author" content="Lovable">` continuam com os valores do template.

## O que fazer

1. **Nova imagem de capa Arrow (1200x630)** — arte institucional com o logo Lecsor/Arrow, fundo escuro alinhado à identidade do sistema e o texto "Arrow — Gestão operacional". Substitui `public/og-image.png` mantendo o mesmo nome e caminho, para que os links já enviados passem a exibir a arte nova quando o WhatsApp refizer a leitura.
2. **Completar o cabeçalho em `index.html`**:
   - `lang="pt-BR"`;
   - título e descrição mais descritivos ("Arrow — Gestão operacional Lecsor");
   - `og:title`, `og:description`, `og:type=website`, `og:url` e `og:image` com URL absoluta em `https://arrow.lecsorinnovation.com.br` (o WhatsApp e o LinkedIn ignoram caminhos relativos em parte dos casos);
   - `og:image:width`/`height` e `twitter:card=summary_large_image`;
   - remover o `author` do template e o `canonical` inexistente é adicionado apontando para o domínio próprio.
3. **Sem mudança na Marina nem nas notificações** — as mensagens continuam iguais; muda apenas o que o WhatsApp lê do site.

## Observação sobre cache

O WhatsApp guarda em cache a prévia que já leu. Depois de publicar, as mensagens antigas continuarão mostrando a imagem antiga por algum tempo; mensagens novas com o link passam a mostrar a arte da Arrow assim que o WhatsApp refizer a leitura da página.

## Detalhes técnicos

- Arquivos alterados: `public/og-image.png` (nova arte 1200x630) e `index.html` (bloco de meta tags).
- Nada de `og:image` por rota: o WhatsApp e outros leitores de prévia não executam JavaScript, então a tag estática do `index.html` é a única que eles enxergam.
