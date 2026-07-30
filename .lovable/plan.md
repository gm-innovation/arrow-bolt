# Por que as alterações de hoje não aparecem no histórico

## O que a verificação mostrou

Consultei o log de atividades do PM Dashboard (`pm_activity_log`) e o registro de migrações do banco:

- Hoje (30/07/2026) só existem 7 eventos, todos da categoria `metric` — as atualizações automáticas de métricas (WAU, MAU, Stickiness, tickets de bug).
- A última migração de banco registrada é de 29/07/2026 18:41. Hoje nenhuma migração rodou.
- Os eventos de ticket mais recentes são de 29/07.

A causa é simples: o histórico só é alimentado por cinco origens — migrações de banco (trigger), tickets, ações da Marina, changelog e registros manuais. **Alterações apenas de código não têm origem nenhuma.** O trabalho de hoje (ajuste de rota do papel Marketing, troca do App ID para `br.com.lecsor.arrow`, workflows do GitHub Actions com Bun, documento de política de segredos) não tocou o banco, então nada foi registrado.

## O que fazer

### 1. Registro retroativo do dia
Inserir no histórico as entradas correspondentes ao trabalho de hoje, agrupadas por tema (Mobile/OTA, Segurança, Corporativo), com origem `manual` e categoria `code_change`.

### 2. Registro manual assistido no Dashboard
O hook de registro de mudança de código já existe (`useRegisterCodeChange`), mas não há uma entrada visível para usar. Adicionar na aba Histórico um botão "Registrar alteração" com um formulário curto: título, descrição, módulo e categoria (correção / melhoria / infra). Isso permite lançar qualquer mudança feita fora do banco.

### 3. Marina registra automaticamente
Estender a Marina (copiloto de PM) com a ferramenta de registrar alteração de código, para que ao conversar sobre uma correção implementada ela grave o item no histórico sem passo manual.

### 4. Aviso de lacuna
Na aba Histórico, quando o dia atual tiver apenas eventos de métrica, mostrar uma nota discreta: "Nenhuma alteração de código registrada hoje" com atalho para o registro manual — deixando claro que é ausência de registro, não ausência de trabalho.

## Detalhes técnicos

- Fonte de dados: `pm_activity_log` (source: `manual`, category: `code_change`), consumida por `usePMActivityLog`.
- Registro: `useRegisterCodeChange` em `src/hooks/usePMDashboard.ts` (hoje exportado com nome pouco descritivo — renomear).
- UI: `PMHistoryTab` dentro de `src/pages/super-admin/PMDashboard.tsx`.
- Marina: nova tool na Edge Function `ai-assistant`, restrita a `super_admin`, análoga às tools de roadmap.

## Fora de escopo

Sincronizar automaticamente commits do GitHub com o histórico exigiria webhook do repositório; pode ser uma etapa seguinte se você quiser rastreio 100% automático.
