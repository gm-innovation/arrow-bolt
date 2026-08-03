# Relatório completo de QA em PDF

Gerar um PDF de evidências consolidando toda a bateria de testes executada (smoke por papel, revalidação das 4 correções, fluxos de escrita e o bug corrigido), com prints incorporados, e salvá-lo na área de arquivos para download.

## Insumos disponíveis (já em disco)

- 10 arquivos JSON de smoke por papel (super_admin, director, coordinator, technician, hr, commercial, marketing, financeiro, compras) com rota, status e erros de rede/console.
- 5 arquivos JSON dos lotes de fluxos de escrita.
- 65 capturas de tela (`screens`, `reval/screens`, `flows/out/screens`).
- O relatório em markdown `docs/qa/relatorio-testes.md`.

## Estrutura do PDF

1. Capa: título, data, ambiente, empresa de teste, escopo e nota de que o módulo de Qualidade (SGQ) ficou fora por conformidade ISO 9001.
2. Sumário executivo: totais (papéis testados, rotas verificadas, fluxos de escrita, bugs encontrados x corrigidos) e veredito.
3. Etapa 1 — Smoke por papel: uma seção por papel com tabela de rotas (rota, resultado, observação) e print da área principal.
4. Etapa 2 — Revalidação das 4 correções: tabela antes/depois por correção (embeds PostgREST, filtro de relatórios do técnico, loop de renderização, papéis duplicados/406) com print de cada evidência.
5. Etapa 3 — Fluxos de escrita: por módulo (Financeiro, Comercial, Coordenação, RH, Compras, Feed), com o que foi criado, resultado e print do registro salvo.
6. Casos negativos de permissão: tabela de tentativas de acesso indevido e bloqueios confirmados.
7. Bug encontrado e corrigido: feed corporativo retornando 403 para comercial/técnico — causa, correção aplicada e print da revalidação.
8. Pendências e recomendações: fluxo de OS ponta a ponta, aprovação de requisição pelo diretor, solicitação corporativa/férias com seletor não localizado, limpeza dos registros `[QA]`.
9. Anexo: índice de todas as capturas, cada uma com legenda de papel/rota.

## Detalhes técnicos

- Geração com ReportLab (Platypus), A4, fonte Unicode DejaVu Sans registrada para acentuação correta em pt-BR.
- Visual alinhado à identidade do Arrow (cores dos tokens do projeto), tabelas com status colorido (aprovado/corrigido/pendente).
- Prints redimensionados para caber na largura útil, com legenda e sem cortes; capturas ilegíveis ou duplicadas são descartadas.
- Dados das tabelas lidos dos JSON de resultado, não digitados à mão.
- Saída: `/mnt/documents/Arrow_Relatorio_QA_v1.pdf`, disponibilizada na área de arquivos.
- QA obrigatório: converter todas as páginas em imagem e inspecionar uma por uma (texto cortado, sobreposição, páginas em branco, imagens faltando) e corrigir o script até a saída ficar limpa.
