

## Problema

A página pública `/onboarding/:token` está dentro do `SidebarProvider` no `App.tsx`, que aplica estilos de layout com sidebar. Isso empurra o conteúdo para a esquerda em vez de centralizá-lo na tela.

## Correção

Mover a rota `/onboarding/:token` para **fora** do `SidebarProvider` (e do `AuthProvider` também, já que o candidato não precisa de autenticação), junto com as outras rotas públicas como `/login` e `/signup`.

### Arquivo: `src/App.tsx`
- Remover a linha 191 (rota dentro do SidebarProvider)
- Adicionar a rota antes do `AuthProvider`/`SidebarProvider`, no mesmo nível das rotas de auth (login, signup, etc.) ou logo após o `BrowserRouter` e antes do bloco autenticado

```text
BrowserRouter
  ├─ /onboarding/:token  ← mover para cá (fora de AuthProvider/SidebarProvider)
  ├─ AuthProvider
  │   ├─ SidebarProvider
  │   │   ├─ /login, /signup, etc.
  │   │   ├─ rotas protegidas...
```

Isso garante que a página do candidato renderize sem sidebar e centralizada como esperado.

