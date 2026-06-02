## Adicionar ícones de benefícios faltantes

Adicionar 5 novas opções ao seletor de ícones do editor de benefícios (`src/components/hr/CareersPageEditor.tsx`), usando ícones do lucide-react:

| Rótulo | Ícone lucide |
|---|---|
| Vale alimentação / refeição | `UtensilsCrossed` |
| Plano de saúde | `Stethoscope` (ou `HeartPulse`) |
| Academia | `Dumbbell` |
| Refeitório | `Utensils` |
| Vale transporte | `Bus` |

### Mudanças técnicas

- Importar `UtensilsCrossed`, `Stethoscope`, `Dumbbell`, `Utensils`, `Bus` de `lucide-react`.
- Adicionar entradas em `ICON_OPTIONS` (que alimenta tanto o `Select` do modal quanto o `ICON_MAP` usado para renderizar os cards já cadastrados).
- Reordenar para agrupar saúde/alimentação/transporte de forma coerente.
- Nenhuma mudança em banco: o campo `icon` é texto livre; o whitelist público (`BENEFIT_ICONS` em `PublicCareers.tsx`) também precisa receber os mesmos nomes para que apareçam na página pública — incluirei lá também.

### Fora de escopo
- Não altera schema, RLS, nem benefícios já cadastrados.
