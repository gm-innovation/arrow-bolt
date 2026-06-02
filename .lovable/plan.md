Plano para corrigir de forma definitiva a perda de dados ao sair/voltar de páginas:

1. Tornar o rascunho realmente à prova de navegação
- Corrigir `usePersistentDraft` para gravar o rascunho imediatamente em `localStorage` quando o usuário altera campos, não só depois de debounce.
- Adicionar flush no `beforeunload`, `pagehide`, `visibilitychange` e no cleanup do componente, para não perder conteúdo se o usuário colar texto e sair da página logo em seguida.
- Evitar que refetch/remount sobrescreva um rascunho local existente com valores vazios vindos do banco.

2. Corrigir especificamente o editor da Página de Carreiras
- Fazer o `CareersPageEditor` criar a chave do rascunho assim que existir `companyId`, sem depender da query `company` terminar.
- Separar claramente três estados: dados publicados no banco, rascunho local e salvamento em andamento.
- Só limpar o rascunho local depois de confirmação real do banco.
- Se houver rascunho local após voltar para a página, restaurar automaticamente os campos e mostrar aviso visível de “Rascunho local restaurado”.

3. Impedir navegação acidental com alterações não salvas
- Adicionar guarda global para páginas com rascunho sujo: ao clicar em outro item do menu, trocar aba, voltar no navegador ou fechar/recarregar a página, avisar que há alterações não salvas.
- No caso da Página de Carreiras, bloquear a perda silenciosa e permitir: continuar editando, descartar ou sair mantendo rascunho salvo localmente.

4. Reduzir remount visual do shell do sistema
- Manter `AuthProvider`, `SidebarProvider` e o layout autenticado mais estáveis na árvore de rotas.
- Evitar que navegações internas do sistema recriem o menu lateral inteiro quando só o conteúdo muda.
- Para links públicos como `/carreiras/:slug`, garantir que a abertura a partir do painel aconteça em nova aba ou preview separado, para não desmontar o editor em andamento.

5. Validar o salvamento publicado
- Confirmar que a chamada `update_company_careers_page` realmente acontece ao clicar em Salvar.
- Após salvar, buscar novamente a página pública (`public-careers-info`) e confirmar que `about_title`, `about_text`, `mission` e `values` voltam preenchidos.
- Se o backend negar ou retornar vazio, manter o rascunho local e mostrar erro explícito em vez de parecer que salvou.

Arquivos principais envolvidos:
- `src/hooks/usePersistentDraft.ts`
- `src/components/hr/CareersPageEditor.tsx`
- `src/pages/hr/Recruitment.tsx`
- `src/App.tsx`
- `src/components/DashboardLayout.tsx`
- possivelmente um hook novo para guarda de alterações não salvas