# Habilidades da Marina: criar pelo chat, catálogo pronto e aprendizado automático

Hoje as habilidades existem apenas como arquivos `.md` no motor externo, e a lista é obtida perguntando ao próprio motor a cada abertura da aba — frágil, lento e sem catálogo. Além disso, criar habilidade só é possível pelo editor manual da aba Habilidades: pelo chat a Marina não sabe criar nada.

O plano dá três coisas novas: criar habilidade conversando, uma biblioteca de habilidades prontas para ativar com um clique, e sugestões automáticas a partir do uso.

## 1. Catálogo no Arrow como fonte da verdade

Nova tabela de habilidades no banco (nome, descrição, "quando usar", conteúdo em markdown, escopo por empresa/papel, status e origem). O arquivo no motor externo passa a ser apenas o reflexo: quando a habilidade é ativada, o Arrow grava o `.md`; quando é desativada ou removida, apaga.

Status de uma habilidade:

- **catálogo** — habilidade pronta, disponível para ativar, ainda não instalada
- **ativa** — instalada no motor e usada pela Marina
- **sugerida** — proposta pela Marina a partir do uso, aguardando aprovação
- **arquivada**

Ganhos: a lista abre instantânea (vem do banco), sobrevive a queda do motor e mantém histórico em `ai_skill_audit`.

## 2. Biblioteca de habilidades prontas

Conjunto inicial de habilidades escritas para o Arrow, cada uma com "quando usar" e passo a passo, entregues como catálogo com botão **Ativar**:

- Cobrança de OSs em atraso (levantar, priorizar por cliente e redigir a cobrança)
- Relatório diário de operação (agenda do dia, técnicos, pendências)
- Preparar medição/faturamento de uma OS (checar BM/RDT, materiais, valores)
- Resumo de férias e escala do mês por equipe
- Prospecção comercial (pesquisar cliente/embarcação na web e cruzar com o histórico do Arrow)
- Acompanhamento de leads e oportunidades paradas
- Pesquisa de norma técnica (ISO/ABNT) com citação da fonte
- Redação de comunicado interno para o feed corporativo
- Diagnóstico de divergência Omie × Auvo × Arrow
- Resposta a chamado de suporte (contexto do ticket + próximo passo)

A aba Habilidades passa a ter duas seções: **Instaladas** e **Biblioteca** (com busca e categoria).

## 3. Criar habilidade pelo chat

O usuário escreve, por exemplo: "crie uma habilidade para montar o relatório semanal de OSs concluídas por cliente". A Marina:

1. reconhece a intenção de criar habilidade (novo caminho no roteador, antes de qualquer pesquisa);
2. faz no máximo duas perguntas de esclarecimento se algo essencial faltar;
3. redige a habilidade em markdown (nome, quando usar, passo a passo, cuidados) e mostra no chat um cartão de confirmação **Salvar habilidade / Ajustar / Descartar**;
4. ao confirmar, grava no catálogo, instala no motor e responde "já posso usar".

Editar e desativar também funcionam por conversa ("ajuste a habilidade X para incluir…"). Nada é gravado sem confirmação explícita, seguindo o padrão de confirmação pendente já usado pela Marina.

Permissão: qualquer colaborador cria e ativa habilidades pelo chat, sem aprovação de terceiros — a habilidade fica no escopo de quem pediu. A checagem é sempre no servidor.

## 4. Aprender habilidades pelo uso

A Marina passa a observar padrões de uso e propor habilidades sozinha:

- Ao fim de conversas mais longas, avalia se o usuário executou um procedimento repetível e, em caso positivo, registra uma habilidade **sugerida** com o roteiro extraído da própria conversa.
- Uma rotina diária agrupa o histórico recente por usuário/papel: pedidos parecidos repetidos 3 ou mais vezes em 14 dias geram uma sugestão consolidada (sem duplicar sugestão já existente para o mesmo tema).
- As sugestões aparecem na aba Habilidades com **Ativar**, **Editar antes de ativar** e **Descartar** (descartado não volta a ser sugerido), e o usuário recebe um aviso discreto: "notei que você faz isso com frequência — quer que eu transforme em habilidade?".

## Detalhes técnicos

- **Migração**: `ai_skills` (id, company_id, name, slug, description, when_to_use, content, category, status, origin `builtin|user|auto`, created_by, approved_by, usage_hits, timestamps, unique por company+slug) e `ai_skill_suggestions` opcional embutida no mesmo status `sugerida`. `GRANT` explícito para `authenticated`/`service_role`, RLS habilitado; leitura por `company_id` do usuário, escrita só via Edge Function (service role) após checar `is_ai_advanced_user`. Seed das habilidades da biblioteca com `company_id = null` (globais, somente leitura) e `origin = 'builtin'`.
- **`marina-chat`**: `listSkills` deixa de perguntar ao motor e passa a ler `ai_skills`; novas ações `activate_skill`, `deactivate_skill`, `library`, `suggestions`, `approve_suggestion`, `dismiss_suggestion`. `writeSkill`/`deleteSkill` continuam sendo a sincronização com `${SKILLS_DIR}` e passam a ser chamados na ativação/desativação, com o estado de sincronia guardado na linha (`synced_at`, `sync_error`).
- **Intenção de criação no chat**: novo módulo `skills-intent.ts` com detecção (`criar|nova|ensinar|aprender` + `skill|habilidade|rotina|procedimento`) avaliada antes de `pickRoute`; o rascunho é gerado com prompt dedicado e devolvido no SSE como evento `skill_draft`, renderizado pelo cartão de confirmação no `MarinaChat`. A confirmação chama `save_skill`, reaproveitando o registro em `ai_skill_audit`.
- **Aprendizado automático**: nova Edge Function `marina-skill-learner` (`verify_jwt = true` para chamada manual; execução agendada por cron do banco) que varre `ai_messages`/`ai_agent_runs` dos últimos 14 dias, agrupa por similaridade de intenção com o modelo do Lovable AI Gateway e insere `ai_skills` com `status = 'sugerida'`, `origin = 'auto'`. Deduplicação por slug e por temas já descartados.
- **Frontend**: `MarinaSkillsPanel` ganha as seções Instaladas / Biblioteca / Sugestões com filtros; `useMarina` ganha os hooks das novas ações; o cartão de rascunho vira `MarinaSkillDraftCard`. Nada expõe o motor externo — a `sanitize.ts` continua valendo para qualquer texto vindo dele, inclusive rascunhos de habilidade.
- **Prompt**: o system prompt passa a listar as habilidades ativas do usuário (nome + quando usar) para que a Marina as aplique sem precisar consultar arquivos, e a instrução sobre gestão de habilidades passa a citar o fluxo de confirmação.

## Ordem de entrega

1. Migração + seed da biblioteca + catálogo lendo do banco.
2. Aba Habilidades com Instaladas / Biblioteca e ativar/desativar sincronizando com o motor.
3. Criação e edição por conversa com cartão de confirmação.
4. Sugestões automáticas (fim de conversa + rotina diária) e fila de aprovação.
