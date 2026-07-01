## Reorganização de menus (Qualidade → Suprimentos)

### O que muda

**Menu da Qualidade** (`src/components/DashboardLayout.tsx`)
- Remover o grupo **"Suprimentos & Fornecedores"** (Provedores Externos + Homologação).
- Remover o grupo **"Metrologia"** (Calibração de Instrumentos) — setor do Renan ainda não foi desenvolvido.

**Menu de Suprimentos** (mesmo arquivo)
- Adicionar dois itens novos entre "Solicitações" e "Configurações":
  - **Provedores Externos** → `/quality/suppliers`
  - **Homologação** → `/quality/homologation`

### O que NÃO muda

- As **rotas** `/quality/suppliers`, `/quality/suppliers/:id`, `/quality/homologation` e `/quality/devices` continuam registradas em `App.tsx` e as páginas permanecem intactas — só saem do menu lateral da Qualidade. Isso preserva links existentes e permite que o setor de Suprimentos acesse as mesmas telas sem retrabalho.
- Nenhuma alteração em banco de dados, permissões (RLS) ou componentes de página.
- O menu de Calibração fica reservado para quando o setor do Renan for desenvolvido — a página `/quality/devices` continua funcional para acesso direto por URL, mas some da navegação.

### Observação sobre permissões

As páginas `/quality/suppliers` e `/quality/homologation` hoje têm RLS/roteamento voltados para o role `qualidade`. Se o pessoal de Suprimentos (role `compras`) precisar acessá-las via o novo item de menu, será necessário um ajuste de permissões — posso tratar isso numa etapa seguinte se você confirmar que os usuários de Suprimentos devem editar esses cadastros (e não apenas visualizar).
