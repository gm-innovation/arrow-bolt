# Marina Copiloto: tela de chat completa com o Hermes por trás

Para o colaborador existe **uma única assistente: a Marina**. O Hermes na VPS é o motor — nome, marca e interface nunca o mencionam. Quem tem permissão avançada ganha, dentro da mesma tela, o poder de criar skills e conexões (marketing, comercial, quem mais for liberado).

## O que já foi verificado

- O endpoint responde: `POST http://187.127.60.250:8642/v1/chat/completions` devolveu `401` sem chave — está no ar e fala o formato OpenAI.
- Pela sua descrição, esse mesmo endpoint dá acesso ao Hermes completo: terminal, leitura/escrita de arquivos, busca e extração web, código Python, gestão de skills e memória. Skills novas entram como arquivos `.md` em `/opt/data/skills/` na VPS.
- A Marina já tem despachante único de modelos (`_shared/llm.ts` com `lovable`/`openrouter`/`openai` e fallback), roteador com plano de tarefas e especialistas paralelos — o Hermes entra como novo provedor, sem reescrever a agente.
- Já existem `ai_conversations` e `ai_messages` (com `channel`) para persistir o histórico por usuário.

## A nova tela: "Marina" em tela cheia

Rota `/marina` (link no menu de todas as áreas), layout que o colaborador já conhece de ChatGPT/Gemini:

- **Lista de conversas** à esquerda: nova conversa, renomear, apagar, busca. Persistido no Arrow por usuário, com título gerado automaticamente da primeira mensagem.
- **Área central**: mensagens em markdown, streaming (a resposta aparece sendo escrita), código com destaque e botão copiar, tabelas legíveis, anexos (imagem/PDF) e ditado por voz + resposta falada — reaproveitando a voz oficial já configurada.
- **Compositor** com sugestões iniciais por papel ("OSs em atraso hoje", "pesquisar norma X", "montar campanha de e-mail").
- **Sinal de trabalho**: "consultando o Arrow…", "pesquisando na internet…", "executando análise…" — sempre em nome da Marina, nunca do motor.
- **Fontes**: cada resposta que usou dado interno ou web mostra a origem ("no Arrow agora", "web, 26/08 16h"). Sem nomes de ferramenta, sem UUID — os guardrails atuais continuam valendo.
- O balão flutuante atual e o WhatsApp continuam existindo para perguntas rápidas; a tela cheia é o lugar de trabalho longo.

## Modo avançado (skills e conexões)

Permissão liberável por usuário pelo super admin ("Usuário avançado de IA"). Para quem tem:

- Aba **Skills**: lista as skills instaladas, permite criar/editar/desativar skill em editor markdown com nome, quando usar e instruções; salvar publica o arquivo na VPS pelo próprio agente. Histórico de quem alterou o quê fica no Arrow.
- Aba **Conexões**: cadastrar integrações externas (chave em segredo do backend, nunca visível depois), testar conexão e escolher quem pode usar.
- Aba **Execuções**: o que a Marina rodou em nome do usuário — comando, duração, resultado — para auditoria.
- Sem a permissão, nada disso aparece: a pessoa vê apenas o chat.

## Limites e segurança

- Terminal, escrita de arquivos e execução de código só existem para usuário avançado, e cada execução é registrada. Colaborador comum tem conversa, dados do Arrow e pesquisa web.
- Dados do Arrow continuam vindo **só da Marina**, com o token do usuário e RLS: o motor externo nunca recebe token, PII de RH nem identificadores internos — recebe a pergunta e o resumo já apurado.
- Se o motor externo cair, a Marina responde com o que tem e diz o que não conseguiu consultar (fallback para o modelo interno).
- Recomendação forte: publicar o Hermes em HTTPS com domínio próprio. Hoje é HTTP em IP puro, então chave e conteúdo viajam sem criptografia entre o backend e a VPS.

## Ordem de entrega

1. Provedor novo no despachante + segredos + teste de conexão.
2. Tela `/marina` com histórico persistido e streaming.
3. Roteamento por tarefa: interno na Marina, internet/ferramentas no motor externo, pedidos mistos costurados numa resposta só.
4. Permissão de usuário avançado + abas Skills, Conexões e Execuções.
5. Voz, anexos e sugestões por papel.

## Detalhes técnicos

- `_shared/llm.ts`: `LLMProvider` ganha `"hermes"`, lendo `HERMES_BASE_URL` e `HERMES_API_KEY` dos segredos do backend; modelo `hermes-agent`; suporte a `stream: true` (SSE repassado ao cliente) e fallback para `lovable` em 5xx/401/429. Sem abort por timer curto — teto próprio generoso, já que tarefas com terminal/pesquisa demoram.
- Nova Edge Function `marina-chat` (com `verify_jwt = true`, registrada em `config.toml`): resolve o usuário e o papel no servidor, monta o system prompt da Marina (persona + fuso Brasília + permissões), decide o caminho (Marina interna via `ai-assistant` ou motor externo), faz stream SSE de volta e grava em `ai_conversations`/`ai_messages` com `channel = 'marina_web'`.
- Habilidades sensíveis (terminal, write_file, execute_code, skill_manage) são liberadas na chamada apenas quando o usuário tem a flag avançada; o system prompt do turno também muda. A checagem é server-side, nunca vinda do cliente.
- Migração: `ai_advanced_users` (ou coluna equivalente verificada por função `SECURITY DEFINER`) + `ai_skill_audit` (quem criou/editou skill, conteúdo anterior) + `ai_agent_runs` (execuções avançadas). Todas com `GRANT` explícito, RLS habilitado e políticas por `auth.uid()`; leitura ampla só para `super_admin`/`director`.
- Conexões externas reaproveitam a tabela `ai_external_connectors` já existente; credenciais só em segredos do backend.
- Frontend: `src/pages/marina/MarinaChat.tsx` + `src/components/marina/*` (ThreadList, MessageList, Composer, SourceBadge, SkillsPanel, ConnectionsPanel), hook `useMarinaThreads`/`useMarinaStream` com leitura incremental do SSE. Rota em `src/App.tsx` e item de menu em todas as áreas.
- `guardrails.ts` aplica-se também à saída do motor externo (sem UUID, sem nome de ferramenta, sem bastidores, sem mencionar o motor); qualquer menção a "Hermes" é substituída por "Marina".
- Observabilidade: cada delegação e execução registrada em `ai_assistant_actions` (provedor, objetivo, ms, sucesso).
- Validação depois do deploy: pergunta interna ("OSs em atraso"), pergunta de internet ("cotação do dólar hoje"), pedido misto, criação de skill por usuário avançado e tentativa da mesma ação por usuário comum (deve ser negada).
