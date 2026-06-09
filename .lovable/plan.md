# Geração de 2 artefatos PDF — v2 (com ajustes do revisor)

Ambos serão escritos em `/mnt/documents/` e entregues via `<presentation-artifact>`.
Linguagem: **executiva/técnica** no relatório, **operacional passo-a-passo** no manual.

---

## Princípio transversal

> **Cada item documentado (rota, aba, fluxo, status de cláusula) só entra no PDF se houver evidência direta no código/UI.** Durante a fase de exploração, qualquer fluxo do manual ou linha do mapa de telas que não puder ser confirmado lendo arquivos reais será omitido ou marcado como "não evidenciado".

---

## Artefato 1 — `relatorio-comparativo-sgq-onda4.pdf`

Construído com **reportlab** (Platypus), paleta Arrow (azul/cinza, sem cores genéricas).

### Capa
- Título
- Subtítulo: "Onda 4 — fechamento de gaps de GED e Normas"
- Data, versão, autor

### Quadro de Premissas (logo após a capa, antes da Seção A)
Caixa destacada explicitando:

> **Premissa adotada neste relatório:** para documentos sem regra em `quality_document_permissions`, foi considerada a **Opção A — padrão permissivo**, preservando o comportamento histórico. A Opção B (restritiva) é citada como alternativa, não como pendência.

> **Escopo deste relatório:** mapeamento de cobertura funcional do módulo SGQ Arrow. **Não constitui auditoria de conformidade nem certificação.**

### Seção A — Antes vs Depois (mudanças desta onda)
Tabela:

| Item | Antes | Depois | Impacto | Risco mitigado |
|------|-------|--------|---------|----------------|
| Menu lateral | "SWOT/Cenário" como link próprio | Apenas aba interna em Contexto da Organização | Reduz duplicidade de navegação | Confusão entre dois pontos de acesso ao mesmo conteúdo |
| GED — botões Download/Imprimir/Cópia não controlada | Sempre habilitados | Gate via RPC `quality_doc_user_perms` + log `denied_*`; Director/Super Admin sempre liberados | Permissão configurada passa a ter efeito real | Vazamento de documentos restritos por download não controlado |
| Normas — status | Badge manual "Ativa/Inativa"; vencidas selecionáveis | VIEW com `effective_status` + cron diário desativando vencidas + selects usam `activeNorms` | Vigência reflete a data real; impede uso de norma fora de validade | Cadastro de RNC/Auditoria contra norma vencida |

### Seção B — Cobertura funcional do módulo SGQ frente à ISO 9001:2015
Subtítulo no PDF: *"Mapeamento de aderência sistêmica — não é auditoria de conformidade."*

Status usados: **Coberto no sistema** · **Parcialmente coberto** · **Não evidenciado no sistema**.

Colunas: Cláusula | Requisito (resumo) | Módulo/Tela no Arrow | Status | Observação.

Linhas (a confirmar 1 a 1 durante exploração, antes de classificar status):

- 4.1 Contexto da organização
- 4.2 Partes interessadas
- 4.3 Escopo do SGQ
- 4.4 SGQ e seus processos (SIPOC)
- 5.1 Liderança e compromisso
- 5.2 Política da qualidade
- 5.3 Papéis, responsabilidades e autoridades
- 6.1 Riscos e oportunidades
- 6.2 Objetivos da qualidade
- 6.3 Mudanças planejadas
- 7.1.5 Recursos de monitoramento e medição (calibração)
- 7.1.6 Conhecimento organizacional
- 7.2 Competência
- 7.3 Conscientização
- 7.4 Comunicação
- 7.5 Informação documentada (GED)
- **8.4 Controle de processos/produtos/serviços providos externamente** (fornecedores)
- **8.5.1 Controle da produção/prestação de serviço**
- **8.5.6 Controle de mudanças**
- **8.7 Controle de saídas não conformes**
- 9.1.1 Monitoramento, medição, análise e avaliação (indicadores)
- 9.1.2 Satisfação do cliente
- 9.1.3 Análise e avaliação
- 9.2 Auditoria interna
- 9.3 Análise crítica pela direção
- 10.2 Não conformidade e ação corretiva (RNC)
- 10.3 Melhoria contínua

(Cláusula 8 quebrada em 8.4 / 8.5.1 / 8.5.6 / 8.7 — sem agregar como "8.x".)

### Seção C — Mapa de Telas V5 (módulo Qualidade)
Colunas: **Rota/Acesso | Título | Tipo de acesso | Abas internas | Perfil com acesso à rota | Observações**.

Valores de "Tipo de acesso": `Rota` · `Aba interna` · `Rota pessoal` · `Redirect/legado`.

Coluna "Perfil com acesso à rota" usa exatamente o `allowedRoles` de `<ProtectedRoute>` em `App.tsx`, com nota de pé de página:

> *"Perfil com acesso à rota" reflete a permissão de roteamento via ProtectedRoute. Permissões funcionais dentro da tela (botões, abas, ações) podem depender de regras adicionais de RLS, role secundária ou estado de negócio.*

Linha específica para SWOT marcada como `Redirect/legado` ou simplesmente nota: "Antiga rota SWOT consolidada como aba em Contexto da Organização".

### Seção D — Conclusão executiva
- Principais ganhos da onda
- Riscos mitigados
- Pendências remanescentes (técnicas, sem ambiguidades de aprovação)
- Recomendação para a próxima onda

---

## Artefato 2 — `manual-uso-sgq-arrow.pdf`

Linguagem operacional, frases curtas, passo a passo. Cada fluxo só entra se confirmado por leitura de código/UI durante a exploração.

### Estrutura
1. **Capa + sumário**
2. **Visão geral** — login, navegação, perfis, conceitos básicos
3. **Capítulo por perfil** (Coordenador da Qualidade · Diretoria · Líderes/Coordenadores operacionais · Usuário final)

### Template fixo de cada fluxo no manual
Cada fluxo é apresentado com os 5 blocos:

- **Quem pode executar**
- **Pré-requisitos**
- **Passos** (numerados)
- **Resultado esperado**
- **Erros comuns**

### Fluxos candidatos (todos sujeitos a confirmação no código antes de virar texto)
- Cadastrar/aprovar documento na GED
- Configurar permissões de download/impressão por perfil ou usuário
- Cadastrar norma de referência com vigência
- Abrir RNC
- Criar auditoria interna
- Registrar risco e plano de ação
- Conduzir análise crítica pela direção
- Manter contexto da organização e partes interessadas
- Aprovações centrais (Diretoria)
- Consulta de documento vigente (usuário final)
- Reconhecimento de política (se existir como ação no UI)
- Pesquisa de satisfação (se houver fluxo de resposta interno)

Fluxos que não forem evidenciados na UI **não** entrarão — em vez de descrever especulativamente, o manual diz: "não documentado nesta versão".

---

## Passos de execução (após aprovação)

1. **Exploração de evidências** — em paralelo:
   - Ler `src/App.tsx` para rotas `/quality/*` + `allowedRoles`.
   - Listar `src/pages/quality/` e `src/components/quality/` para confirmar telas, abas e ações.
   - Para cada cláusula ISO da Seção B, identificar a tela/tabela correspondente; sem evidência clara → `Não evidenciado no sistema`.
   - Para cada fluxo do manual, abrir o componente e confirmar passos reais.
2. **Geração** — script Python único em `/tmp/build_docs.py` (reportlab) produzindo os 2 PDFs.
3. **QA visual obrigatório** — `pdftoppm` em cada PDF, inspeção página a página, correções, re-render.
4. Entrega via duas tags `<presentation-artifact>`.

## Fora do escopo
- Sem alterações de código da aplicação.
- Sem comparação com sistemas de mercado.
- Sem versão DOCX editável (formato escolhido: PDF).
- Sem reivindicação de conformidade ISO — apenas cobertura funcional.
