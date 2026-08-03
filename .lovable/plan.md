# Teste completo do Arrow, perfil por perfil

Objetivo: rodar uma bateria de testes automatizados (Playwright) cobrindo todos os papéis do sistema, com login real por perfil, incluindo fluxos que gravam dados. Ao final: resumo dos bugs no chat e correção dos problemas encontrados.

## 1. Usuários de teste

Criar uma empresa de testes isolada ("QA Automação") e um usuário por papel, todos com e-mail `qa+<papel>@arrow.test` e senha única gerada:

- super_admin, director, coordinator, technician, hr, commercial, marketing, financeiro, compras

O módulo de Qualidade (SGQ) fica **fora do escopo**: por exigência da ISO 9001 não serão criados registros fictícios ali, e o papel `qualidade` e as rotas `/quality/*` não serão testados.

Cada usuário recebe: registro em `auth.users` (confirmado), `profiles` com `company_id` da empresa QA, e a linha correspondente em `user_roles`. O técnico também recebe registro em `technicians`.

Motivo da empresa separada: os fluxos de escrita não poluem os dados reais da Lecsor/GM.

## 2. O que será testado por perfil

Para cada papel, em sessão de navegador própria:

1. Login e redirecionamento correto para a rota base do papel.
2. Varredura de todas as rotas daquele papel (extraídas de `src/App.tsx`): a tela renderiza, sem tela branca, sem erro de runtime, sem 401/403/500 nas chamadas de dados.
3. Verificação de permissão negada: tentar abrir rotas de outros papéis e confirmar o redirecionamento.
4. Menu lateral: cada item visível abre a tela correspondente.
5. Área comum `/corp/*` e `/account/*`.

## 3. Fluxos críticos de escrita (dados de teste identificáveis, prefixo `[QA]`)

- Coordenador: criar cliente, criar ordem de serviço, atribuir técnico, iniciar medição.
- Técnico: abrir OS atribuída, registrar apontamento/checklist, upload de foto.
- RH: cadastrar colaborador, subir documento, abrir/baixar documento (regressão do bug de bucket), solicitação de férias.
- Comercial: criar lead, oportunidade e tarefa.
- Qualidade: nenhum teste (módulo excluído do escopo por conformidade ISO 9001 — sem leitura nem escrita).
- Financeiro: lançar conta a pagar/receber.
- Suprimentos: criar requisição de compra e homologar provedor.
- Diretor: aprovar uma solicitação corporativa e uma requisição de compra.
- Super admin: abrir PM Dashboard, criar item de roadmap, encerrar ticket e conferir que sai das superfícies ativas.
- Corporativo (todos): post no feed, solicitação corporativa, chat com a Marina (resposta em texto).

## 4. Execução técnica

- Scripts Playwright em `/tmp/browser/arrow-qa/`, um arquivo por papel + um runner sequencial; viewport 1280x1800, Chromium headless.
- Coleta por rota: URL final, erros de console, respostas de rede com status >= 400, screenshot em caso de falha.
- Resultado consolidado em JSON/markdown temporário para eu triar.
- Um teste extra de RLS: usuário de um papel tenta ler dados de outra empresa via cliente do backend e deve receber vazio/erro.

## 5. Correções

Os bugs encontrados são classificados em: bloqueante (tela quebra), funcional (fluxo não conclui), permissão/RLS e cosmético. Corrijo bloqueantes e funcionais na sequência, re-rodando o teste do papel afetado para confirmar. Cosméticos entram numa lista no resumo final.

## 6. Limpeza

Ao final, os dados `[QA]` e os usuários de teste ficam disponíveis para reuso dos testes; se você preferir, removo tudo (empresa QA em cascata) ao encerrar — me diga na aprovação.

## Notas técnicas

- Criação dos usuários via SQL nas tabelas de auth/profiles/user_roles (senha com hash bcrypt), sem passar por fluxo público de signup, que está fechado.
- Sessões independentes por papel: cada script faz login por formulário e salva `storage_state`, evitando conflito de localStorage.
- Nada é alterado em arquivos auto-gerados do backend nem nas políticas existentes, exceto se um bug de RLS exigir correção explícita.
