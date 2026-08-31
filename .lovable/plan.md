# Aba Design da Marina — fluxo simplificado (Hermes faz tudo)

A aba Design passa a ser só vitrine: um formulário, uma chamada ao motor, quatro variações na tela para aprovar, ajustar ou descartar. Toda a montagem em camadas, revisão de arte, recorte de fotos e edição de arquivo do Canva sai de cena.

## Como fica para quem usa

1. Aba **Design** abre com o formulário **Criar post**:
   - Tamanho (quadrado 1080x1080 / story 1080x1920 / feed 1080x1350)
   - Tema (texto curto)
   - Título
   - Subtítulo (opcional)
   - CTA (opcional)
   - Estilo (moderno / corporativo / criativo / minimalista)
   - Fundo (opcional: cor, gradiente ou estilo)
   - "Incluir logotipo Lecsor" marcado por padrão
2. Ao enviar, o Arrow monta um único pedido e manda ao motor. O palco mostra "Gerando as variações…" com o tempo correndo (a geração leva de 1 a 3 minutos).
3. O motor devolve pares `PREVIEW:` (PNG) + `DESIGNCANVA:` (link do arquivo). O Arrow cria um card por variação:
   - miniatura do PNG (clique amplia)
   - link **Abrir no Canva**
   - **Aprovar** · **Solicitar ajuste** · navegação **← / →** entre as variações, com contador "2 de 4"
4. **Aprovar**: baixa o PNG para o acervo do Arrow, marca `aprovado`, mostra na aba **Aprovados** e avisa por notificação. As outras variações do mesmo lote ficam como `descartado`.
5. **Solicitar ajuste**: campo de texto e envio de `Ajuste o design <url_canva>: <instrução>` ao motor; a resposta entra como nova variação no mesmo lote.
6. A conversa continua ao lado: mensagem sem `PREVIEW:`/`DESIGNCANVA:` aparece como texto normal, sem virar pedido de peça.

## Mensagens de erro

- Resposta sem os sinais → exibida como texto comum na conversa.
- Falha de conexão com o Canva (OAuth/credencial) → "Canva temporariamente indisponível. O administrador foi notificado. Tente novamente em alguns minutos." com botão **Tentar de novo**.
- Passou do tempo limite → "A geração está demorando mais que o esperado. O design ficará pronto em breve." O lote continua em segundo plano e a tela atualiza sozinha quando chega.

## Detalhes técnicos

**Banco** — migração em `marina_design_approvals`: novas colunas `batch_id uuid`, `variant_index int`, `preview_url text`, `form jsonb` (o briefing preenchido). Índice por `batch_id`. Sem tabela nova, então grants/RLS atuais continuam valendo.

**Edge Function `marina-chat`**
- Novo `design.ts`: `buildPostPrompt(form)` monta o prompt padrão (tamanho, tema, fundo, título, subtítulo, CTA, logo, estilo + instrução de exportar cada design em PNG e responder em pares `PREVIEW:`/`DESIGNCANVA:`); `readDesignVariants(text)` extrai os pares na ordem; `readCanvaOff` continua traduzindo falha de Canva.
- Remover do fluxo: `layers.ts`, `png.ts`, `artDirector.ts` (briefing/revisão), `processCanvaDesign` em etapas, e as ações `design_retry_canva` por camada e `design_adjust_canva` por edição de arquivo. Nada mais chama `start_editing_transaction` / `perform_editing_operations`.
- Ações do endpoint: `design_create` (form → job em segundo plano, uma única chamada ao motor com timeout de 300 s), `design_adjust` (reenvio com a instrução), `design_approve` (baixa o PNG para `marina-designs/{user_id}/{design_id}.png` e marca aprovado, descartando as irmãs do lote), `design_status` e `designs` (listagem por lote) mantidos.
- Trilha de etapas reduzida a duas: `geracao` → `pronto`, com pulso para o palco acompanhar.

**Frontend**
- `DesignQuickActions.tsx` vira `DesignPostForm.tsx` (os campos acima, com validação de título obrigatório e onError em toast).
- `DesignStage.tsx` reescrito como carrossel de variações do lote atual (miniatura, link Canva, aprovar/ajustar/navegar), sem timeline de camadas nem retomada por camada.
- `useMarinaDesigns.ts`: tipos `MarinaDesignVariant`/lote, hooks `useCreateDesignPost`, `useAdjustDesign`, `useApproveDesign`, `useSetDesignStatus`; polling enquanto o lote está gerando.
- `designSignal.ts` passa a ler os dois sinais e devolver a lista de variações; as linhas técnicas continuam invisíveis na conversa.
- `ApprovedDesignsPanel` e o acervo de assets seguem como estão.

**Não muda**: endpoint/segredos do motor (já em `hermes.ts` via segredos do backend), papéis com acesso à aba (marketing, comercial, direção, super admin), abas de Habilidades/Conexões/Execuções.
