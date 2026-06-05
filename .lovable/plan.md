## Mover "Minha Assinatura" para uma aba dentro de "Minha Conta"

`/quality/signature` é dado pessoal do usuário (assinatura eletrônica reutilizável em todo o SGQ), não parâmetro do módulo. Faz mais sentido em **Minha Conta**.

### Mudanças

**`src/pages/account/AccountSettings.tsx`**
- Adicionar nova aba **"Assinatura"** (ícone `PenLine`) entre "Segurança" e "Aparência".
- Conteúdo: renderizar o componente atual de `MySignature` (extrair o corpo de `src/pages/quality/MySignature.tsx` para um componente reutilizável `SignatureSection`, ou importar `MySignature` diretamente — vou extrair para um componente puro sem o cabeçalho duplicado da página).

**Novo — `src/components/account/SignatureSection.tsx`**
- Conteúdo de `MySignature` sem o `<h2>`/subtítulo de página (apenas o(s) Card(s) de gestão da assinatura). Reutiliza o mesmo `useQualitySignature`.

**`src/pages/quality/MySignature.tsx`**
- Vira um wrapper fino que renderiza o título da página + `<SignatureSection />`, para preservar a rota `/quality/signature` (links antigos continuam funcionando).

**`src/components/DashboardLayout.tsx`**
- Remover o item `Minha Assinatura` de `qualidadeMenuItems`.

**`src/App.tsx`**
- Manter `/quality/signature` apontando para `MySignature` (sem mudanças de rota). Apenas o item da sidebar é removido.

### Não muda
- Hook `useQualitySignature`, storage, RLS.
- Rota `/quality/signature` (deprecada na navegação mas ainda navegável por links existentes).
- Funcionalidade da assinatura nos documentos do SGQ.