## Logos da Lecsor — uso na página pública de carreiras

Subir as duas logos como assets do projeto e usá-las automaticamente na `PublicCareers.tsx`, escolhendo a variante certa conforme o fundo. A logo da empresa salva via RH (`companies.logo_url`) continua sendo respeitada como override.

### Assets
- `src/assets/lecsor-logo-black.png.asset.json` — versão preta (fundo claro).
- `src/assets/lecsor-logo-grey.png.asset.json` — versão cinza (fundo escuro).

Upload via `lovable-assets create` a partir de `/mnt/user-uploads/`.

### Uso em `src/pages/careers/PublicCareers.tsx`
- **Nav (fundo branco)**: usar a logo preta. Se `companies.logo_url` existir e a empresa não for a Lecsor padrão, usar a do banco; caso contrário, fallback para a preta.
- **Hero (fundo navy `#0f1b3d`)**: exibir a logo cinza acima do badge "Carreiras Técnicas" (altura ~40px, opacidade 90%) para reforçar marca.
- **Footer**: pequena logo cinza (altura ~24px) ao lado do copyright.
- Remover o quadrado/inicial atual e o texto "Lecsor" duplicado onde a logo já comunica a marca.

### Fora de escopo
- Não mexer em `Recruitment.tsx` nem no fluxo de upload de logo do RH (continua funcionando como override por empresa).
- Não trocar logos em outras telas internas do app neste passo.

### Arquivos afetados
- `src/assets/lecsor-logo-black.png.asset.json` (novo)
- `src/assets/lecsor-logo-grey.png.asset.json` (novo)
- `src/pages/careers/PublicCareers.tsx`
