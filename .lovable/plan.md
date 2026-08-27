# Marina Design — criação no Canva com preview e aprovação

Nova aba **Design** dentro da Marina (`/marina`), para o time de marketing/comercial pedir peças no Canva ao motor já integrado, ver a prévia e aprovar antes de qualquer publicação. Nada de chave no navegador: tudo passa pelo proxy que a Marina já usa.

## Experiência

**Aba Design** (visível para `marketing`, `commercial`, `director`, `super_admin`; padrão de perfil = papel do usuário no Arrow, sem dropdown livre).

1. **Conversa** — reusa o chat da Marina (mesmas conversas, mesmo histórico, mesmo indicador "trabalhando…"), com markdown e blocos de código já suportados.
2. **Ações rápidas** — quatro botões que abrem um formulário curto e montam o pedido:
   - Criar post para rede social (tema, texto principal, formato/tamanho)
   - Editar design existente (link do Canva + o que mudar)
   - Exportar design (link + PNG/JPG/PDF + dimensão)
   - Buscar assets / brand kit (termo)
3. **Card de preview** — quando a resposta traz uma linha começando com `DESIGNCANVA: <url>`, aparece um card com prévia embutida do Canva, link "Abrir no Canva" (nova aba) e três ações:
   - **Aprovar e publicar** — pede a exportação ao agente, baixa o arquivo para o armazenamento do Arrow e registra como aprovado
   - **Solicitar ajuste** — campo "o que mudar?" e reenvio ao agente com o link
   - **Descartar** — marca como descartado, sai da fila
   Sem essa linha, nada de card: é resposta normal.
4. **Aba Aprovados** — lista dos designs aprovados com miniatura, quem aprovou, quando, link do Canva e link do arquivo exportado guardado no Arrow.

## Como funciona por baixo

**Detecção do design.** Um utilitário (`src/lib/marina/designSignal.ts`) procura a primeira linha que começa com `DESIGNCANVA:`, extrai a URL e o resto do texto. A regra fica também no servidor, para gravar o sinal em `metadata` da mensagem — assim o card sobrevive ao recarregar a página. O sanitizador do motor será ajustado para preservar essa linha e as URLs do Canva (hoje ele apaga identificadores).

**Instrução ao agente.** O prompt do sistema da Marina ganha um bloco de design: quando criar, editar ou exportar peça no Canva, responder com a linha `DESIGNCANVA: <url>` no topo; e nunca publicar sem aprovação registrada no Arrow. O perfil (marketing/comercial) entra como contexto de tom no pedido.

**Roteamento.** Pedidos de design são sinal externo: `router.ts` ganha padrões (canva, design, post, carrossel, story, banner, arte, brand kit) para ir direto ao motor, sem passar pela apuração interna.

**Tempo de resposta.** O canal já é SSE com status incremental; o cliente passa a tolerar respostas longas (limite de inatividade ≥ 300 s) e mostra "a Marina está trabalhando nisso…" com o passo atual. Falha ou estouro de tempo devolvem mensagem amigável e mantêm o pedido no histórico.

**Persistência.** Nova tabela `marina_design_approvals` (com RLS e GRANT explícitos): conversa e mensagem de origem, URL do Canva, perfil, prompt usado, status (`pendente`, `aprovado`, `ajuste_solicitado`, `descartado`), formato exportado, caminho do arquivo no armazenamento, quem aprovou e quando. Leitura/escrita pela própria pessoa; diretoria e super admin veem tudo da empresa.

**Exportação guardada.** A ação de aprovar chama a função `marina-chat` numa rota nova (`action=design_approve`): ela pede a exportação ao motor, lê a URL do arquivo devolvida, baixa e grava num bucket privado `marina-designs`, e atualiza o registro de aprovação. Chave do motor permanece só no servidor.

## Arquivos

- `src/pages/marina/MarinaChat.tsx` — aba Design + aba Aprovados, com controle por papel
- `src/components/marina/design/DesignQuickActions.tsx` — botões e formulários
- `src/components/marina/design/DesignPreviewCard.tsx` — prévia, aprovar/ajustar/descartar
- `src/components/marina/design/ApprovedDesignsPanel.tsx` — histórico de aprovados
- `src/lib/marina/designSignal.ts` — leitura da linha `DESIGNCANVA:`
- `src/hooks/useMarinaDesigns.ts` — fila pendente, aprovações, exportações
- `src/components/marina/MarinaMessageList.tsx` — renderiza o card quando há sinal
- `supabase/functions/marina-chat/index.ts` — prompt de design, sinal em `metadata`, rota de aprovação/exportação
- `supabase/functions/marina-chat/router.ts` — sinais de design
- `supabase/functions/marina-chat/sanitize.ts` — preserva a linha e URLs do Canva
- Migração: tabela de aprovações + bucket privado

## Fora do escopo

OAuth do Canva (já resolvido no motor), publicação direta em redes sociais e agendamento de posts.
