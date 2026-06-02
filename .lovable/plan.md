Do I know what the issue is? Sim.

O problema não é “cache” do navegador. A tela de erro na rota `/hr/recruitment` está vindo do `ErrorBoundary`, e a perda de dados/remontagem vem de uma combinação de arquitetura de rotas + abas que desmontam conteúdo + salvamento que ainda depende de estados locais frágeis.

## Plano de correção

1. **Parar o remount destrutivo na aba Página de carreiras**
   - Ajustar a página `Recrutamento` para controlar a aba ativa explicitamente.
   - Manter a aba `Página de carreiras` montada com `forceMount`, escondendo visualmente quando inativa, em vez de destruir o editor ao trocar de aba.
   - Isso impede que `CareersPageEditor` seja recriado e perca estado local ao sair/voltar da aba.

2. **Tornar o draft imune a dados antigos/incompletos**
   - Fortalecer `usePersistentDraft` para mesclar drafts antigos com o `initialValue`, evitando erro quando existe JSON antigo no `localStorage` sem todos os campos esperados.
   - Garantir arrays como `values` sempre existam antes de renderizar.
   - Isso evita que um draft antigo quebre a página inteira e caia no “Algo deu errado”.

3. **Corrigir o salvamento real da página de carreiras**
   - Manter o RPC `update_company_careers_page`, mas ajustar o fluxo para não limpar o rascunho antes de confirmar a resposta gravada.
   - Após salvar, atualizar o estado local com os valores confirmados pelo banco e só então remover o draft.
   - Revalidar a query da página pública para o hard refresh mostrar o conteúdo publicado.

4. **Corrigir erros na tela de recrutamento que podem derrubar a rota inteira**
   - Corrigir `useRecruitment.ts`: no update de vagas, usar o `payload` correto em vez do objeto parcial cru.
   - Revisar os pontos que fazem update direto em `companies` dentro de `Recruitment.tsx` para checar falha real/zero update, mostrando erro em vez de falso sucesso.

5. **Reduzir remount global do menu/layout**
   - Refatorar rotas `/corp/*` para usarem layout route com `<Outlet />`, em vez de criar uma nova instância de `DashboardLayout` para cada rota.
   - Ajustar `ProtectedRoute` para não trocar o layout por spinner quando já existe usuário autenticado carregado.
   - Isso ataca a causa do sidebar/conteúdo remontando ao navegar.

6. **Melhorar o diagnóstico do erro branco**
   - Ajustar o `ErrorBoundary` para resetar ao mudar de rota e registrar mensagem/stack de forma visível no console.
   - Assim uma falha em uma página não deixa o app preso eternamente no fallback sem pista.

## Validação

- Abrir `/hr/recruitment`, trocar entre abas e voltar para `Página de carreiras` sem perder texto digitado.
- Fazer hard refresh na página de gestão e confirmar que o draft reaparece.
- Salvar, abrir `/carreiras/lecsor` em nova aba/hard refresh e confirmar que os dados publicados aparecem.
- Navegar entre páginas HR/Corp e confirmar que o menu não reinicia desnecessariamente.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>