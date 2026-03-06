

## Gamificação do Sistema de Conquistas

O sistema atual é básico demais -- apenas badges manuais sem progressão. Vamos criar um sistema de gamificação com **níveis por tier** (pedras preciosas), **conquistas automáticas** baseadas em comportamento, e **conquistas manuais** melhoradas.

### Modelo de Dados

Nova tabela `corp_achievement_levels` para definir os tiers de gamificação por colaborador:

```text
Tier         | XP necessário | Ícone
─────────────┼───────────────┼──────
Bronze       | 0             | 🥉
Prata        | 100           | 🥈
Ouro         | 300           | 🥇
Diamante     | 600           | 💎
Rubi         | 1000          | ❤️‍🔥
```

Alterações na tabela `corp_badges`:
- Adicionar coluna `xp_value` (integer, default 10) — pontos que cada conquista vale
- Adicionar coluna `category` (text) — para agrupar: `manual`, `tenure`, `attendance`, `engagement`

### Conquistas Automáticas (por categoria)

Definir um conjunto fixo no código (sem tabela extra):

**Tempo de Empresa** (tenure): 1 ano 🎖️, 3 anos 🏅, 5 anos 🥇, 10 anos 💎, 15 anos 👑, 20 anos ❤️‍🔥
**Engajamento no Feed** (engagement): 10 posts ✍️, 50 posts 📝, 100 curtidas recebidas ❤️, 10 discussões 💬
**Presença** (attendance): Mês sem faltas ✅, 3 meses consecutivos 🔥, 6 meses consecutivos 💪

Estas não serão concedidas automaticamente por trigger — serão **exibidas como progresso** no perfil (barra de progresso) e concedidas manualmente pelo sistema quando o RH/Admin acessar o dialog.

### Mudanças nos Componentes

**1. `AwardBadgeDialog.tsx` — Reestruturar categorias**
- Substituir `BADGE_TYPES` por categorias com sub-opções:
  - **Reconhecimento** (manual): Meta Alcançada 🎯, Projeto Finalizado 🚀, Curso Concluído 📚, Personalizada ⭐
  - **Engajamento**: Comunicador Ativo ✍️, Influenciador ❤️, Debatedor 💬
  - **Presença**: Assiduidade Mensal ✅, Sequência de Presença 🔥
- Cada opção define XP (5, 10, 15, 25 conforme importância)
- Manter seletor de ícone para tipo Personalizada
- Adicionar Select de XP com valores pré-definidos (5, 10, 15, 25, 50)

**2. Novo componente `FeedUserLevel.tsx` — Exibir tier do colaborador**
- Recebe `userId` e `companyId`
- Query: contar total de badges do usuário e somar `xp_value`
- Calcular tier atual e progresso para o próximo
- Renderizar: ícone do tier + nome + barra de progresso (Progress component)
- Usado no `FeedProfileSidebar` abaixo do nome

**3. `FeedProfileSidebar.tsx` — Integrar nível**
- Adicionar `FeedUserLevel` abaixo do badge de role
- Mostrar contagem de conquistas do usuário

**4. `FeedBadgesCard.tsx` — Melhorar visual**
- Adicionar badge de XP ao lado de cada conquista (ex: "+10 XP")
- Agrupar visualmente por categoria com ícone

### Migration SQL

```sql
ALTER TABLE corp_badges ADD COLUMN IF NOT EXISTS xp_value integer DEFAULT 10;
ALTER TABLE corp_badges ADD COLUMN IF NOT EXISTS category text DEFAULT 'manual';
```

### Resumo
- Adicionar colunas `xp_value` e `category` à tabela `corp_badges`
- Reestruturar `AwardBadgeDialog` com categorias ricas e seletor de XP
- Criar `FeedUserLevel` para exibir tier (Bronze→Rubi) com barra de progresso
- Integrar nível no `FeedProfileSidebar`
- Melhorar `FeedBadgesCard` com indicador de XP

