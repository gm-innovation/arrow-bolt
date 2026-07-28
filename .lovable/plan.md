## Objetivo

Transformar cada card do Roadmap (Agora/Próximo/Depois/Gelo) num item de **acordeon** que expande mostrando a descrição completa e a defesa (rationale) da iniciativa.

## Mudanças

**Arquivo:** `src/pages/super-admin/PMDashboard.tsx` (componente `RoadmapTab` / bloco do card "Roadmap — Now / Next / Later", linhas 564–596).

- Substituir a `<div>` de cada item por um `<Accordion type="multiple">` do shadcn (já usado no projeto).
- Trigger do acordeon: `#ticket_number`, título (sem truncar), RICE score se houver.
- Conteúdo expandido:
  - `description` completa
  - `rice_rationale` quando existir (rotulado como "Defesa")
  - `impacted_module` como badge
  - Botão "Abrir detalhes" reaproveitando o Drawer existente (`TicketDrawer`) — atalho para editar horizonte/RICE.
- Manter contador por coluna e a paleta atual das colunas.
- Ajustar `max-h-72 overflow-y-auto` para acomodar acordeões expandidos (subir para `max-h-[32rem]`).

## Fora do escopo

- Editar em linha o texto da defesa (continua pelo Drawer).
- Reordenar por drag-and-drop.

Se aprovar, aplico direto no `PMDashboard.tsx`.