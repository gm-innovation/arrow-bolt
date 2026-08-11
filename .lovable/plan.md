# Responsável não aparece no lead (Belga Marine)

## O que foi verificado

- No banco, o lead **Belga marine** já está atribuído a **GABRIELE BRAGA DA SILVA** (atualizado em 11/08 20:53). A Marina gravou certo.
- O seletor de Responsável usa a lista de colegas de `useCompanyUsers`, que lê a tabela `profiles`.
- A política de leitura de `profiles` só permite super_admin, RH, admin, diretoria e qualidade. O perfil **comercial não pode ler `profiles`** — a lista volta vazia.
- Consequência exata do que aparece na tela: o campo do lead atribuído fica **em branco** (o nome não é encontrado na lista) e os outros ficam "Não atribuído". Nenhum nome é selecionável.
- Já existe a view segura `profiles_public` (id, full_name, avatar_url, company_id), sem PII.

## Correção

### 1. Lista de colegas por fonte segura
- `useCompanyUsers` passa a ler `profiles_public` (id, full_name) filtrando pela empresa do usuário, em vez de `profiles`. Assim comercial, coordenação e demais perfis enxergam os colegas sem expor e-mail/telefone/PII.
- Quando o filtro por papel é usado, cruzar com `user_roles` como já é feito hoje.
- Manter o e-mail apenas onde o perfil tem permissão (nenhuma tela do CRM depende dele para exibir responsável).

### 2. Exibir o nome mesmo fora da lista
- `AssigneeSelect` deixa de depender só da lista: se o `assigned_to` não estiver entre os colegas carregados, mostra o nome resolvido individualmente (consulta pontual em `profiles_public`) em vez de campo vazio.

### 3. Verificação
- Como comercial: abrir CRM → Leads & Oportunidades → aba Leads do Site e ver "Gabriele Braga da Silva" na coluna Responsável da Belga marine.
- Abrir o detalhe do lead e ver o mesmo nome no seletor; trocar por outro colega e ver atualizando na lista.
- Conferir que o seletor lista colegas (hoje vem vazio).

## Detalhes técnicos

- `src/hooks/useCompanyUsers.ts`: trocar `from("profiles")` por `from("profiles_public")`, mantendo filtro `company_id` e ordenação por nome; ajustar o tipo de retorno (sem `email` obrigatório).
- `src/components/commercial/AssigneeSelect.tsx`: fallback de resolução de nome para valores fora da lista.
- Sem migração de banco e sem afrouxar RLS de `profiles`.
