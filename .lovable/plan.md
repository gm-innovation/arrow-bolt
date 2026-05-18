## Problema
Na tela **RH → Recrutamento → Link público**, mostramos a URL `…/carreiras/SLUG` e pedimos para o usuário substituir manualmente o "SLUG". O slug já existe em `companies.public_site_slug` — não há motivo para exigir edição manual.

## Plano (somente UI, em `src/pages/hr/Recruitment.tsx`)

1. **Buscar o slug da empresa do usuário logado** via um pequeno `useQuery` que lê `companies.public_site_slug` e `public_intake_enabled` usando `profile.company_id` do `AuthContext`.

2. **Renderizar a URL já pronta** quando houver slug:
   - Input `readOnly` com `https://<host>/carreiras/<slug>` (sem placeholder).
   - Botão "Copiar" copia a URL real.
   - Botão "Abrir" (novo) abre a página pública em outra aba.
   - Texto explicativo passa a ser: *"Aponte o CTA 'Saiba mais' do site para a URL abaixo:"* (some a parte do "substitua SLUG").

3. **Estados auxiliares**:
   - Se `public_intake_enabled = false`: mostrar aviso curto ("Recebimento público desativado — fale com o Super Admin") e desabilitar os botões.
   - Se `public_site_slug` estiver vazio: mostrar aviso ("Empresa ainda sem slug público configurado") e desabilitar os botões. Sem campo de edição aqui — slug continua sendo configurado pelo Super Admin (já é assim hoje).

4. **Sem alterações** em schema, RLS, edge functions ou na tela de Super Admin.

## Resultado
RH abre a aba "Link público" e já vê a URL final pronta para copiar/abrir, sem precisar saber o que é "slug".