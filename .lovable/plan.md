# Marina: áudio confiável e número de OS sempre correto

Dois problemas distintos apareceram no mesmo episódio.

## Problema 1 — a pergunta por áudio precisou ser repetida 3 vezes

Hoje a gravação de voz falha em silêncio ou devolve texto vazio em situações comuns:

- A transcrição é enviada sem nenhuma pista de vocabulário. Números falados ("três seis cinco quatro", "OS trinta e seis cinquenta e quatro") e jargão da operação (OS, medição, faturada, Auvo, Omie, EVA) chegam ao modelo sem contexto, então saem errados ou vazios.
- Quando a transcrição volta vazia ou o serviço responde erro temporário, o app só mostra um aviso e descarta o áudio: você precisa gravar tudo de novo. Não há nenhuma tentativa automática nem forma de reaproveitar a gravação.
- A gravação não detecta silêncio nem fala baixa. Áudio quase mudo é enviado, gasta tempo e volta vazio.

O que muda:

1. Pista de vocabulário na transcrição: contexto em português com os termos da operação e a instrução de transcrever números como dígitos. Reduz drasticamente o erro em número de OS.
2. Reaproveitamento da gravação: o áudio fica guardado no turno; em falha temporária o sistema tenta de novo automaticamente uma vez e, se ainda falhar, oferece "tentar novamente" usando o mesmo áudio, sem regravar.
3. Aviso de áudio fraco: se o nível captado ficou muito baixo, o app avisa antes de mandar ("não te ouvi, fale mais perto") em vez de esperar o serviço devolver vazio.
4. Mesmo tratamento no WhatsApp: áudios recebidos passam a usar a mesma pista de vocabulário e a mesma retentativa; áudio inaudível recebe resposta pedindo repetição em vez de silêncio.

## Problema 2 — ela escreveu "OS 3564" e trouxe os dados da OS 3654

A busca estava certa; o texto da resposta trocou os dígitos. É erro de redação do modelo, não de dados — e é o tipo de erro perigoso, porque o número lido é o que a pessoa vai repassar.

O que muda: passa a existir uma verificação determinística de identificadores na saída, no mesmo lugar onde já checamos valores em dinheiro. Todo número de OS/pedido citado na resposta precisa existir nos dados daquele turno (resultado de consulta ou na sua própria mensagem). Quando não existir:

- Se houver exatamente um número de OS nos dados do turno, o número errado é corrigido automaticamente para o correto.
- Se houver ambiguidade, a frase é refeita antes de chegar a você.

Nunca mais sai um número de OS que não veio dos dados.

## Detalhes técnicos

- `supabase/functions/ai-speech-to-text/index.ts`: enviar `prompt` de vocabulário pt-BR ao gateway (`openai/gpt-4o-mini-transcribe`), aceitar `prompt` opcional do cliente, e tratar 429/5xx com uma retentativa com backoff curto (429/5xx são os únicos status retentáveis; 400/401/402/403 seguem terminais com mensagem em português).
- `src/hooks/useVoiceRecorder.ts`: guardar o `Blob` do último áudio em ref, expor `retry()`, medir RMS durante a captura para bloquear áudio quase mudo, e uma retentativa automática quando a resposta vier vazia ou com status retentável.
- `src/components/ai/…` (barra de voz do chat): botão "tentar novamente" quando `retry()` estiver disponível.
- `supabase/functions/_shared/voice.ts` / `whatsapp-in`: mesma pista de vocabulário e retentativa na transcrição de áudio recebido; resposta pedindo repetição quando a transcrição vier vazia.
- `supabase/functions/ai-assistant/guardrails.ts`: novo `extractOrderNumbers()` (padrões "OS 1234", "O.S. 1234", "ordem de serviço 1234", números de 3–6 dígitos junto de "OS") e `findUnverifiedOrderNumbers()`, integrados a `checkOutput` com fonte = resultados de ferramentas do turno + mensagem do usuário; correção de dígito único em `rewriteOutput` quando houver apenas um candidato.
- `supabase/functions/ai-assistant/index.ts`: passar as fontes do turno para a nova checagem (a coleta de saídas de ferramentas já existe) e registrar em log quando houver correção, para medirmos recorrência.

Nada de mudança de banco, RLS ou papéis. Todos os textos visíveis em pt-BR.
