

## Corrigir tela em branco — erro de build do Dexie

A tela em branco é causada por um erro de compilação TypeScript no pacote `dexie`:

```
node_modules/dexie/dist/dexie.d.ts(1202,23): error TS1540: A 'namespace' declaration should not be declared using the 'module' keyword.
```

Este erro impede que a aplicação compile, resultando na tela em branco.

### Solução

**`tsconfig.app.json`** — Adicionar `skipLibCheck: true` nas `compilerOptions` para ignorar erros de tipagem em pacotes de terceiros (como `dexie`). Isso é uma prática comum e segura, pois não afeta a verificação de tipos do código do projeto.

Alteração de 1 linha em 1 arquivo.

