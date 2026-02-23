

## Correções e Melhorias nas Páginas Administrativas do Módulo Comercial

Existem 5 problemas a resolver:

---

### 1. Build Error: Export duplicado em Buyers.tsx

**Problema:** Linha 221 e 223 ambas exportam `default`, causando falha no build.
**Solução:** Remover a linha 223 (export duplicado).

---

### 2. Página de Usuários - Adicionar criação e edição

**Problema:** A página `commercial/admin/Users.tsx` é apenas leitura (tabela simples sem ações).
**Solução:** Adicionar funcionalidades completas:
- Botão "+ Novo Usuário" no header (abre Dialog de criação com campos: Nome, Email, Senha, Telefone, Papel)
- Coluna "Ações" na tabela com dropdown (Editar, Ativar/Desativar)
- Dialog de edição para atualizar dados do usuário
- Reutilizar o `create-user` e `update-user` edge functions existentes, porém fixando `company_id` ao da empresa do admin logado (sem seletor de empresa)
- Papéis disponíveis limitados ao contexto comercial: admin, commercial, manager

---

### 3. Botão "Novo Serviço" na página Services - Redireciona em vez de abrir dialog

**Problema:** O botão faz `navigate("/commercial/products")` em vez de abrir um dialog/modal de criação inline.
**Solução:** Substituir a navegação por um Dialog de criação embutido na própria página, similar ao da página Products mas adaptado ao contexto de serviços. Incluir campos: Nome, Tipo (serviço/produto), Categoria (dropdown), Lead Time (dias), Status (ativo/inativo). Usar `useProducts().createProduct` para salvar.

---

### 4. Botão "Nova Entrada" na página Knowledge não funciona

**Problema:** Os 3 botões (Adicionar Website, Upload Documento, Nova Entrada) são apenas visuais sem `onClick`.
**Solução:** 
- **Nova Entrada:** Abrir Dialog com formulário (Título, Conteúdo, Categoria, Tags, Publicado). Usar `useKnowledgeBase().createArticle`.
- **Upload Documento:** Abrir Dialog com input de arquivo + categoria. Usar `useKnowledgeBase().uploadDocument`.
- **Adicionar Website:** Abrir Dialog com input de URL + categoria (placeholder para processamento futuro).

---

### 5. Página Agendamentos sem componente de edição

**Problema:** A lista de agendamentos é apenas leitura, sem ações de edição.
**Solução:** Adicionar:
- Botão "Ver" em cada item da lista que abre um Sheet lateral com detalhes da recorrência (cliente, produto, datas, status, valor, observações)
- Botão "Editar" no Sheet que permite alterar: próxima data, status, observações
- Usar `useRecurrences().updateRecurrence` para salvar alterações

---

### Resumo de Alterações

| Tipo | Arquivo |
|------|---------|
| Corrigir | `src/pages/commercial/Buyers.tsx` (remover export duplicado) |
| Reescrever | `src/pages/commercial/admin/Users.tsx` (adicionar CRUD completo) |
| Reescrever | `src/pages/commercial/admin/Services.tsx` (dialog inline em vez de navigate) |
| Reescrever | `src/pages/commercial/admin/Knowledge.tsx` (conectar botões a dialogs funcionais) |
| Modificar | `src/pages/commercial/admin/Schedules.tsx` (adicionar sheet de detalhes/edição) |

### Detalhes Técnicos

**Users.tsx:** Usará `supabase.functions.invoke('create-user')` e `supabase.functions.invoke('update-user')` para criar/editar. O `company_id` será fixado automaticamente ao `profile.company_id` do admin logado. A tabela incluirá colunas: Nome, Email, Telefone, Papel, Desde, e uma coluna Ações com DropdownMenu (Editar / Ativar-Desativar).

**Services.tsx:** O Dialog de criação incluirá os campos: Nome (obrigatório), Tipo (Select: serviço/produto), Categoria (Select: manutenção, inspeção, etc.), Lead Time em dias (Input number, default 30), Ativo (Switch). Ao salvar, chama `createProduct.mutate()`. Também será adicionada coluna Ações na tabela com botão de editar (abre Dialog de edição) e toggle de status.

**Knowledge.tsx:** Três Dialogs separados:
1. Nova Entrada: título, conteúdo (textarea), categoria (select), tags (input), toggle publicado
2. Upload Documento: input file (accept pdf/doc/docx/txt), categoria
3. Adicionar Website: URL, título, categoria

**Schedules.tsx:** Sheet lateral com dados readonly + botão editar inline. Campos editáveis: próxima data (date picker), status (select: active/paused/cancelled), observações (textarea). Footer com Cancelar/Salvar.

