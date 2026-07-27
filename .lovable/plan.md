## Objetivo

Reduzir a lista plana e longa da sidebar do RH agrupando itens relacionados em seções expansíveis, usando o mesmo padrão `children` já implementado na sidebar da Qualidade.

## Escopo

Somente a sidebar do RH nesta iteração. Comercial, Coordenador e demais setores ficam para uma próxima rodada, quando confirmarmos a proposta de agrupamento de cada um.

## Nova estrutura do menu de RH

```text
Dashboard
Pessoas
  ├─ Colaboradores
  ├─ Escalas e Ausências
  ├─ Controle de Atendimento
  └─ Férias
Documentação
  ├─ Documentos
  ├─ Conformidade Documental
  ├─ Revisão de Documentos
  └─ Compartilhamento com Coordenadores
SST
  ├─ Exames Ocupacionais
  └─ Gestão de EPI
Departamento Pessoal
  ├─ Folha de Pagamento
  └─ Parcerias
Recrutamento
Treinamentos
Relatórios
Configurações
Feed
Solicitações
```

Itens de topo (Dashboard, Recrutamento, Treinamentos, Relatórios, Configurações, Feed, Solicitações) permanecem sem grupo para acesso rápido.

## Detalhes técnicos

- Alterar apenas o array `hrMenuItems` em `src/components/DashboardLayout.tsx`, transformando os itens agrupados em nós com `key` + `children`, seguindo o mesmo formato de `qualidadeMenuItems`.
- Reaproveitar o renderizador de grupos existente — não precisa criar componente novo.
- Manter todas as rotas atuais intocadas; nenhuma URL muda, apenas a hierarquia visual.
- O grupo que contém a rota ativa abre automaticamente (comportamento já existente).
- Ícones: usar `Users` para Pessoas, `FolderOpen` para Documentação, `Stethoscope` para SST, `FileBarChart` para DP.

## Fora de escopo

- Reorganizar sidebars de outros papéis (será tratado em rodada seguinte).
- Renomear rotas ou páginas.
- Alterar permissões.
