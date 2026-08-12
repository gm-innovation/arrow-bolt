# Ficha do colaborador com menos abas

Hoje a ficha tem 12 abas em três linhas. A proposta agrupa tudo em **5 abas**, sem perder nenhum conteúdo — o que sai da barra de abas vira seção dentro da aba.

## Nova estrutura

```text
Pessoal | Profissional | Documentos | Histórico | Anotações
```

1. **Pessoal** — dados pessoais no topo e, abaixo, seções recolhíveis: Contatos (inclui contatos de emergência), Endereço, Dependentes.
2. **Profissional** — como está hoje; para técnicos, os "Dados Técnicos" (especialidade, tipo sanguíneo, ASO, status médico) passam a ser uma seção aqui, junto com o selo de Status ASO.
3. **Documentos** — arquivos digitalizados (Docs atual, incluindo os documentos técnicos/NRs) e, em seção separada acima, "Documentos de identificação" (CPF, RG, CNH, CTPS…).
4. **Histórico** — três seções: Movimentações (setor/função/gestor), Atividade e Auditoria de dados sensíveis.
5. **Anotações** — inalterada.

A aba "Técnico" deixa de existir como aba: seus dados vão para Profissional e seus certificados já aparecem em Documentos.

## Detalhes de interface

- Seções internas usando accordion recolhível, com a primeira aberta por padrão e um resumo curto no cabeçalho (ex.: "Contatos (3)", "Dependentes (2)").
- Barra de abas volta a uma única linha, sem quebra em telas médias.
- Permissões e mascaramento de CPF/RG/CNH continuam exatamente como estão (revelar segue registrando no log).
- A aba salva por colaborador continua funcionando; valores antigos que não existem mais caem para "Pessoal".

## Técnico

- `src/components/hr/EmployeeDetailSheet.tsx`: reduzir para 5 gatilhos e reagrupar os `TabsContent`, envolvendo os componentes existentes (`ContactsTab`, `AddressTab`, `DependentsTab`, `IdentityDocumentsTab`, `AssignmentHistoryTab`, `SensitiveAuditTab`, aba de atividade e bloco técnico) em `Accordion` dentro das novas abas.
- Nenhum componente de aba precisa ser reescrito; apenas reposicionados.
