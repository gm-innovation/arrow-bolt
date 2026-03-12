

## A logo sumiu porque o código de renderização não existe

O hook `usePublicOnboarding` retorna `companyLogoUrl` corretamente, mas o componente `PublicOnboarding.tsx` nunca renderiza a imagem. O código que deveria exibir a logo acima do card simplesmente não está presente.

### Alteração

**`src/pages/onboarding/PublicOnboarding.tsx`** — Adicionar a logo entre o `div` container e o `Card`:

1. Extrair `companyLogoUrl` do hook (linha ~37, já retornado pelo hook mas não desestruturado).
2. Antes do `<Card>`, renderizar:
```tsx
{companyLogoUrl && (
  <img
    src={companyLogoUrl}
    alt="Logo da empresa"
    className="h-64 max-w-lg object-contain mb-8"
  />
)}
```
3. Envolver logo + card em um `div` com `flex flex-col items-center` para centralizar.

Estrutura final:
```tsx
<div className="min-h-screen bg-background flex items-center justify-center p-4">
  <div className="flex flex-col items-center w-full max-w-2xl">
    {companyLogoUrl && (
      <img src={companyLogoUrl} alt="Logo da empresa" className="h-64 max-w-lg object-contain mb-8" />
    )}
    <Card className="w-full">
      ...
    </Card>
  </div>
</div>
```

