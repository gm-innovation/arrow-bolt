# Arquivo de knowledge do Arrow para agentes de IA externos

Objetivo: um arquivo único, estruturado e legível por máquina, que qualquer agente externo (ChatGPT via MCP, Cursor, Claude, Codex) leia no início e entenda o que é o Arrow, quais módulos existem, quem acessa o quê e onde cada coisa vive — em nível de **visão geral por módulo**, sem descer a tabelas e triggers.

## Entregáveis

1. `AGENTS.md` (raiz) — arquivo curto de entrada. Diz o que é o Arrow em 5 linhas, a stack, as regras invioláveis (não editar arquivos auto-gerados, RLS obrigatório, datas locais, papéis) e aponta para o documento completo.
2. `docs/arrow-knowledge.md` — o knowledge estruturado, com seções fixas e cabeçalhos previsíveis para facilitar recuperação por trecho.

## Estrutura de `docs/arrow-knowledge.md`

1. **Identidade** — o que é o Arrow: ERP/plataforma de gestão operacional para serviços técnicos navais e industriais (Lecsor / GM Innovation), multiempresa, web + PWA + app Android nativo.
2. **Stack e arquitetura** — React 18 + Vite + TS + Tailwind/shadcn; backend Lovable Cloud (Postgres, Auth, Storage, Edge Functions); Capacitor para nativo; OTA via Capgo; MCP server exposto em `supabase/functions/mcp`.
3. **Papéis e áreas** — tabela papel → rota base → escopo:
   - `super_admin` → `/super-admin/*` — foco no produto/sistema (PM Dashboard, IA, walkthroughs, empresas, assinaturas)
   - `director` → `/manager/*` — visão estratégica e aprovações
   - `coordinator` / gestão operacional → `/admin/*` — ordens de serviço, agenda, clientes, medições
   - `technician` → `/tech/*` — tarefas, relatórios, check-in com foto/GPS
   - `hr` → `/hr/*`; `commercial` / `marketing` → `/commercial/*`; `quality` → `/quality/*`; `finance` → `/finance/*`; suprimentos → `/supplies/*`
   - todos os colaboradores → `/corp/*` (feed, solicitações, documentos, universidade)
4. **Mapa de módulos** — uma subseção por módulo com: propósito, principais telas (rotas reais), conceitos-chave e limites. Módulos: Operação/OS, Técnicos, Medições e faturamento, RH/DP, Corporativo, Qualidade (SGQ ISO 9001), Comercial/CRM, Suprimentos, Financeiro, Universidade Corporativa, IA (Marina), Super Admin/PM.
5. **Fluxos transversais** — ciclo de vida da OS; medição → faturamento; solicitações corporativas com aprovação do diretor; revisão documental de RH; ciclo de documentos do SGQ; tickets de suporte → roadmap.
6. **Convenções que um agente precisa respeitar** — datas locais (nunca `new Date('YYYY-MM-DD')`), RLS + GRANT em toda tabela pública, papéis em tabela separada, Edge Functions registradas em `config.toml`, degradar recursos nativos via `isNativeApp()`, arquivos auto-gerados proibidos.
7. **Integrações** — Omie ERP via proxy, WhatsApp, Lovable AI Gateway (chat/voz/embeddings), GitHub Actions (APK e bundle OTA), MCP.
8. **Onde olhar no código** — mapa curto de diretórios (`src/pages/<área>`, `src/hooks/use*`, `src/components/<área>`, `supabase/functions/<nome>`) e política de segredos (aponta para `docs/seguranca-segredos.md`).
9. **Glossário pt-BR** — OS, medição, ISS "por dentro", NCR, SGQ, ASO, EPI, OTA, docking.

## Como o conteúdo será apurado

As rotas e módulos serão extraídos de `src/App.tsx` (já levantado), da sidebar de cada área e dos nomes de hooks/Edge Functions — sem inventar comportamento. Onde algo não for verificável na leitura, o documento diz apenas o propósito da tela, sem afirmar regra de negócio.

## Detalhes técnicos

- Markdown puro, títulos em `##`/`###` estáveis, tabelas curtas — bom para chunking em RAG e para leitura direta por agentes.
- Sem segredos, sem IDs de projeto, sem URLs internas de backend.
- Nada de código de aplicação é alterado: apenas os dois arquivos de documentação.
