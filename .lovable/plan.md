

## Aumentar logo na página pública de onboarding

A logo está com `h-16` (64px). Vou aumentar para `h-28` (112px) com `max-w-xs` para não estourar em telas pequenas.

### Alteração

**`src/pages/onboarding/PublicOnboarding.tsx`** (linha 116):
- Trocar `className="h-16 object-contain mb-6"` por `className="h-28 max-w-xs object-contain mb-8"`

