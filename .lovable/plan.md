# Tipos de campanha em Voz do Cliente

Adicionar seleção de tipo de campanha (NPS, CSAT, CES — individualmente ou combinados) na criação, e adaptar o formulário público para mostrar apenas as perguntas habilitadas.

## 1. Banco (1 migração)

`quality_satisfaction_campaigns`
- `collects_nps boolean NOT NULL DEFAULT true`
- `collects_csat boolean NOT NULL DEFAULT true`
- `collects_ces boolean NOT NULL DEFAULT false`
- Trigger de validação: pelo menos uma das três deve ser true.

`quality_satisfaction_responses`
- `nps_score` → tornar **nullable** (remover NOT NULL, manter CHECK 0–10 quando preenchido).
- `csat_score` → tornar **nullable** (mesmo tratamento, 1–5).
- Adicionar `ces_score int NULL CHECK (ces_score BETWEEN 1 AND 7)` (escala CES padrão).
- Atualizar trigger `trg_qsr_derive` para só calcular `derived_nps`/`derived_csat` quando o score existir.

Sem mudança em RLS/grants.

## 2. Hook `useSatisfactionCampaigns.ts`

- Tipo `CampaignRow`: adicionar `collects_nps`, `collects_csat`, `collects_ces`.
- `create.mutationFn`: aceitar e gravar os três flags (default NPS+CSAT).
- Agregados: calcular `avg_nps`, `avg_csat`, `avg_ces` ignorando `null`.

## 3. Diálogo "Nova campanha" (`CampaignsTab.tsx`)

Adicionar bloco "Tipo de campanha" com 3 checkboxes (NPS, CSAT, CES), default NPS+CSAT marcados. Validação no submit: ≥1 marcado.

## 4. Listagem de campanhas

Adicionar coluna "Tipo" com badges (NPS / CSAT / CES). Coluna "NPS médio" → renderizar "—" se a campanha não coleta NPS. Adicionar coluna "CSAT médio" e "CES médio" condicionais.

## 5. Formulário público (`SatisfactionResponse.tsx`)

Carregar `collects_nps/csat/ces` da campanha e renderizar **apenas** as perguntas habilitadas. Submit envia somente os campos preenchidos. Mensagem de validação adaptada.

## 6. Detalhe da campanha (`SatisfactionDetail.tsx`)

- Cards de média: esconder bloco da métrica não coletada.
- Tabela de respostas: colunas condicionais NPS/CSAT/CES.

## Verificação final
- Criar campanha só-NPS → formulário público mostra só NPS, salvar funciona.
- Criar campanha NPS+CSAT+CES → formulário mostra os 3.
- Campanhas antigas (sem flags) recebem default NPS+CSAT via DEFAULT da coluna — funcionam sem mudança.
- Tentar criar campanha com 0 tipos → toast de erro.

## Fora de escopo
- Editar tipo após criação.
- Configuração de textos personalizados das perguntas.
- Pesos/cálculo de score CES agregado além da média simples.
