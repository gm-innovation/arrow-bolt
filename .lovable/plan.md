
# Reestruturação completa da documentação SGQ Arrow (v2 do plano)

Refazendo a entrega como **3 PDFs independentes**, cada um com capa Lecsor, sumário, cabeçalho/rodapé, paginação e linguagem operacional (sem termos internos como "onda", "Opção A/B", "permissivo", "fallback", "cron", "RPC").

Observações do revisor incorporadas: glossário prévio no Artefato 1, próximos passos em linguagem de negócio, diagrama do mapa de telas como tabela hierárquica (não ASCII), bloco de controle de versão visível no manual, e nome da empresa padronizado.

---

## Padronização de marca (aplicada aos 3 PDFs)

- **Nome curto:** Lecsor
- **Nome completo / oficial:** **Lecsor Technology** (igual ao que aparece na logo enviada)
- **Uso:** capa e rodapé sempre "Lecsor Technology"; corpo do texto pode usar "Lecsor" quando já contextualizado
- **Sistema:** sempre "Arrow" (nunca "sistema Arrow da Lecsor" misturado)
- **Capa:** logo preta + "Arrow" como nome do produto + "Lecsor Technology" como responsável
- **Rodapé:** logo Lecsor Technology cinza pequena à esquerda + número de página à direita
- **Cabeçalho:** nome do documento à esquerda + "Arrow · Lecsor Technology" à direita

> Se o nome oficial registrado for outro (ex.: "Lecsor Technology Ltda" ou apenas "Lecsor"), basta avisar antes da execução — o ajuste é trivial.

---

## Artefato 1 — `relatorio-comparativo-sgq-arrow.pdf`

Comparativo **completo** entre o documento "Mapeamento do Portal ISO" (Rayane) e o que existe hoje no módulo de Qualidade do Arrow. Sem recorte por "onda".

### Estrutura
1. **Capa** — logo Lecsor Technology, título "Relatório Comparativo — Módulo de Qualidade", subtítulo "Sistema Arrow", data, versão 1.0
2. **Sumário**
3. **Introdução**
   - O que é o Arrow e a quem pertence
   - Finalidade do documento
   - **Glossário rápido** (antes da tabela, para o leitor não precisar consultar outro documento):
     - **SGQ** — Sistema de Gestão da Qualidade
     - **GED** — Gestão Eletrônica de Documentos (módulo onde ficam procedimentos, normas e formulários controlados)
     - **Lista Mestre** — registro centralizado de todos os documentos controlados do SGQ, com código, revisão vigente, responsável e status
     - **Cópia Controlada** — versão de um documento cuja distribuição é rastreada pelo sistema; só usuários autorizados podem baixar ou imprimir
     - **RNC** — Registro de Não Conformidade
     - **SIPOC** — mapeamento de processos (Fornecedor, Entrada, Processo, Saída, Cliente)
     - **Análise Crítica pela Direção** — reunião formal periódica de avaliação do SGQ
4. **Legenda de status**
   - **Atendido** — funcionalidade existe e está disponível
   - **Parcialmente atendido** — existe, mas com limitações descritas na linha
   - **Não atendido** — ainda não existe no sistema
5. **Comparativo item a item** — uma seção por capítulo do documento original:
   - Escopo (controle de revisão, expiração, código, permissão de impressão/download)
   - Referência Normativa (anexos de norma, mudanças climáticas)
   - Termos e Definições
   - Contexto da Organização (Análise Competitiva, Análises Críticas, Partes Interessadas, Missão/Visão/Valores, Objetivos Estratégicos, Política da Qualidade)
   - Análise SWOT (4 cenários e cruzamento estratégico)
   - Mapeamento de Processos / SIPOC
   - Padronização de layout dos documentos
   - Documentos do Cliente (CNPJ, Alvará, IE — com expiração)
   - Planejamento (riscos, oportunidades, mudanças, indicadores)
   - Treinamento e Avaliação de Eficácia
   - Calibração / Aferição de Instrumentos
   - Não Conformidade (RNC) com Plano de Ação
   - Auditoria Periódica
   - Análise Crítica pela Direção (com geração de ATA)
   - Melhoria (visualização única)
   - Lista Mestre
   - Acesso Master (modificar, aprovar, controlar todo o sistema)
   - Controle de Cópias Controlada / Não Controlada (registro de entrega e recolhimento)
6. **Formato de cada linha:** O que foi solicitado | O que existe hoje no Arrow | Onde encontrar (caminho da tela) | Status | Observação
7. **Resumo executivo final** — quantitativo (X atendidos, Y parciais, Z não atendidos) e as principais lacunas em linguagem clara
8. **Próximos passos sugeridos** — sempre em linguagem de negócio, nunca técnica. Exemplos do que entra:
   - ✅ "Implementar controle de entrega e recolhimento de cópias controladas"
   - ✅ "Adicionar avaliação de eficácia aos planos de treinamento"
   - ✅ "Disponibilizar geração automática da ATA de Análise Crítica"
   - ❌ Nunca: nomes de tabela, funções SQL, cron, RPC, edge functions

### Princípio
Cada linha confirmada por leitura real de `src/pages/quality/` e `src/components/quality/`. Onde não houver evidência, marcar como "Não atendido" — sem inventar.

---

## Artefato 2 — `mapa-de-telas-sgq-arrow.pdf`

### Estrutura
1. **Capa** — logo Lecsor Technology, título "Mapa de Telas — Módulo de Qualidade", subtítulo "Sistema Arrow"
2. **Sumário**
3. **Introdução** — como o módulo está organizado, perfis que enxergam o menu, observação de que telas internas podem ter restrições adicionais por papel ou estado de negócio
4. **Tabela principal:** Caminho na tela | Nome da tela | Tipo (Tela / Aba / Atalho) | Abas internas | Quem pode acessar | O que faz
5. **Hierarquia de navegação** — em vez de ASCII, **tabela de duas colunas** (Nível · Item) com indentação visual via espaços não-quebráveis e/ou cor de fonte por nível. Mais previsível no reportlab. Se ainda assim ficar torta no QA, será removida.

---

## Artefato 3 — `manual-uso-sgq-arrow_v4.pdf` (revisão do v3)

Mantém a estrutura aprovada no v3, com:
- Capa com **logo Lecsor Technology** + nome "Arrow"
- **Bloco de controle de versão na capa**, ao estilo dos documentos da ISO:
  - Versão: 4.0
  - Data de revisão: [data de geração]
  - Substitui: Manual de Uso SGQ Arrow v3
  - Responsável pelo documento: Lecsor Technology
- Rodapé em todas as páginas: "Versão 4.0 — [data]" + número da página + logo cinza
- Varredura final removendo qualquer termo técnico residual ("Opção A/B", "permissivo", "fallback", "cron", "RPC") substituindo por descrição operacional
- Mantém o callout "Acesso por Perfil" e o fluxo 5.2 já corrigidos

---

## Identidade visual

- **Capa:** fundo branco, logo Lecsor Technology preta centralizada no topo, título grande, subtítulo, faixa inferior com bloco de versão/data
- **Cabeçalho interno:** linha fina + nome do documento à esquerda + "Arrow · Lecsor Technology" à direita
- **Rodapé:** logo Lecsor Technology cinza (pequena) à esquerda + "Versão X.X — dd/mm/aaaa" centralizado + número da página à direita
- **Tipografia:** Helvetica (corpo), preto / cinza médio (#6B7280) / cinza-claro (#E5E7EB) para linhas de tabela. Sem azuis genéricos
- **Para o bloco de hierarquia do Artefato 2:** se algum trecho exigir alinhamento fixo (raro), usar Courier explicitamente

---

## Execução (após aprovação)

- Script único `/tmp/build_arrow_docs.py` (reportlab Platypus)
- Logos copiadas dos uploads para `/tmp/`: `lecsor-black.png`, `lecsor-grey.png`
- Helper `flow_block` para evitar títulos órfãos (já validado no v3)
- **QA visual obrigatório**: `pdftoppm` em **todas** as páginas dos 3 PDFs, inspeção, correção, re-render. Atenção especial ao bloco de hierarquia do Artefato 2 — se ficar torto, remover
- Entrega final via 3 tags `<presentation-artifact>`
- O `relatorio-comparativo-sgq-onda4.pdf` antigo fica em `/mnt/documents` como histórico (não removido)

## Fora do escopo
- Sem alteração no código da aplicação
- Sem versão DOCX
- Sem reivindicação de certificação ISO
