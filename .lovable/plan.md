

## Remover campo "Visibilidade" do modal de Enviar Documento

### Contexto

O campo "Visibilidade" (Privado / Departamento / Global) no modal de upload de documentos nao faz sentido para o usuario. A visibilidade ja e controlada internamente pelas regras de acesso (RLS e logica do sistema).

### Alteracao

**Arquivo:** `src/components/corp/DocumentUploadDialog.tsx`

- Remover o state `visibility` e seu valor padrao `'private'`
- Remover o bloco do Select de "Visibilidade" do formulario (label + select com opcoes Privado/Departamento/Global)
- No payload do `uploadDocument.mutate`, remover `visibility_level: visibility` ou definir um valor fixo padrao (`'private'`)

