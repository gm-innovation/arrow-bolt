## Regenerar mapa de telas, funções e caminhos (PDF v2)

Refazer `/mnt/documents/sgq-mapa-de-telas.pdf` para refletir a nova hierarquia do sidemenu do SGQ aprovada na rodada anterior.

### Mudanças em relação à versão anterior

1. **Árvore do sidemenu (Seção 1)** atualizada:
   - "Segurança" agora aparece como sub-item de **Operação da Qualidade** (junto com Provedores Externos, Calibração, Voz do Cliente).
   - "Homologação" agora aparece como sub-item de **Estratégia e Gestão** (junto com Análise Crítica), não mais no nível raiz.
2. **Tabela mestra (Seção 2)** — linhas de Segurança e Homologação remarcadas com o novo "pai" no menu; demais colunas (rota, arquivo, função) inalteradas.
3. **Seção "Estratégia e Gestão"** — incluir bullet de Homologação.
4. **Seção "Operação da Qualidade"** — incluir bullet de Segurança.
5. Rodapé com versão `v2` e data atual.

### Execução

- Reusar o script `/tmp/gen_map_pdf.py` (layout A4 retrato + páginas A4 paisagem para a tabela mestra, `repeatRows=1`, larguras proporcionais ao `doc.width`, margens 1,5 cm) — já validado contra o problema de corte.
- Atualizar apenas os arrays de dados (árvore + linhas da tabela + bullets dos grupos).
- Salvar como `/mnt/documents/sgq-mapa-de-telas_v2.pdf` (preservar a v1 conforme regra de versionamento).
- QA: rasterizar todas as páginas com `pdftoppm` e inspecionar visualmente para confirmar que nenhuma tabela vaza margem.

### Critério de aceite

- PDF gerado mostra Segurança dentro de Operação da Qualidade e Homologação dentro de Estratégia e Gestão, em todas as seções (árvore, tabela mestra, detalhes de grupo).
- Sem cortes de tabela em nenhuma página.
- Artifact entregue via `<presentation-artifact>`.
