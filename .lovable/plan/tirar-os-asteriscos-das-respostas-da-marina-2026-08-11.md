# Tirar os asteriscos das respostas da Marina

Na conversa aparecem `**` e `*` literais porque a Marina escreve em Markdown e o chat mostra o texto cru: a mensagem do assistente é renderizada como texto simples (`src/components/ai/AIChat.tsx`, linha 512), sem nenhum interpretador de Markdown. Resultado: `**ENCODER DE VIDEO...**` aparece com os asteriscos à vista, e a leitura em voz também lê esses símbolos.

Decisão proposta: a Marina passa a escrever em texto limpo, sem Markdown. É o que combina com uma conversa e evita depender de formatação.

## O que muda

1. **Regra de estilo na Marina** (`supabase/functions/ai-assistant/index.ts`, bloco da persona)
   - Proibido usar `**`, `*`, `#`, `` ` `` ou tabelas nas respostas.
   - Listas de produtos viram linhas curtas com marcador simples "—" e os dados separados por vírgula, por exemplo:
     `— ENCODER DE VIDEO VGA H265/H264 VIA HTTP · PRD00334 · posição C4 · 10 em estoque · R$ 3.270,28`
   - Ênfase se faz com a escolha das palavras, não com símbolos.

2. **Rede de segurança na exibição** (`src/components/ai/AIChat.tsx`)
   - Antes de mostrar a mensagem do assistente, limpar marcações residuais (`**texto**` → `texto`, `*` de lista → `—`, `#` de título, acentos graves de código).
   - A mesma limpeza vale para o texto enviado à leitura em voz, para não ouvir "asterisco".
   - Preservar quebras de linha (o balão passa a respeitar `whitespace-pre-wrap`), para as listas continuarem legíveis.

3. **Coerência nos outros textos gerados** — aplicar a mesma limpeza aos resumos que a Marina devolve em voz (`LiveVoiceBar`/`SpeakMessageButton` usam o mesmo campo, portanto ficam cobertos pelo item 2).

## Detalhes técnicos

- A limpeza fica num utilitário único (`src/lib/ai/plainText.ts`) usado tanto na renderização quanto no TTS, para não duplicar regex.
- Nada muda no formato da API: `content` continua string; só o conteúdo passa a nascer sem Markdown e é higienizado na borda.
- Sem alteração em ferramentas, gravações ou nas travas de verificação de escrita já implantadas.

## Verificação

- Pedir a lista de encoders no chat e conferir que nenhuma resposta contém `*` ou `#`.
- Conferir que as linhas da lista continuam em linhas separadas.
- Acionar a leitura em voz de uma resposta com lista e confirmar que não há símbolos lidos.
