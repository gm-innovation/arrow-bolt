
# Plano — Adendo v4.1 + Manual v5 do SGQ Arrow

Dois PDFs entregues em `/mnt/documents/`, escritos para o **time de Qualidade**, com passo-a-passo textual, **links reais** para o app em produção e **capturas anotadas** (setas/realces) sobre os botões mencionados.

## Entregáveis

1. `adendo-sgq-arrow_v4.1.pdf` — 8–12 páginas, só o que mudou desde o v4.
2. `manual-uso-sgq-arrow_v5.pdf` — manual completo consolidado, substitui o v4.

Ambos com: capa, sumário interno clicável, hyperlinks para rotas de `https://arrow.googlemarineinnovation.com.br`, cabeçalho/rodapé com versão e data, paleta e logo do Arrow.

## O que significa "clicável" (sem invenção)

- **Sumário clicável**: âncoras internas via ReportLab Platypus.
- **Links externos**: cada instrução do tipo "abra Qualidade > Documentos" é um hyperlink que abre `https://arrow.googlemarineinnovation.com.br/quality/documents` no navegador do leitor.
- **Capturas anotadas**: screenshots reais do app (Playwright) com setas/círculos/números desenhados por cima usando Pillow, apontando para o botão/campo citado no texto ao lado.

PDF em si não executa nada dentro do app — isso é o limite técnico.

## Escopo de conteúdo (por seção, com rota + captura + anotação)

### 1. Governança documental
- Responsável pelo documento (Novo doc + Editar metadados) → `/quality/documents`
- Cópia Controlada vs Não Controlada + default por Tipo → `/quality/documents/settings`
- Editar Próxima Revisão (metadados + publish de nova versão) → `/quality/documents/:id`
- Recalcular próxima revisão (legado)
- Marcar como Obsoleto (motivo obrigatório ≥10 chars, log, restrição de acesso)
- Upload ampliado (Word/Excel/PPT/CSV, 50 MB) + aviso ao baixar Office

### 2. Compartilhamento
- Link público com token, expiração, limite de uso, revogação, contador → botão Compartilhar em `/quality/documents/:id`
- Rota pública `/q/:token` com marca d'água

### 3. Fila central de aprovações
- Exibição de erro real em vez de "Sem aprovações pendentes" → `/quality/central-approvals`

### 4. Contexto Organizacional (ISO §4)
- SWOT por Departamento + Período → `/quality/org-context`
- Partes Interessadas: campos Poder/Interesse/Próxima revisão + Matriz Poder × Interesse → `/quality/interested-parties`
- Vínculos tipados Parte ↔ Processo (Cliente, Fornecedor, Fiscaliza, Recebe informação, Executa, Impacta, Influencia + relevância)
- Processo como Hub (abas Documentos e Partes) → `/quality/processes`
- Documento ↔ Processo (campo em Editar metadados)

### 5. Conscientização (§7.3)
- Participantes externos (nome/empresa/email) → `/quality/awareness`
- Confirmar ciência em Minha Conta → `/account` (aba Conscientizações)
- % ciência no dashboard

### 6. Autorização Master SGQ
- Política aditiva `qms_master_full_access` em 25 tabelas para `qualidade` e `super_admin` (texto explicativo, sem tela)

### 7. Reorganização de menus (v4 → v5)
- Grupo Suprimentos & Fornecedores (Provedores Externos + Homologação)
- Grupo Metrologia (Calibração de Instrumentos)
- Captura da sidebar antes/depois

## Estrutura dos documentos

**Adendo v4.1** — Capa • Sumário • Resumo executivo (1p) • Seções 1–7 (1–2 p cada) • Anexo: matriz "O que mudou por perfil".

**Manual v5** — Capa • Sumário • 1. Visão geral do SGQ • 2. Governança documental • 3. Compartilhamento e links públicos • 4. Aprovações e revisões • 5. Contexto Organizacional • 6. Partes Interessadas e Matriz • 7. Processo como hub • 8. Conscientização • 9. Menus e navegação • 10. Perfis e permissões (nota Master SGQ) • Anexo A: Glossário • Anexo B: Changelog v4 → v5.

## Como as capturas são obtidas

Playwright headless no localhost:8080 com sessão do usuário injetada, viewport 1280×1800. Uma captura por funcionalidade (~15 telas), salvas em `/tmp/browser/manual-v5/screenshots/`. Depois, Pillow desenha sobre cada uma:

- círculos vermelhos ao redor dos botões citados
- setas apontando do texto para o alvo
- números correspondentes aos passos do texto ao lado

Coordenadas dos alvos capturadas via `element.bounding_box()` do Playwright — sem chute.

Rotas cobertas:
```text
/quality/documents  (lista + Novo doc + Editar metadados)
/quality/documents/:id  (visualizador + Compartilhar + histórico)
/quality/documents/settings  (default_control_mode por tipo)
/quality/central-approvals
/quality/org-context  (SWOT com filtros)
/quality/interested-parties  (aba Matriz)
/quality/processes  (drawer hub)
/quality/awareness
/account  (aba Conscientizações)
Sidebar Qualidade (Suprimentos + Metrologia)
```

Se alguma rota não estiver navegável para o usuário logado no ambiente sandbox, uso captura da rota mais próxima e cito o motivo no rodapé da imagem — sem forjar tela.

## Geração dos PDFs

- Python + ReportLab (Platypus).
- Fontes com suporte a acentos (DejaVu Sans / DejaVu Serif) — sem quadrados pretos.
- Paleta importada de `src/index.css` do projeto para consistência visual.
- Sumário via `TableOfContents` do Platypus (âncoras internas clicáveis).
- Hyperlinks externos via tag `<link href="https://…">` dentro de Paragraph.
- Cabeçalho com logo Arrow (extraído de `public/`), rodapé com "Manual SGQ Arrow · v5 · 01/07/2026 · pág X/Y".

## QA obrigatório

Após cada PDF: `pdftoppm -jpeg -r 150` e inspeção página a página. Checklist: overflow de texto, clipping, contraste, setas na posição certa, links no lugar certo, sumário funcionando. Corrijo e regenero até passar. Reporto no final o que verifiquei.

## Ordem de execução (após aprovação)

1. Auditar cores/logo/tokens do app.
2. Playwright: navegar cada rota, capturar screenshot + bounding boxes dos alvos.
3. Pillow: anotar cada screenshot com setas/círculos numerados.
4. Gerar `adendo-sgq-arrow_v4.1.pdf` + QA visual.
5. Gerar `manual-uso-sgq-arrow_v5.pdf` + QA visual.
6. Publicar em `/mnt/documents/` com tags `presentation-artifact`.
