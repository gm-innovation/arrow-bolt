
# Encerramento — Roteiro de Homologação + Registro Formal (versão enxuta)

Escopo aprovado. Sem motor automático, sem matriz dinâmica, sem semeadura. Só o suficiente para a Rayane homologar com dados reais e deixar evidência ISO.

---

## 1. Roteiro de testes (documento estático)

Arquivo único versionado no repo, em Markdown, para a Qualidade executar manualmente.

- Caminho: `docs/sgq-homologacao-roteiro.md`
- Conteúdo: casos **A–F** já detalhados (Planejamento, Melhorias, Partes Interessadas, Dashboard/Alertas, Rastreabilidade reversa, RLS).
- Cada caso tem: pré-condição, passos, resultado esperado, campo de “OK / NOK / Observação”.
- Sem código associado. É só guia de execução.

## 2. Tabela `quality_homologations` (evidência auditável)

Migração com GRANTs + RLS no padrão do projeto.

```text
quality_homologations (
  id              uuid PK
  company_id      uuid (FK companies)
  cycle           text          -- ex.: "2026"
  homologated_by  uuid (auth.users)
  status          text CHECK in ('em_andamento','homologado','homologado_com_ressalvas','reprovado')
  notes           text
  pdf_path        text          -- caminho no bucket quality-signatures (reaproveitar) ou novo bucket
  created_at      timestamptz default now()
  signed_at       timestamptz
)
```

RLS: SELECT/INSERT/UPDATE para Coordenador da Qualidade e Diretor da empresa; super_admin total. Sem `anon`.

Bucket: reaproveitar `quality-signatures` (privado) com prefixo `homologations/{company_id}/...`. Sem bucket novo.

## 3. Tela `/quality/homologation` (mínima)

Página única e enxuta, registrada na rota da Qualidade.

- Listagem das homologações da empresa (ciclo, responsável, status, data, link do PDF).
- Botão **“Nova homologação”** → dialog com:
  - ciclo (texto)
  - responsável (preenchido com o usuário logado, editável só por Diretor)
  - status (select)
  - observações (textarea)
  - upload do PDF assinado (input file nativo overlay, padrão do projeto)
- Ação **“Marcar como assinada”** preenche `signed_at`.
- Link “📄 Ver roteiro de homologação” aponta para `docs/sgq-homologacao-roteiro.md` (renderizado ou baixável).

Sem dashboard novo, sem KPI, sem matriz, sem PDF gerado dinamicamente.

## 4. Arquivos previstos (curto)

Criar:
- `docs/sgq-homologacao-roteiro.md` — roteiro A–F.
- `supabase/migrations/<timestamp>_quality_homologations.sql` — tabela + GRANTs + RLS.
- `src/hooks/useQualityHomologations.ts` — list/create/update + upload do PDF.
- `src/pages/quality/Homologation.tsx` — tela única.
- `src/components/quality/NewHomologationDialog.tsx` — dialog de cadastro.

Editar:
- Rotas da Qualidade (onde estão as outras telas de `/quality/*`) para incluir `/quality/homologation`.
- Menu lateral da Qualidade (item “Homologação”).
- `.lovable/plan.md` — marcar Sprint de Fechamento encerrado e apontar a próxima ação como “Homologação pela Rayane”.

## 5. Critérios de aceite

1. Coordenador da Qualidade consegue abrir `/quality/homologation`, criar um registro, anexar PDF assinado e ver na listagem.
2. Diretor enxerga e pode editar status/observações.
3. Usuário sem papel de Qualidade não acessa a rota nem a tabela (RLS).
4. `docs/sgq-homologacao-roteiro.md` existe no repo e está linkado da tela.
5. Build passa sem erros.

---

Posso seguir para build com esse escopo enxuto?
