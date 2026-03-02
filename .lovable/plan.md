

## Melhorias no Modal de Nova Solicitação

### Problemas identificados
1. Cards visuais pouco atrativos — trocar por uma lista/select simples e limpo
2. Falta categoria "Reembolso"
3. Documentos não incluem "Contra-cheque" nas opções
4. Usuários não aparecem no select de destinatário — o `useUsers` funciona mas o select pode ter problema de renderização ou os dados não carregam corretamente
5. Usuários devem filtrar por departamento selecionado — mas `profiles` não tem `department_id` no schema atual
6. Produtos: só permite 1 item — precisa de lista dinâmica (adicionar/remover itens)
7. Documentos: só permite 1 tipo — precisa de lista dinâmica também

### Alterações

1. **Migração SQL** — Adicionar tabela `department_members` para vincular usuários a departamentos. Adicionar categoria `reimbursement` nos tipos padrão (seed para empresas existentes + trigger atualizado).

2. **`src/components/corp/NewRequestDialog.tsx`** — Refatoração completa:
   - **Step 1**: Trocar grid de cards por um `Select` dropdown com ícone ao lado de cada opção, mais limpo e funcional
   - **Step 2 — Produtos**: Permitir lista de itens (nome, quantidade, valor unitário) com botão "Adicionar Item" e "Remover". Calcular valor total automaticamente.
   - **Step 2 — Documentos**: Permitir lista de documentos solicitados (tipo + observação) com botão "Adicionar Documento". Incluir "Contra-cheque" na lista de tipos.
   - **Step 2 — Reembolso** (nova categoria): Campos para descrição da despesa, valor, data, comprovante (campo de texto por ora).
   - **Destinatário filtrado por departamento**: Ao selecionar um departamento, buscar membros daquele departamento via `department_members` e exibir apenas eles no select de destinatário.
   - Corrigir a lógica de exibição do select de usuários para garantir que os dados apareçam.

3. **Migração SQL para seed** — Atualizar o trigger `auto_create_corp_request_types_for_company` para incluir "Reembolso" (`category: 'reimbursement'`). Inserir para empresas existentes.

4. **Constantes** — Adicionar `reimbursement` nos mapas de ícones e labels (`categoryIcons`, `categoryLabels`).

### Detalhes técnicos

Tabela `department_members`:
```text
department_members
├── id (uuid, PK)
├── department_id (FK → departments)
├── user_id (FK → profiles)
├── created_at
└── UNIQUE(department_id, user_id)
```

Lista dinâmica de itens (produtos/documentos): estado local com array de objetos, renderizado com `.map()` e botões de adicionar/remover. Os dados são salvos no `dynamic_data` como arrays JSON.

