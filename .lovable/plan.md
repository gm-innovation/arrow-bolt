

## Certificado: Preview com dados fictícios + Assinaturas RH/Diretor

### Problema
Não existe forma de visualizar o modelo do certificado sem ter um curso concluído. Além disso, o certificado atual não possui campos de assinatura do RH e do Diretor.

### Solução

**1. Botão "Pré-visualizar Modelo" na página HR University**
- Adicionar um botão no painel de administração (`src/pages/hr/University.tsx`) que gera um certificado com dados fictícios e exibe num modal usando `PDFCanvasViewer`
- Dados de exemplo: "João da Silva", "Curso de Exemplo", data de hoje, código "CERT-EXEMPLO-2026"

**2. Adicionar assinaturas ao certificado PDF**
- No `CertificatePDF.tsx`, adicionar uma seção de assinaturas entre os detalhes e o rodapé
- Duas linhas de assinatura lado a lado: **Responsável RH** e **Diretor(a)**
- Props novas: `hrSignerName` e `directorSignerName` (nomes que aparecem abaixo da linha de assinatura)
- Layout: linha horizontal pontilhada + nome + cargo abaixo

**3. Buscar nomes do RH e Diretor para preencher automaticamente**
- No hook `useCertificateUserData`, buscar também o nome do RH e do Diretor da empresa (via `user_roles` + `profiles`)
- Passar esses nomes ao gerar certificados reais e na pré-visualização

### Arquivos
- **Editado:** `src/components/university/CertificatePDF.tsx` — adicionar seção de assinaturas
- **Editado:** `src/pages/hr/University.tsx` — botão de pré-visualizar modelo com modal
- **Editado:** `src/hooks/useUniversity.ts` — buscar nomes do RH e Diretor
- **Editado:** `src/pages/corp/MyLearning.tsx` — passar nomes dos assinantes
- **Editado:** `src/hooks/useUniversityCompletion.tsx` — passar nomes dos assinantes ao gerar PDF do feed

