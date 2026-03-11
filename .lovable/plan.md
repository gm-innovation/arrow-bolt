

## Problema Raiz

Os logs do backend confirmam que o campo real no array `ServicosPrestados` do Omie é **`cDescServ`**, mas o código na linha 334 tenta `cDescricao`, `cDescrServico`, `descricao`, `cDescricaoServico` — nenhum deles existe. Por isso `serviceDescription` fica vazio, a IA nunca é chamada, e nenhum dado extra chega ao frontend.

## Correção

**Arquivo: `supabase/functions/omie-proxy/index.ts`** (linha 334)

Adicionar `s.cDescServ` como primeira opção na extração:

```typescript
serviceDescription = servicosPrestados
  .map((s: any) => s.cDescServ || s.cDescricao || s.cDescrServico || s.descricao || s.cDescricaoServico || "")
  .filter(Boolean)
  .join("\n");
```

Essa única alteração desbloqueia todo o fluxo: descrição extraída → IA chamada → campos parseados → formulário preenchido.

