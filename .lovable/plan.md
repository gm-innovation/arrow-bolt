## Objetivo

Transformar a página de Admissão (`/hr/onboarding`) em uma aba dentro de Recrutamento (`/hr/recruitment`) e remover o item "Admissão" da sidebar do RH. "Configurações de Admissão" continua como está, dentro do RH.

## Mudanças

**1. `src/pages/hr/Recruitment.tsx`**
- Adicionar uma nova aba **"Admissões"** na `Tabs` existente, ao lado de Candidatos / Vagas / Link público.
- O conteúdo da aba renderiza o componente atual da página `Onboarding` (`src/pages/hr/Onboarding.tsx`) — importação direta, sem duplicar lógica.
- Ordem sugerida das abas: Candidatos · Vagas · Admissões · Link público.

**2. `src/components/DashboardLayout.tsx`**
- Remover o item de menu "Admissão" (rota `/hr/onboarding`) da sidebar do RH.
- Manter "Recrutamento" e "Configurações de Admissão" como estão.

**3. `src/App.tsx`**
- Manter a rota `/hr/onboarding` registrada (compatibilidade com links e o fluxo "Converter em Admissão" do candidato), mas ela deixa de aparecer na navegação.

## Fora de escopo

- Sem mudanças em `Onboarding.tsx`, `OnboardingSettings.tsx`, banco de dados, RLS ou edge functions.
- Configurações de Admissão permanecem em `/hr/onboarding/settings` acessadas pela sidebar do RH.
