

## Gerar Certificados PDF na Universidade Corporativa

Atualmente os certificados são apenas registros no banco (código + data), sem um PDF visual que o colaborador possa baixar. Vamos criar um certificado PDF bonito usando `@react-pdf/renderer` (já instalado no projeto).

### Alterações

**1. `src/components/university/CertificatePDF.tsx`** — Novo componente PDF do certificado:
- Layout paisagem (A4 landscape) com bordas decorativas
- Logo da empresa (reutilizando padrão do `CompanyHeader`)
- Texto: "Certificado de Conclusão"
- Nome do colaborador, título do curso, data de emissão
- Código do certificado para validação
- Estilo profissional com cores da marca

**2. `src/pages/corp/MyLearning.tsx`** — Adicionar botão "Baixar Certificado" em cada card de certificado:
- Usa `pdf().toBlob()` do `@react-pdf/renderer` para gerar o PDF
- Trigger de download automático via link temporário
- Precisa buscar dados do perfil do usuário (nome) e da empresa (logo, nome)

**3. `src/hooks/useUniversity.ts`** — Adicionar query para buscar dados necessários para o certificado (nome do usuário, dados da empresa)

### Dados necessários no certificado
- Nome completo do colaborador (de `profiles`)
- Título do curso (já disponível via `course.title`)
- Data de emissão (`issued_at`)
- Código do certificado (`certificate_code`)
- Nome e logo da empresa (de `companies`)
- Carga horária do curso (`duration_minutes`)

### Arquivos
- **Novo:** `src/components/university/CertificatePDF.tsx`
- **Editado:** `src/pages/corp/MyLearning.tsx` — botão de download
- **Editado:** `src/hooks/useUniversity.ts` — query de dados da empresa para o certificado

