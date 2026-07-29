# Calibração — erro de "duplicate key" ao criar instrumento

## Diagnóstico (confirmado por consulta ao banco)

No módulo de Qualidade → Calibração, o botão "Novo" abre `DeviceFormDialog.tsx`, que grava em `public.quality_measuring_devices` via o mutation `upsert` de `useQualityDevices.ts`. Essa tabela tem UMA única restrição de unicidade:

```
quality_measuring_devices_company_id_code_key  UNIQUE (company_id, code)
```

A tabela `quality_calibrations` (registro de calibração propriamente dito) **não tem nenhuma unique constraint** além da PK — logo o erro só pode vir do cadastro de instrumento, quando a Rayane digita um Código/TAG que já existe para outro instrumento da mesma empresa (ativo ou já cadastrado antes). O `onError` do mutation hoje só faz `toast({ description: e.message })`, então o Postgres devolve literalmente "duplicate key value violates unique constraint …" em inglês — daí a mensagem que ela viu.

Não há duplicidade em `quality_calibrations`, nem gatilhos secundários que insiram em tabelas com unique — os dois triggers verificados (`quality_calibration_after_change_trigger` e `quality_improvement_from_calibration`) só fazem UPDATE em devices e INSERT em `quality_improvements_manual` (sem unique).

## O que corrigir

Não mexer no schema — a restrição `(company_id, code)` é legítima. Ajustar o front para dar feedback claro e evitar o submit quando dá para prever a colisão.

1. **Mensagem amigável em pt-BR** no `onError` do `upsert` (`src/hooks/useQualityDevices.ts`):
   - Detectar `error.code === "23505"` ou `message` contendo `quality_measuring_devices_company_id_code_key`.
   - Toast: título "Código já cadastrado", descrição "Já existe um instrumento com esse Código/TAG na sua empresa. Escolha outro código." em vez do texto cru do Postgres.
   - Manter o toast genérico para outros erros.

2. **Validação preventiva** em `DeviceFormDialog.tsx`:
   - Ao sair do campo `Código / TAG` (onBlur), consultar `quality_measuring_devices` por `company_id` + `code` (ignorando o próprio `device.id` no modo edição) e, se existir, marcar o campo em vermelho com a mensagem inline "Código já em uso".
   - Desabilitar o botão Salvar enquanto houver duplicidade detectada.

3. **Trim/normalização**:
   - Aplicar `.trim()` no `code` antes de salvar para evitar duplicidade "invisível" causada por espaço no final.

## Fora de escopo

- Não alterar RLS, migrações, tabelas de calibração ou triggers.
- Não mexer no drawer de registro de calibração (`CalibrationDrawer.tsx`) — o erro não vem de lá.
- Sem mudanças em outros módulos.

## Arquivos que serão tocados

- `src/hooks/useQualityDevices.ts` — tratar erro 23505 no `upsert.onError`.
- `src/components/quality/DeviceFormDialog.tsx` — checagem de duplicidade em tempo real, feedback inline, trim.

## Validação

- Cadastrar instrumento com código inédito → sucesso.
- Cadastrar instrumento repetindo um código existente → mensagem inline "Código já em uso" e botão Salvar desabilitado; caso escape a checagem e chegue no banco, toast em pt-BR explicando o campo culpado, sem texto técnico.
- Editar um instrumento existente mantendo seu próprio código → sem falso positivo.
