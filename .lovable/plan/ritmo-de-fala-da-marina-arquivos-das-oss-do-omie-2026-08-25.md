# Ritmo de fala da Marina + arquivos das OSs do Omie

## O que está acontecendo hoje (verificado)

**Velocidade da voz não tem efeito.** A voz oficial está no motor Gemini (voz "Leda", velocidade 1,03). Na função de voz, o valor de velocidade só é enviado para OpenAI e ElevenLabs; no trecho do Gemini ele é simplesmente ignorado — a API do Gemini não tem parâmetro de velocidade, o ritmo se controla pela instrução de fala. Ou seja: mexer no slider hoje não muda nada enquanto o motor for o Gemini.

**Arquivos das OSs: o Arrow só envia, não lê.** A integração com o Omie tem apenas a ação de anexar arquivo (`IncluirAnexo`). Não existe nenhuma leitura de anexos: nem listagem, nem download. Portanto hoje ninguém — nem a tela da OS, nem a Marina — consegue ver o pedido de compra, relatórios ou medição/fechamento que estão anexados na OS do Omie.

## O que vou fazer

### 1. Ritmo de fala controlado por instrução (Gemini)
- O ajuste de velocidade passa a ser traduzido em instrução de ritmo dentro do próprio texto enviado ao Gemini (de "bem pausada" até "rápida e objetiva", em faixas), em vez de ser descartado.
- O slider ganha rótulos que refletem o efeito real ("pausada / natural / ágil / rápida"), e o Laboratório de Voz deixa claro que no Gemini o ritmo é interpretado, não matemático.
- A instrução de ritmo vale em todos os canais que usam a voz oficial: chat web, Marina Live e áudios do WhatsApp.
- Ajuste extra de naturalidade: a instrução padrão passa a pedir frases mais curtas e menos pausas longas, que é o que dá a sensação de lentidão.

### 2. Arquivos da OS no Omie: listar e abrir sob demanda
- Na tela de detalhes da OS aparece a lista de anexos vindos do Omie (nome do arquivo, tipo, tamanho e data), buscada no momento em que a aba é aberta — nada é duplicado no Arrow.
- Clique no arquivo baixa/abre o documento na hora, buscando o conteúdo no Omie. PDFs abrem no visualizador que já existe no sistema.
- Falhas são explícitas ("o Omie não retornou os anexos desta OS"), sem lista vazia silenciosa.
- Continua possível enviar arquivos para a OS no Omie, como hoje.

### 3. Marina responde sobre os arquivos da OS
- Nova capacidade: perguntar "quais arquivos tem a OS 5539?", "essa OS já tem o relatório?", "manda a medição da OS 4319".
- Ela lista os anexos com nome e data, classifica pelo nome quando reconhecível (pedido de compra, relatório, medição/fechamento, nota) e diz o que está faltando.
- No chat web ela entrega o arquivo como anexo/link; no WhatsApp envia o documento na conversa (para arquivos grandes, envia o nome e o caminho no Arrow em vez do arquivo).
- Vale para diretoria, super admin e coordenação; os demais papéis seguem a mesma regra de acesso que já têm às OSs.

### 4. Validação
- Ouvir a mesma frase em 3 posições do slider e confirmar diferença audível de ritmo.
- Abrir uma OS real que tenha anexos no Omie, conferir a lista e baixar um PDF.
- Pedir à Marina os arquivos dessa OS e conferir que ela lista os mesmos itens e entrega o arquivo.

## Detalhes técnicos

- `supabase/functions/ai-text-to-speech/index.ts`: no ramo `gemini`, converter `speed` em diretiva textual de ritmo (faixas ≤0,9 / 0,9-1,05 / 1,05-1,2 / >1,2) anexada a `baseInstructions`; manter `speed` numérico para OpenAI/ElevenLabs. Mesmo mapeamento exposto em `_shared/voice.ts` para os canais que montam o pedido de voz.
- `src/components/super-admin/ai/VoiceLabTab.tsx`: rótulos do slider por faixa e nota de comportamento por motor. Instrução padrão de voz revisada (frases curtas, menos pausa).
- `supabase/functions/omie-proxy/index.ts`: novas ações `list_attachments` e `get_attachment` usando o endpoint de anexos do Omie (`/geral/anexo/` com `cTabela: "os-servico"` e o código da OS); o método exato de listagem/obtenção será confirmado contra uma OS real antes de fixar, e a ação de inclusão atual é preservada. Retorno normalizado: nome, mime, tamanho, data e conteúdo base64 no download.
- Frontend: hook `useOmieIntegration` ganha `listAttachments`/`getAttachment`; nova aba/seção de anexos em `ViewOrderDetailsDialog.tsx`, reaproveitando `PDFCanvasViewer`/`DocumentPreviewDialog` e download via Blob.
- `supabase/functions/ai-assistant/insights.ts`: ferramenta `list_os_attachments` (por número de OS, com resolução do `omie_os_id` pelo espelho e fallback na consulta ao vivo) + `get_os_attachment` para entrega do arquivo; registrar em `READONLY_TOOLS` e nos módulos de `director`, `super_admin` e `coordinator`. Envio de documento no WhatsApp via nova capacidade `sendDocument` em `_shared/channels.ts` (`message/sendMedia` da Evolution), com limite de tamanho.
- Sem tabela nova e sem mudança de RLS. Deploy de `ai-text-to-speech`, `omie-proxy`, `ai-assistant` e `whatsapp-out`.
