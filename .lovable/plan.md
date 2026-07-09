# Manual Comercial/Marketing v2 — com prints e passo a passo detalhado

## Objetivo
Substituir o `manual-uso-comercial-arrow.pdf` atual por uma versão didática, com **prints reais anonimizados** de cada tela e **passos numerados clique-a-clique** para cada fluxo.

## Preparação do ambiente para prints
1. Criar seed de dados fictícios no preview via Playwright (login como Comercial/Marketing).
2. Popular: 3 clientes ("Náutica Atlântico Ltda.", "Marina Sul S/A", "Estaleiro Norte"), 2 grupos econômicos, 5 oportunidades no Kanban (etapas variadas), 1 recorrência, 1 venda com estoque, 2 tarefas, 1 lead do site, 1 artigo na Base de Conhecimento, 1 medição com tributação.
3. Capturar prints em 1440×900, sempre com sidebar aberta, usando Playwright headless. Salvar em `/tmp/manual-prints/`.
4. Aplicar máscara de blur em qualquer PII residual (e-mails/telefones reais) via PIL antes de embutir.

## Estrutura do PDF (identidade Lecsor, mesmo template do SGQ v6)
- Capa + contracapa com versão v2.0 e data.
- Sumário clicável.
- **Convenções de uso** (ícones, callouts Dica/Atenção/Importante).
- **1. Primeiros passos** — login, visão geral da sidebar, perfil comercial vs marketing.
- **2. Dashboard Comercial** — KPIs, filtros de período, drilldown. [3 prints]
- **3. Clientes e Grupos Econômicos** — cadastro, dossiê (5 abas), vinculação de grupo, ClientSearchCombobox. [5 prints, 15 passos]
- **4. Oportunidades (Kanban/Pipeline)** — criar, mover etapas, ganhar/perder, produtos, previsão. [6 prints]
- **5. Recorrências** — cadastro, lead time, alertas de renovação. [3 prints]
- **6. Vendas e Estoque** — confirmar venda, baixa automática, devolução. [4 prints]
- **7. Tarefas Comerciais** — criar, atribuir, concluir, filtros. [3 prints]
- **8. Leads do Site** — triagem, conversão em oportunidade. [2 prints]
- **9. Base de Conhecimento (Marketing)** — criar artigo, segmentação, versionamento, tags. [4 prints]
- **10. Medições com Tributação** — abrir medição, categorias ISS (5%/2%/0%), fórmula "por dentro", fechar. [4 prints]
- **11. Relatórios e Exportações** — filtros, exportar Excel/PDF. [2 prints]
- **12. Perguntas frequentes e solução de problemas**.
- **Anexo A** — rotas e permissões por papel.
- **Anexo B** — glossário.

Cada seção segue o padrão:
1. **Para que serve** (1 parágrafo).
2. **Quando usar**.
3. **Passo a passo numerado** ("1. No menu lateral, clique em **Comercial › Clientes**. 2. Clique no botão **+ Novo Cliente** no topo direito…").
4. **Print(s)** com legenda e setas/realces em vermelho apontando o elemento citado.
5. **Dicas & atenções** em callouts.

## Geração
- Script Python com ReportLab (Platypus) reaproveitando estilos do manual SGQ v6.
- Anotações nos prints via PIL (setas, retângulos vermelhos, números circulados).
- QA obrigatório: converter cada página em JPG e inspecionar antes de entregar (layout, prints legíveis, sem PII, sem quebras estranhas).
- Salvar como `/mnt/documents/manual-uso-comercial-arrow_v2.pdf`.

## Estimativa
~45-55 páginas, ~35 prints anotados.

## Detalhes técnicos
- Playwright com sessão Supabase injetada (`LOVABLE_BROWSER_SUPABASE_*`) para logar como usuário Comercial.
- Seed feito via SQL direto (`supabase--insert`) em um `company_id` de teste, marcando registros com prefixo `[DEMO]` para permitir limpeza posterior.
- Blur/máscara aplicado somente se a captura pegar dado real; prioridade é usar dados criados no seed.
