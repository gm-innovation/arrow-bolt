
## Modais Faltantes do Modulo Comercial

Baseado nos 4 screenshots de referencia, existem 4 componentes que precisam ser criados ou convertidos de Dialog para Sheet (painel lateral), seguindo o padrao visual consistente: header com badges, formulario, e footer com Excluir/Cancelar/Salvar.

---

### 1. Editar Recorrencia (image-354) - Sheet lateral

**Atualmente:** O edit usa o mesmo Dialog de criacao.
**Referencia:** Um Sheet lateral com:
- Header: avatar do cliente + nome + segmento, avatar do produto + nome + tipo
- Badges: "ativo", valor formatado, proxima data
- Formulario: Cliente + Produto/Servico (2 colunas), Tipo + Periodicidade + Aviso antecipado (3 colunas), Proxima Data + Valor Estimado (2 colunas), Status full-width, Observacoes full-width
- Footer: botao "Excluir" (vermelho, alinhado a esquerda), "Cancelar" e "Salvar Alteracoes" (alinhados a direita)

**Acao:** Criar `src/components/commercial/recurrences/EditRecurrenceSheet.tsx` e atualizar `Recurrences.tsx` para abrir o Sheet ao clicar em editar (manter Dialog apenas para criacao).

---

### 2. Dossie do Cliente (image-355) - Sheet lateral

**Atualmente:** Nao existe (foi adiado anteriormente).
**Referencia:** Um Sheet lateral acionado ao clicar na linha do cliente, com:
- Header: avatar com inicial + nome + CNPJ, botao "Dossie do Cliente"
- Badges: status (em risco/ativo) + segmento (Grande/Medio/Pequeno)
- Botoes de acao: "Editar" e "+ Nova Oportunidade"
- 3 KPI cards: TCV (Total), Ticket Medio, Risco de Churn (com cores e icones)
- 5 Tabs: Insights de IA, Oportunidades, Compras, Recorrencias, Contatos
- Conteudo da tab "Insights de IA": Recomendacoes com botoes Ignorar/Relevante

**Acao:** Criar `src/components/commercial/clients/ClientDetailSheet.tsx`. Integrar na pagina `Clients.tsx` -- ao clicar numa linha da tabela, abre o Sheet. Dados de oportunidades, recorrencias e compradores serao buscados com queries sob demanda por client_id.

---

### 3. Editar Oportunidade (image-356) - Sheet lateral

**Atualmente:** O click na tabela abre um Sheet de detalhes (`OpportunityDetails.tsx`) que mostra dados readonly + atividades. A edicao usa o Dialog `NewOpportunityDialog`.
**Referencia:** Um Sheet lateral de edicao com:
- Header: badges (prioridade + tipo), valor formatado + data de criacao
- Formulario: Titulo full-width, Cliente + Valor (2 colunas), Estagio + Probabilidade (2 colunas), Tipo + Prioridade (2 colunas), Previsao de Fechamento full-width, Descricao full-width
- Footer: "Excluir" (vermelho), "Cancelar", "Salvar Alteracoes"

**Acao:** Criar `src/components/commercial/opportunities/EditOpportunitySheet.tsx`. Atualizar `Opportunities.tsx` para abrir o Sheet ao clicar numa oportunidade (substituindo o Sheet de detalhes readonly que sera embutido como tab ou mantido separado). O botao de edit na tabela abrira este Sheet.

---

### 4. Editar Comprador (image-357) - Sheet lateral

**Atualmente:** A edicao reutiliza o mesmo Dialog de criacao (`NewBuyerDialog`).
**Referencia:** Um Sheet lateral com:
- Header: badges (nivel de influencia + empresa)
- Secao "Informacoes Pessoais": Nome Completo + Cargo (2 colunas), E-mail + Telefone (2 colunas) com icones de email/telefone nos inputs
- Secao "Configuracoes": Nivel de Influencia (dropdown full-width), checkboxes (ativo + principal)
- Secao "Observacoes": Notas internas (textarea)
- Secao "Informacoes do Sistema": Cadastrado em + Inicio do relacionamento (2 colunas, readonly)
- Footer: "Excluir Comprador" (vermelho), "Cancelar", "Salvar Alteracoes"

**Acao:** Criar `src/components/commercial/buyers/EditBuyerSheet.tsx`. Atualizar `Buyers.tsx` para abrir o Sheet ao clicar no botao de editar (manter `NewBuyerDialog` apenas para criacao).

---

### Resumo de Alteracoes

| Tipo | Arquivo |
|------|---------|
| Criar | `src/components/commercial/recurrences/EditRecurrenceSheet.tsx` |
| Criar | `src/components/commercial/clients/ClientDetailSheet.tsx` |
| Criar | `src/components/commercial/opportunities/EditOpportunitySheet.tsx` |
| Criar | `src/components/commercial/buyers/EditBuyerSheet.tsx` |
| Modificar | `src/pages/commercial/Recurrences.tsx` (integrar EditRecurrenceSheet) |
| Modificar | `src/pages/commercial/Clients.tsx` (integrar ClientDetailSheet) |
| Modificar | `src/pages/commercial/Opportunities.tsx` (integrar EditOpportunitySheet) |
| Modificar | `src/pages/commercial/Buyers.tsx` (integrar EditBuyerSheet) |

---

### Padrao Visual Consistente dos Sheets

Todos os Sheets seguirao o mesmo padrao de layout:

```text
+------------------------------------------+
| [Titulo]                              X  |
| [Subtitulo descritivo]                   |
+------------------------------------------+
| [Avatar] Nome / Info                     |
| [Badge1] [Badge2] [Badge3]              |
+------------------------------------------+
|                                          |
| Formulario com secoes e grid 2 colunas   |
|                                          |
+------------------------------------------+
| [Excluir]          [Cancelar] [Salvar]   |
+------------------------------------------+
```

- Largura: `sm:max-w-lg` (consistente com Sheet existente)
- Overflow: `overflow-y-auto` para conteudo longo
- Botao Excluir: variante `destructive` com icone `Trash2`, alinhado a esquerda
- Botoes Cancelar/Salvar: alinhados a direita
- Secoes separadas por `Separator` ou titulos `h4` com fonte semibold

### Detalhes Tecnicos

**ClientDetailSheet:** Queries separadas por tab para evitar carga desnecessaria:
- Tab "Oportunidades": `crm_opportunities` filtrado por `client_id`
- Tab "Recorrencias": `crm_client_recurrences` filtrado por `client_id`
- Tab "Contatos": `crm_buyers` filtrado por `client_id`
- Tab "Insights de IA": Placeholder com dados mockados (IA sera integrada futuramente)
- KPIs: TCV = soma dos estimated_value das oportunidades ganhas; Ticket Medio = TCV / count; Risco de Churn = baseado em dias sem contato (last_contact_date)

**EditOpportunitySheet:** Reutiliza constantes STAGES, TYPES, PRIORITIES do `NewOpportunityDialog`. Ao salvar, chama `updateOpportunity.mutate`. Ao excluir, chama `deleteOpportunity` (precisa ser adicionado ao hook se nao existir).

**Ordem de implementacao:**
1. EditRecurrenceSheet + integracao em Recurrences.tsx
2. EditBuyerSheet + integracao em Buyers.tsx
3. EditOpportunitySheet + integracao em Opportunities.tsx
4. ClientDetailSheet + integracao em Clients.tsx
