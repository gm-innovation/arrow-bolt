## Problema

No componente `ScopeEditor` (`src/components/super-admin/ai/TrainingTab.tsx`), o modo do radio ("Global / Por papel / Por módulo / Papel + Módulo") é **derivado** do valor via `useMemo`:

```
const mode = useMemo(() => {
  const r = value.roles.length > 0;
  const m = value.modules.length > 0;
  if (r && m) return "both";
  if (r) return "roles";
  if (m) return "modules";
  return "global";
}, [value]);
```

Quando o usuário clica em "Por papel" com o valor ainda vazio, o `onValueChange` envia `{ roles: [], modules: [] }` — o `useMemo` recalcula e devolve `"global"`. Resultado: o radio fica preso em Global, os painéis de seleção de papel/módulo nunca aparecem, e o usuário não consegue marcar nada.

## Correção

Manter `mode` como estado local do `ScopeEditor`, independente do `value`:

1. Substituir o `useMemo` por `useState<ScopeMode>` inicializado a partir do valor recebido.
2. No `onValueChange` do RadioGroup, atualizar o estado local **e** ajustar o `value` (limpando roles/modules quando o modo não os utiliza).
3. Quando o modo é "roles", "modules" ou "both", renderizar a lista de badges correspondente mesmo se ainda estiver vazia — assim o usuário pode marcar as opções.
4. Manter compatibilidade: se um `value` já vier preenchido (edição inline via popover), inicializar o modo corretamente pelo conteúdo.

Nenhuma outra mudança é necessária — a persistência (`scope` + `tags`) e a lista/filtro continuam funcionando.

## Arquivos afetados

- `src/components/super-admin/ai/TrainingTab.tsx` — apenas o componente `ScopeEditor`.