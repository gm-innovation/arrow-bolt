
# Limpar a sidebar do Super Admin (foco em sistema, não operação)

Entendido: a área `/super-admin/*` é para gestão da plataforma (empresas, usuários, assinaturas, integrações, IA, PM, suporte), não para operação de OS/relatórios de campo.

## Diagnóstico
Olhando o menu atual (screenshot), o item **"Relatórios"** (`/super-admin/reports`) exibe `task_reports` — aprovação de relatórios técnicos de OS. Isso é operação, não gestão de sistema. Deve sair do Super Admin. Aprovação de relatório técnico já existe no fluxo do Coordenador/Diretor (`/admin/*`, `/manager/*`).

Os demais itens são de sistema e ficam:
- Dashboard, Empresas, Usuários, Assinaturas, Configurações, API & Integrações, Agente de IA, Inbox de Suporte, Dashboard PM, Feed, Solicitações.

"Feed" e "Solicitações" são levemente ambíguos (corporativos), mas fazem sentido pro Super Admin acompanhar comunicação global — deixo como estão, salvo se você quiser removê-los também.

## Mudanças
1. **Remover item "Relatórios" da sidebar do Super Admin** (`src/components/super-admin/SuperAdminSidebar.tsx` ou equivalente).
2. **Remover a rota** `/super-admin/reports` do router (`src/App.tsx`).
3. **Deletar** `src/pages/super-admin/Reports.tsx` e o hook `src/hooks/useSuperAdminReports.ts` (não é usado em outro lugar — confirmarei no build antes de deletar).
4. Redirecionar `/super-admin/reports` para `/super-admin/dashboard` caso algum bookmark antigo chegue lá.

## Fora do escopo
- Não mexo em `/admin/reports`, `/manager/reports`, `/hr/reports`, `/quality/reports`, `/finance/reports` — esses são operacionais e continuam nos papéis certos.
- Não mexo em permissões RLS de `task_reports`.

## Confirmação
Quer que eu **remova só "Relatórios"**, ou também tire **"Feed"** e **"Solicitações"** do menu do Super Admin? Por padrão sigo só com "Relatórios".
