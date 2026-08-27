# Apresentação executiva do Arrow para a Diretoria

Entrega: um deck em **.pptx** (editável) + o mesmo deck em **.pdf**, ambos disponíveis para download aqui no chat. Nada é construído dentro do sistema.

Tom: executivo sênior de empresa de tecnologia — pouco texto por slide, números reais, decisão clara no fim. Português do Brasil, identidade visual Lecsor/GM Innovation (base escura nos slides de abertura/seção, claros no conteúdo).

## Números reais já confirmados no banco (serão usados no deck)

| Indicador | Valor |
|---|---|
| Ordens de serviço no Arrow | 4.977 (4.121 concluídas) |
| OSs movimentadas nos últimos 90 dias | 4.972 |
| Tarefas de campo espelhadas do Auvo | 2.741 |
| Relatórios de campo importados | 2.216 |
| Clientes na base | 2.251 |
| Colaboradores ativos com acesso | 58 |
| Papéis/áreas com trilha própria | 11 |
| Tabelas de dados em produção | 318 |
| Notificações já disparadas | 3.135 |
| Mensagens tratadas pela Marina | 437 em 67 conversas |
| Habilidades ativas da Marina | 12 |
| Documentos de RH sob gestão | 266 |

Módulos com adoção ainda baixa (medições: 6, oportunidades: 4, solicitações internas: 3, ponto eletrônico: 0 batidas) entram como **"pronto, aguardando adoção"** — é exatamente o argumento do plano de migração, não um número escondido.

## Estrutura do deck (16 slides)

1. **Capa** — Arrow: a plataforma operacional da Lecsor / GM Innovation. Data e público.
2. **Sumário executivo** — 4 frases: o que existe, o que já roda, o que falta, o que se pede à diretoria.
3. **O problema hoje** — operação espalhada entre Auvo, planilhas, Omie, e-mail e WhatsApp; retrabalho e falta de visão única.
4. **O que é o Arrow** — uma plataforma, seis domínios (Operação, RH/DP, Qualidade/SGQ, Comercial, Financeiro/Suprimentos, IA), web + app Android.
5. **Números da plataforma hoje** — grid de estatísticas grandes (tabela acima).
6. **Em produção e usado todo dia** — OS e agenda unificada, espelho Omie, espelho Auvo, RH documental, notificações, Marina no chat e no WhatsApp.
7. **Marina, a copilota corporativa** — o que ela já responde e faz, canais (Arrow + WhatsApp), acesso por papel, habilidades.
8. **Pronto, aguardando adoção** — medições, CRM comercial, solicitações internas, ponto/jornada, universidade corporativa, SGQ.
9. **Arquitetura e integrações** — diagrama: Arrow no centro; Omie (ERP) e EVA (estoque) integrados de forma permanente; Auvo e planilhas como origens a serem descontinuadas.
10. **Segurança e governança** — dados por empresa, acesso por papel, auditoria, segredos no backend, app com atualização remota.
11. **Roadmap 3 ondas** — próximos 3, 6 e 12 meses (consolidação de adoção → jornada/ponto e SGQ completos → analytics e autonomia da IA).
12. **Proposta conservadora de migração — princípios** — nada de virada única; Arrow espelha antes de assumir; Omie e EVA permanecem integrados por decisão, não por dependência.
13. **Migração do Auvo em 4 fases** — Espelho (feito) → Operação paralela → Arrow como origem, Auvo como leitura → Descontinuação, com critério de saída por fase.
14. **Migração das planilhas** — inventário por área, carga assistida, congelamento da planilha, checagem dupla por um ciclo.
15. **Riscos e mitigação** — resistência de uso, qualidade de dado legado, dependência de integração, capacidade de suporte; cada um com mitigação e responsável.
16. **Decisões pedidas à diretoria** — patrocínio da migração do Auvo, prazo de congelamento das planilhas, responsáveis por área, marco de revisão.

Onde um número for necessário e não existir no sistema (custo de licenças, prazos definidos pela diretoria), o slide traz um marcador visível do tipo `[definir com a diretoria]` — nada de valor inventado.

## Detalhes técnicos

- Geração com `pptxgenjs` em script Node em `/tmp`, 16:9, paleta e tipografia definidas uma vez e reaproveitadas em todos os slides; motivo visual único repetido (blocos com borda lateral grossa + rótulo em pílula).
- Logo da Lecsor embutido em base64 a partir dos assets do projeto.
- PDF gerado pela conversão LibreOffice do mesmo .pptx, garantindo que os dois arquivos sejam idênticos.
- QA obrigatório: validação de schema do .pptx, extração de texto e inspeção visual slide a slide (overflow, sobreposição, contraste, margens), com ciclo de correção antes de entregar.
- Arquivos finais em `/mnt/documents`: `arrow-apresentacao-diretoria.pptx` e `arrow-apresentacao-diretoria.pdf`.
- Nenhum arquivo do sistema é alterado.
