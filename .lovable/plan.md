

## Correção: Tela em branco

### Problema
No arquivo `src/App.tsx`, linha 64, existe um import duplicado de `Chat` que causa erro de compilação e impede a aplicação de renderizar:

```
63: import Chat from "./pages/Chat";
64: import Chat from "./pages/Chat";  // <-- DUPLICADO
```

### Solução
Remover a linha 64 (import duplicado).

### Arquivo a modificar
- `src/App.tsx` -- remover linha 64

### Detalhe técnico
Uma única linha duplicada. A correção é simplesmente deletar a segunda ocorrência do `import Chat`.

