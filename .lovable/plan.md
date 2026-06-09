## Objetivo
Entregar um **ZIP** com **um PDF de exemplo por modelo** dos 7 templates de PDF que a área de Qualidade já implementa no app, todos preenchidos com dados fictícios realistas para que você veja exatamente como cada documento sai impresso.

## Modelos incluídos (7 PDFs)

| # | Arquivo de saída | Modelo de origem | Para que serve |
|---|---|---|---|
| 1 | `01_documento_controlado.pdf` | `QualityDocumentPDF.tsx` | Procedimento / Política / Instrução de Trabalho gerada do editor rich-text, com cabeçalho, marca d'água e rodapé |
| 2 | `02_frame_cabecalho_rodape.pdf` | `ControlledDocPdfFrame.tsx` | Demonstração isolada da moldura ISO (logo, código, revisão, carimbo de cópia controlada, marca d'água, assinaturas) |
| 3 | `03_certificado_afericao.pdf` | `CalibrationCertificatePdf.tsx` | Certificado de Aferição de instrumento (ISO 9001 §7.1.5) com tabela de pontos de verificação |
| 4 | `04_rnc.pdf` | `NcrFormalPdf.tsx` | Registro de Não Conformidade (ISO 9001 §10.2) com 5W2H, causa raiz e plano de ação |
| 5 | `05_plano_qualidade.pdf` | `QualityPlanPdf.tsx` | Plano da Qualidade do projeto/processo |
| 6 | `06_registro_normas.pdf` | `NormsRegisterPdf.tsx` | Lista mestra de normas aplicáveis (ISO, NR, regulamentos) |
| 7 | `07_glossario_termos.pdf` | `TermsGlossaryPdf.tsx` | Glossário de Termos e Definições do SGQ |

## Como vou produzir

1. Ler os 7 componentes em `src/components/quality/pdf/*` e `QualityDocumentPDF.tsx` para extrair fielmente layout, estilos, seções, cores e textos fixos (cabeçalho ISO, carimbos, marca d'água, blocos de assinatura).
2. Escrever um script Python em `/tmp/gen_quality_pdfs.py` que usa **reportlab** para reproduzir cada layout em A4 portrait com os mesmos blocos visuais dos componentes React-PDF (mesmas seções numeradas, mesmas labels em PT-BR, mesma identidade visual: tons azul `#1d4ed8`, verde `#15803d`, vermelho `#b91c1c`).
3. Preencher cada PDF com **dados fictícios coerentes** (ex.: RNC-0042 sobre desvio de calibração, certificado de paquímetro Mitutoyo, plano da qualidade de docagem, etc.) para que o exemplo seja autoexplicativo.
4. Renderizar cada PDF em `/tmp/quality_pdfs/` e gerar um ZIP final em `/mnt/documents/sgq-modelos-pdf.zip`.
5. **QA visual obrigatório**: rodar `pdftoppm` em cada um dos 7 PDFs e inspecionar todas as páginas verificando margens, sobreposição de texto, cortes, tabelas estouradas e contraste do carimbo/marca d'água. Corrigir e regerar até passar limpo.
6. Entregar com `<presentation-artifact>` apontando para o ZIP.

## Aceite
- ZIP com exatamente 7 PDFs nomeados conforme tabela.
- Cada PDF abre, cabe em A4 portrait, header/footer fixos em todas as páginas, marca d'água legível quando aplicável, dados de exemplo preenchidos.
- Nada é alterado no código do app — é apenas geração de artefatos.
