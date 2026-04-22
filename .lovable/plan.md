

## Corrigir bug de login que mostra "sucesso" mas não redireciona

### Diagnóstico

O toast "Login realizado com sucesso" aparece porque a chamada `supabase.auth.signInWithPassword` retornou sem erro, mas o `AuthContext` falha em propagar o novo estado de autenticação por **3 causas combinadas**:

1. **`INITIAL_SESSION` ignorado** — o listener `onAuthStateChange` filtra eventos aceitando apenas `SIGNED_IN`/`SIGNED_OUT`/`TOKEN_REFRESHED`. Quando há uma sessão pré-existente no `localStorage` (login anterior expirado/válido), o Supabase pode emitir `INITIAL_SESSION` no novo login — e ele é descartado.

2. **Eventos descartados antes da inicialização** — o guard `if (!initializedRef.current) return` (linha 79) descarta o evento `SIGNED_IN` se ele chegar antes de `getSession()` resolver. Isso é uma race condition real do Supabase JS.

3. **`fetchUserRole` com guard agressivo** — o `fetchingRoleRef.current` impede chamadas concorrentes mas não reagenda nem libera `loading`, deixando o `userRole` desatualizado após o login.

4. **Sem fallback no Login.tsx** — após `signIn` retornar OK, o `Login.tsx` apenas espera o efeito reagir. Não há fallback se o contexto demorar/falhar.

### Correções

**1. `src/contexts/AuthContext.tsx`** — listener mais robusto:
- Aceitar também `INITIAL_SESSION` e `USER_UPDATED` no filtro de eventos.
- Remover o guard `!initializedRef.current` do listener — em vez disso, deixar o listener processar tudo e usar comparação de `access_token` para evitar duplicação real.
- No `fetchUserRole`, remover o early-return quando há fetch concorrente para o **mesmo userId**: se for outro userId (login diferente), permitir; se for o mesmo, ainda assim aguardar o fetch atual em vez de descartar.
- Garantir que `setLoading(true)` é chamado quando um novo `SIGNED_IN` chega para um userId diferente do atual.

**2. `src/pages/Login.tsx`** — fallback de redirecionamento após `signIn`:
- Após `signIn` bem-sucedido, fazer um `getSession()` direto e buscar role/profile manualmente como fallback se o contexto não atualizar em até ~1.5s. Usar isso para chamar `navigate()` direto.
- Manter o `useEffect` atual como caminho primário (quando o contexto atualiza normalmente).
- Mostrar erro claro ("Não foi possível carregar suas permissões. Recarregue a página.") se o fallback também falhar.

**3. Melhoria adicional em `signIn` (AuthContext)**:
- Após sucesso de `signInWithPassword`, chamar `fetchUserRole(data.user.id)` diretamente dentro de `signIn`, garantindo que o estado é atualizado mesmo se o listener falhar/atrasar. Setar `user`/`session` também diretamente.

### Arquivos editados

1. `src/contexts/AuthContext.tsx` — listener aceita `INITIAL_SESSION`, remove guard de inicialização, `signIn` atualiza estado diretamente após sucesso.
2. `src/pages/Login.tsx` — fallback de navegação após signIn caso o contexto não reaja em 1.5s.

### Validação

Após a correção, testar:
- Login com sessão limpa (1ª vez no navegador) → redireciona OK
- Login com sessão expirada no localStorage → redireciona OK
- Login com sessão válida pré-existente (re-login) → redireciona OK
- Login com credenciais erradas → mostra erro
- Login com usuário sem role → mostra "Usuário sem permissões"

