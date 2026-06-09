## Ajustes no sidemenu do SGQ

Dois pequenos ajustes no menu lateral do módulo Qualidade em `src/components/DashboardLayout.tsx` (sem mudança de rotas, telas ou lógica — apenas reorganização da navegação).

### 1. Expor "Segurança" dentro de "Operação da Qualidade"

A rota `/quality/safety` já existe e renderiza `pages/quality/Safety.tsx` (documentos e registros de S&S: PCMSO, PGR, LTCAT, NR01, FICHA_EPI, ASO, LAUDO_SST). Ela só não está visível no menu.

Adicionar como sub-item do grupo `q-ops`:

```text
Operação da Qualidade
├── Provedores Externos
├── Calibração
├── Voz do Cliente
└── Segurança (novo)   →  /quality/safety
```

### 2. Mover "Homologação" para dentro de "Estratégia e Gestão"

A página `/quality/homologation` é o registro formal de aprovação do ciclo do SGQ pela Direção (status, responsável, PDF assinado, data de assinatura). Faz mais sentido ao lado de Análise Crítica, que é o passo anterior do ciclo.

```text
Estratégia e Gestão
├── Riscos & Oportunidades
├── Planejamento ▸
├── Partes Interessadas
├── Análise Crítica
└── Homologação (movido)   →  /quality/homologation
```

O item "Homologação" deixa de aparecer no nível raiz do SGQ.

### Resultado final do menu raiz do SGQ

```text
Dashboard
Documentação ▸
Melhoria ▸
Auditorias
Estratégia e Gestão ▸     (agora inclui Homologação)
Operação da Qualidade ▸   (agora inclui Segurança)
Competências e Pessoas ▸
Comunicação
Configurações
Feed
Solicitações Corp
Treinamentos
```

### Detalhes técnicos

- Arquivo único: `src/components/DashboardLayout.tsx`, array `qualityMenuItems` (linhas ~282–328).
- Ícone sugerido para Segurança: `HardHat` (ou reaproveitar `ShieldCheck`).
- Nenhuma alteração em rotas (`App.tsx`), páginas, hooks, RLS ou banco.
- Atualizar `/mnt/documents/sgq-mapa-de-telas.pdf` ao final para refletir a nova hierarquia.

### Critérios de aceite

- "Segurança" aparece como sub-item de "Operação da Qualidade" e abre `/quality/safety`.
- "Homologação" aparece como sub-item de "Estratégia e Gestão" e abre `/quality/homologation`; não aparece mais no nível raiz.
- Demais itens inalterados.
