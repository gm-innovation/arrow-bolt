

## Adicionar campo "Departamento" ao modal de Enviar Documento

### Contexto

O modal de upload de documentos atualmente nao permite selecionar um departamento de destino. Documentos como atestados medicos devem ir para o RH, comprovantes de reembolso para o financeiro, etc.

### Alteracoes

#### 1. Migracao SQL

Adicionar coluna `department_id` na tabela `corp_documents`:

```sql
ALTER TABLE corp_documents ADD COLUMN department_id uuid REFERENCES departments(id);
```

#### 2. Atualizar `DocumentUploadDialog.tsx`

- Importar `useDepartments` hook
- Adicionar state `departmentId`
- Adicionar campo Select "Departamento (opcional)" no formulario, listando os departamentos da empresa
- Incluir `department_id` no payload do `uploadDocument.mutate`
- Resetar `departmentId` no `onSuccess`

#### 3. Atualizar `useCorpDocuments.ts`

- Adicionar `department_id?: string` no tipo do `mutationFn` do `uploadDocument`
- Incluir `department:departments(id, name)` no select da query principal

#### 4. Atualizar `Documents.tsx`

- Exibir o nome do departamento na tabela (coluna "Departamento")

