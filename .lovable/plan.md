

## Aumentar logo 4x na página pública de onboarding

Atualmente `h-28` (112px). Vou trocar para `h-64` (256px) e aumentar `max-w` para `max-w-lg` para não cortar em telas maiores.

### Alteração

**`src/pages/onboarding/PublicOnboarding.tsx`** (linha 116):
- De: `className="h-28 max-w-xs object-contain mb-8"`
- Para: `className="h-64 max-w-lg object-contain mb-8"`

