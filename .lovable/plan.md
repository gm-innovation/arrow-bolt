

## Redesign do Certificado PDF

### Alterações em `src/components/university/CertificatePDF.tsx`

**Logo maior:**
- De 120×45 para **220×80** — proporcionalmente similar ao `h-64` da tela de onboarding em relação ao A4 landscape

**Moldura com mais personalidade e cor:**
- Borda externa: azul escuro `#1a365d` com 3pt (manter) + adicionar cantos decorativos com linhas douradas/azuis
- Borda interna: trocar de `#bee3f8` cinza claro para um gradiente visual usando duas bordas — uma azul `#2b6cb0` (2pt) e uma dourada `#c5a44e` (1pt) com espaçamento entre elas
- Adicionar uma faixa decorativa azul no topo da página (`backgroundColor` parcial) — uma `View` com fundo `#1a365d` no topo, com ~30pt de altura, dando elegância

**Melhorias visuais:**
- Título "CERTIFICADO" com cor dourada `#b7922b` em vez de azul escuro
- Subtítulo "de Conclusão" mais destacado
- Nome do usuário com linha decorativa dourada embaixo em vez de cinza
- Labels com cor mais presente
- Linhas de assinatura douradas em vez de pretas pontilhadas
- Rodapé com fundo sutil azul claro

**Estrutura revisada:**
```text
┌─────────────────────────────────────────────┐
│  ████████ faixa azul escuro topo ████████   │
│  ┌─────────────────────────────────────────┐ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │         [LOGO GRANDE]             │  │ │
│  │  │                                   │  │ │
│  │  │        CERTIFICADO                │  │ │
│  │  │        de Conclusão               │  │ │
│  │  │                                   │  │ │
│  │  │     Certificamos que              │  │ │
│  │  │     ═══ João da Silva ═══         │  │ │
│  │  │                                   │  │ │
│  │  │     concluiu com êxito            │  │ │
│  │  │     Nome do Curso                 │  │ │
│  │  │                                   │  │ │
│  │  │   Emissão: xx/xx    Carga: xxh    │  │ │
│  │  │                                   │  │ │
│  │  │   ________    ________            │  │ │
│  │  │   RH            Diretor           │  │ │
│  │  │                                   │  │ │
│  │  │   Código: CERT-XXXX               │  │ │
│  │  └───────────────────────────────────┘  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Arquivo editado
- `src/components/university/CertificatePDF.tsx` — redesign completo dos estilos

