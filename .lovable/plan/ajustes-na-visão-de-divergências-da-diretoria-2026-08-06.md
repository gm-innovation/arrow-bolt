# Ajustes na visão de divergências da Diretoria

## 1. Link da auditoria no menu da Diretoria

O menu do perfil `director` (o que aparece como "Diretoria" na barra lateral) não tem o item "Auditoria Auvo" — só os menus de coordenador e de `manager` têm. A rota `/manager/auvo-audit` existe e funciona, só falta a entrada no menu.

Ação: adicionar "Auditoria Auvo" (ícone de balança, rota `/manager/auvo-audit`) ao menu da Diretoria, logo depois de "Relatórios", igual aos outros perfis.

## 2. Agrupar a lista de divergências por OS

Hoje a aba "Divergências" do dashboard lista uma linha por material, repetindo a mesma OS várias vezes (OS 4530 aparece 4x).

Ação: reorganizar a tabela em blocos expansíveis por OS, no mesmo padrão já usado na tela de auditoria:

- Uma linha por OS com: número da OS, cliente / embarcação, técnicos, data(s), quantidade de materiais divergentes, quantos são "baixa sem relato", risco total acumulado, tempo em aberto da mais antiga e botão "Revisar".
- Ao expandir, mostra os materiais daquela OS (material, estoque, relatório, classificação, valor em risco).
- Ordenação: OSs com mais "baixa sem relato" e maior risco total primeiro.
- Atendimentos sem número de OS ficam agrupados por serviço/cliente com o rótulo "Sem OS".
- O botão "Revisar" continua levando à tela de auditoria já filtrada pela OS.

## 3. Sobre as 99 divergências

Número real, não corte de exibição. Conferido no banco: 99 divergências com revisão pendente — 70 do tipo "baixa no estoque sem relato" (R$ 141.835,22 em risco) e 29 do tipo "relato sem baixa" (sem valor atribuído). Os totais do dashboard e da tela de auditoria batem entre si. A consulta busca até 500 registros, então não há truncamento hoje; para segurança, a tabela passará a exibir os grupos com paginação/"ver mais" em vez de cortar em 25 itens como hoje.

## Notas técnicas

- `src/components/DashboardLayout.tsx` — incluir o item no `directorMenuItems`.
- `src/components/manager/dashboard/AuvoDiscrepancyTab.tsx` — agrupamento por OS com linhas expansíveis (Collapsible), agregando a partir dos itens já retornados.
- `src/hooks/useAuvoCriticalSummary.ts` — expor os agregados por OS (contagens, risco total, dias em aberto) para a tabela; sem mudança de regra de negócio nem migração de banco.
