# Sprint 2.6 — Aprovada · Pronta para Implementar

**Backend já aplicado.** Falta o frontend.

## Arquivos a criar
- `src/hooks/useSatisfactionCampaigns.ts` (+ sub-hook `useCampaignDetail`)
- `src/hooks/useQualityComplaints.ts`
- `src/pages/quality/Satisfaction.tsx`
- `src/pages/quality/SatisfactionDetail.tsx`
- `src/pages/quality/Complaints.tsx`
- `src/pages/quality/ComplaintDetail.tsx`
- `src/pages/public/SatisfactionResponse.tsx` — **fora de `AuthProvider`**, mesmo padrão de `/onboarding/:token`

## Arquivos a editar
- `src/App.tsx` — registra 4 rotas autenticadas em `/quality/...` e a rota pública `/satisfaction/r/:token` no nível das outras rotas públicas (fora do `AuthProvider`)
- `src/components/DashboardLayout.tsx` — adiciona "Satisfação" e "Reclamações" no menu de Qualidade

## Cobertura obrigatória da página pública
Os 5 estados serão tratados com mensagens amigáveis:
1. **Carregando** — spinner discreto
2. **Token inválido** — "Link inválido ou expirado. Confira se você acessou o endereço correto."
3. **Já respondida** — "Sua resposta já foi registrada. Obrigado pelo retorno!"
4. **Campanha inativa** — "Esta pesquisa não está mais aceitando respostas."
5. **Sucesso** — "Resposta enviada! Agradecemos seu tempo."

Layout mobile-first, sem dependência de `AuthProvider`, `SidebarProvider` ou `ProtectedRoute`. Usa apenas as RPCs públicas (`quality_get_invite_public` + `quality_submit_satisfaction_response`).

Aprove para iniciar o build.
