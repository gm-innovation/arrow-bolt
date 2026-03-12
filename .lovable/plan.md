

## Correções no Certificado PDF

### Problemas identificados
1. **Conteúdo transbordando para 2 páginas** — margens, paddings e espaçamentos excessivos fazem o conteúdo não caber em 1 página landscape
2. **Nome da empresa redundante** — já tem a logo, não precisa repetir "EMPRESA: ..." nos detalhes nem no rodapé
3. **Visual pobre** — espaçamentos desproporcionais, assinaturas com nomes genéricos repetidos

### Alterações em `src/components/university/CertificatePDF.tsx`

**Remover:**
- O item "EMPRESA" da linha de detalhes (detailsRow)
- O texto `{companyName} — Universidade Corporativa` do rodapé (manter só o código de validação, centralizado)

**Ajustar espaçamentos para caber em 1 página:**
- Reduzir `margin` da borda externa (20 → 15)
- Reduzir `padding` da borda externa (40 → 25)
- Reduzir `padding` da borda interna (30 → 20)
- Reduzir `marginBottom` do subtítulo (30 → 15)
- Reduzir `marginBottom` do userName (20 → 12)
- Reduzir `marginBottom` do courseName (16 → 10)
- Reduzir `marginBottom` do detailsRow (24 → 14)
- Reduzir `height` da signatureLine (30 → 20)
- Reduzir `marginBottom` e `marginTop` das assinaturas
- Logo menor (160×60 → 120×45)

**Rodapé:** apenas código de validação centralizado

