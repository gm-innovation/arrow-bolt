

## Plano: Corrigir dropdown de menções cortado pelo overflow

### Problema
A coluna central tem `overflow-y-auto` (linha 49 do Feed.tsx), o que corta o dropdown de menções que abre para cima (`bottom-full`). O dropdown é renderizado dentro dessa coluna e fica invisível por estar fora dos limites do container com overflow.

### Solução

**Arquivo: `src/components/corp/FeedMentionInput.tsx`**
- Mudar o dropdown de `bottom-full mb-2` para `top-full mt-1` — abrir para **baixo** em vez de para cima. Isso garante que o dropdown fique dentro da área visível do container com overflow.

Essa é a correção mais simples e confiável. Abrir para baixo mantém o dropdown dentro do fluxo natural do scroll.

