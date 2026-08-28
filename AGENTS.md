# AGENTS.md — Arrow

Leia este arquivo antes de qualquer alteração. O contexto completo por módulo está em **[`docs/arrow-knowledge.md`](docs/arrow-knowledge.md)**.

## O que é o Arrow

Plataforma de gestão operacional (ERP + SGQ + RH + CRM) da Lecsor Technology, voltada a serviços técnicos navais e industriais. É multiempresa (dados segmentados por `company_id`), multipapel (cada área tem rota base e permissões próprias) e multi-plataforma (web, PWA e app Android via Capacitor com atualização OTA). Interface e dados em português do Brasil.

## Stack

React 18 + Vite + TypeScript + Tailwind/shadcn no frontend; TanStack Query para dados; backend Lovable Cloud (Postgres, Auth, Storage, Edge Functions em Deno); IA pelo Lovable AI Gateway; servidor MCP exposto como Edge Function.

## Áreas por papel

`super_admin` → `/super-admin/*` · `director` → `/manager/*` · `coordinator` → `/admin/*` · `technician` → `/tech/*` · `hr` → `/hr/*` · `commercial`/`marketing` → `/commercial/*` · `quality` → `/quality/*` · `finance` → `/finance/*` · suprimentos → `/supplies/*` · todos → `/corp/*` e `/account/*`.

`director` é papel estratégico com poder de aprovação; `coordinator` é o administrador operacional. Não são sinônimos.

## Regras invioláveis

- **Datas**: usar `new Date(y, m-1, d)` ou `parseISO()`. Nunca `new Date('YYYY-MM-DD')`.
- **RLS**: toda tabela nova em `public` exige `GRANT` explícito + RLS habilitado + políticas.
- **Papéis**: apenas em tabela dedicada, verificados por função `SECURITY DEFINER`. Nunca em `profiles`, nunca a partir do cliente.
- **Edge Functions**: registrar em `supabase/config.toml` com `verify_jwt = true`.
- **Recursos nativos**: sempre degradar para web via `isNativeApp()`.
- **Não editar** arquivos auto-gerados: cliente e tipos do backend, `.env`, configurações de projeto do backend e o handler MCP gerado.
- **Segredos**: nada de chave privada no frontend. Ver `docs/seguranca-segredos.md`.

## Onde olhar

`src/App.tsx` (rotas) · `src/pages/<área>/` (telas) · `src/hooks/use<Domínio>.ts` (dados) · `src/components/<área>/` (UI) · `supabase/functions/<nome>/` (backend) · `src/lib/mcp/` (ferramentas MCP).
