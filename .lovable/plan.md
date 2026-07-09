# Manual Passo a Passo Ilustrado — Módulo Comercial / Marketing

Manual completo com **screenshots reais anotados** de cada página, ferramenta e função do módulo, no formato passo a passo.

## Escopo (17 seções da sidebar + fluxos)

Baseado na sidebar atual (`/commercial/*`):

| # | Página | Rota |
|---|---|---|
| 1 | Dashboard | `/commercial` |
| 2 | Clientes | `/commercial/clients` |
| 3 | Oportunidades | `/commercial/opportunities` (+ aba Leads do Site) |
| 4 | Tarefas | `/commercial/tasks` |
| 5 | Compradores | `/commercial/buyers` |
| 6 | Produtos | `/commercial/products` |
| 7 | Recorrências | `/commercial/recurrences` |
| 8 | Vendas | `/commercial/sales` (abas Serviços + Produtos) |
| 9 | Relatórios | `/commercial/reports` |
| 10 | Conhecimento | `/commercial/knowledge` |
| 11 | Inteligência (IA) | `/commercial/ai-insights` |
| 12 | Notificações | `/commercial/notifications` |
| 13 | Admin | `/commercial/admin` |
| 14 | Configurações | `/commercial/settings` |
| 15 | Feed | `/corp/feed` |
| 16 | Solicitações | `/corp/requests` |
| 17 | Treinamentos | `/corp/university` |
| + | Menu do usuário (Perfil / Minha Conta / Sair) | topo |

**Modais e fluxos secundários também documentados com print:**
- Novo Cliente (abas Empresa / Contatos / Embarcações) + busca CNPJ
- Detalhes do Lead + Conversão de Lead
- Kanban de Oportunidades (drag-and-drop)
- Modal completo de Medição Final (abas Básico / Mão de Obra / Materiais / Serviços / Deslocamento / Despesas / Resumo)
- Detalhes de Venda de Produto
- Dossiê do Cliente (5 abas)

## Como será gerado

### Fase 1 — Captura automatizada de screenshots
Script Playwright (`/tmp/browser/manual/`) que:
1. Restaura sessão Supabase (`LOVABLE_BROWSER_AUTH_STATUS=injected`), login como Comercial.
2. Navega por cada rota da tabela acima, aguarda render, tira screenshot em viewport 1440×900.
3. Para cada modal: abre via clique real, tira screenshot, fecha.
4. Para cada aba: clica e captura separadamente.
5. Salva em `/tmp/browser/manual/screenshots/NN_slug.png`.

### Fase 2 — Anotação dos prints
Script Python (PIL) que desenha sobre cada screenshot:
- Balões numerados (①②③) apontando para botões/campos-chave.
- Retângulos vermelhos destacando áreas importantes.
- Legenda lateral com o que cada número significa.
Saída: `/tmp/browser/manual/annotated/NN_slug.png`.

### Fase 3 — Montagem do manual
Um único **PDF** (`Manual_Comercial_Marketing_Passo_a_Passo_v3.pdf`) gerado com ReportLab, seguindo a identidade visual dos manuais anteriores (Lecsor/Arrow):
- Capa escura com logo, título e versão.
- Sumário navegável.
- Uma seção por página do módulo, contendo:
  - **O que é** — descrição funcional.
  - **Quem pode acessar** — papéis com permissão.
  - **Passo a passo** — lista numerada de ações, cada passo referenciando o número do balão no print.
  - **Screenshot anotado** em largura total.
  - **Dicas / Regras de negócio** (ex.: buyer auto-criado ao converter lead, edição de medição só pelo dono da OS, categorias de imposto).
- Apêndices:
  - Matriz de permissões por papel.
  - Glossário (Lead, Oportunidade, RFQ, Buyer, Medição, Churn).
  - Fluxos ilustrados ponta-a-ponta (Lead → Oportunidade → OS → Medição → Venda).
  - Changelog v1 → v3.

Também exportado em **DOCX** (`Manual_Comercial_Marketing_Passo_a_Passo_v3.docx`) com os mesmos prints embutidos via `docx-js`.

### Fase 4 — QA obrigatório
- Converter cada página do PDF para JPG e inspecionar (regra do skill pdf).
- Verificar: prints não cortados, balões legíveis, sem texto sobreposto, sem placeholder.
- Corrigir e re-renderizar até passar limpo.

## Entrega

Dois artefatos em `/mnt/documents/`, apresentados via `<presentation-artifact>` para download:
- `Manual_Comercial_Marketing_Passo_a_Passo_v3.pdf`
- `Manual_Comercial_Marketing_Passo_a_Passo_v3.docx`

## Observações

- Nenhuma alteração no código-fonte do app — trabalho é 100% de captura + documentação.
- Se alguma rota exigir role diferente (ex.: `/commercial/admin` restrito a admin), farei re-login com conta apropriada usando a mesma sessão injetada; se não for possível, marco a seção com nota "acesso restrito ao Admin" e uso print vazio anotado.
- Tempo estimado de execução: alto (18+ rotas × captura + anotação + montagem + QA). Entrego tudo em uma passada assim que aprovado.
