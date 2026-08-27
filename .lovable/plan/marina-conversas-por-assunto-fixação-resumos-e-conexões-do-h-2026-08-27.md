# Marina: conversas por assunto, fixação, resumos e conexões do Hermes

Tudo aqui vale igualmente para o chat no Arrow e para o WhatsApp — o WhatsApp passa a ser apenas uma interface da mesma Marina, com as mesmas conversas, resumos e habilidades.

## 1. Menu: Marina abaixo do Dashboard

Hoje a Marina é inserida como primeiro item de todas as áreas. Passa a ser inserida logo após o item Dashboard de cada perfil (e no topo apenas se a área não tiver Dashboard).

## 2. Coluna de conversas mostra o assunto, não a primeira frase

Hoje o título da conversa é os primeiros 60 caracteres da primeira mensagem. Passa a ser um **assunto curto** (até ~40 caracteres) gerado automaticamente pela Marina depois da primeira troca e reavaliado se o rumo da conversa mudar. O usuário continua podendo renomear manualmente; título manual nunca é sobrescrito.

## 3. Fixar conversas

- Botão de alfinete em cada conversa da lista (chat e conversas vindas do WhatsApp).
- Conversas fixadas aparecem em um bloco "Fixadas" no topo, o resto por data de atualização.
- Estado guardado no banco, por conversa.

## 4. Histórico íntegro + resumos para contexto

- Nenhuma mensagem é apagada: o histórico completo continua guardado.
- A cada bloco de mensagens novas (aprox. 10), a Marina atualiza um **resumo acumulado** da conversa (fatos, decisões, OS/cliente em foco, pendências).
- No envio ao motor, o contexto passa a ser: resumo + últimas mensagens (em vez de recortes crus), reduzindo tokens e acelerando a resposta. Mesma regra no WhatsApp, que hoje manda apenas as 10 últimas mensagens sem resumo.

## 5. WhatsApp dividido por assunto

No WhatsApp a conversa é contínua; no Arrow ela aparece separada por assunto.

- Cada mensagem recebida é avaliada: continua o assunto atual ou abre um novo?
  - Continua se houver atividade recente (janela de tempo) e o tema for o mesmo.
  - Abre novo assunto quando o tema muda claramente ou após um intervalo longo de silêncio.
- Cada assunto vira uma conversa própria na coluna da Marina no Arrow, com título de assunto, resumo e marcador de origem "WhatsApp".
- A pessoa no WhatsApp não percebe divisão nenhuma: para ela segue um fio único.
- Conversas do WhatsApp podem ser fixadas, renomeadas e retomadas pelo chat do Arrow — é o mesmo histórico.

## 6. Aba "Conexões" com as conexões nativas do Hermes

- A aba passa a listar primeiro o **catálogo de conexões que o motor já oferece** (ex.: e-mail, calendário, drive/arquivos, planilhas, busca web, repositórios, mensageria), cada uma com o que faz e o que é preciso para ativar.
- Botão "Conectar" abre um formulário com os campos de credencial daquela conexão. As credenciais vão para os segredos do backend — nunca ficam no banco nem no frontend.
- Estado por conexão: disponível / conectada / com erro, com teste de conexão.
- As conexões próprias já cadastradas (REST personalizadas) continuam listadas abaixo do catálogo.

## Detalhes técnicos

**Banco (`ai_conversations`)**: novas colunas `channel` (`marina_web` | `whatsapp`), `subject`, `title_locked` (renomeação manual), `pinned_at`, `summary`, `summary_until_message_at`, `last_message_at`, `message_count`; índices por `user_id, pinned_at desc, last_message_at desc`. Backfill de `channel` a partir de `context->>'channel'`. Nada de nova tabela para mensagens — `ai_messages` segue íntegra.

**Backend**:
- `marina-chat`: módulo novo `context.ts` com `buildContext()` (resumo + últimas N mensagens), `refreshSummary()` e `deriveSubject()`; chamados após cada turno, com modelo rápido do gateway.
- `whatsapp-in`: substitui `channel_identities.conversation_id` fixo por resolução de assunto — reaproveita a conversa ativa dentro da janela ou cria nova; usa `buildContext()`; grava `channel: 'whatsapp'`.
- `hermes.ts`: `listEngineConnectors()` tentando os endpoints de descoberta do motor, com fallback para catálogo curado em `connectors-catalog.ts` (mesma normalização usada pela UI, sem expor a marca do motor).
- Ação `set_connector_credential` no `marina-chat` grava o segredo pelo nome declarado no catálogo e marca a conexão como ativa em `ai_external_connectors`.

**Frontend**: `useMarina.ts` (threads com pin/canal/assunto, mutação `togglePin`), `MarinaThreadList.tsx` (grupo Fixadas, alfinete, badge de canal), `MarinaConnectionsPanel.tsx` (catálogo + formulário de credencial + teste), `DashboardLayout.tsx` (posição do item no menu).
