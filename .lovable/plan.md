## Problema

Os itens "Provedores Externos" e "Homologação" aparecem no menu de Suprimentos, mas apontam para `/quality/suppliers` e `/quality/homologation`. Essas rotas estão dentro do bloco `<ProtectedRoute allowedRoles={['qualidade']}>` no `App.tsx`, então usuários com role `compras` são bloqueados e redirecionados para o dashboard.

## Correção

Adicionar as rotas dentro do bloco de Suprimentos (`allowedRoles={['compras']}`) reutilizando os mesmos componentes de página, para que ambos os setores acessem sem alterar as rotas do menu.

**Arquivo:** `src/App.tsx` — no bloco de Suprimentos (linhas 416–421), acrescentar:

```tsx
<Route path="/quality/suppliers" element={<QualitySuppliers />} />
<Route path="/quality/suppliers/:id" element={<QualitySupplierDetail />} />
<Route path="/quality/homologation" element={<QualityHomologation />} />
```

Assim os mesmos paths funcionam para roles `qualidade` e `compras`, sem duplicar código de página e sem mexer no sidemenu.

## Observação sobre RLS

As tabelas de suppliers/homologation provavelmente têm policies restritas ao role `qualidade`. Se após o ajuste de rota as páginas abrirem vazias ou derem erro de permissão para o usuário de Suprimentos, faremos uma segunda rodada estendendo as policies para incluir `compras`. Isso será verificado após liberar a rota.