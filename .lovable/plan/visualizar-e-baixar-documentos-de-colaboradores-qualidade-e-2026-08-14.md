# Visualizar e baixar documentos de colaboradores (Qualidade e RH)

## Problema

1. O botão **Baixar** em `/quality/employee-documents` gera um link temporário e chama `window.open`. O navegador sai do Arrow e tenta abrir o endereço do armazenamento; no ambiente da usuária essa navegação é bloqueada pelo Chrome (`ERR_BLOCKED_BY_CLIENT`). O esperado é o navegador iniciar o salvamento do arquivo.
2. Não existe botão de **Visualizar**: hoje só há a ação de baixar, então não é possível conferir o documento antes de usá-lo.

## O que será feito

### 1. Baixar de verdade (sem abrir URL)

Buscar o arquivo como conteúdo binário (já existe `downloadHrDoc`, que resolve o armazenamento correto e cobre documentos legados de técnicos) e disparar o download pelo nome original do arquivo. Nenhuma aba nova, nenhum endereço de armazenamento exposto.

### 2. Novo botão "Visualizar" com modal

Adicionar, ao lado de Baixar, um botão de visualização que abre um modal com pré-visualização do documento:

- **PDF**: renderizado no visualizador de PDF já usado no projeto (`PDFCanvasViewer`), que funciona sem depender de plugin do navegador.
- **Imagens** (JPG/PNG): exibidas diretamente no modal.
- **Outros formatos** (Word, Excel, etc.): mensagem clara de que a pré-visualização não é possível, com botão de baixar dentro do próprio modal.
- Estado de carregamento enquanto o arquivo é buscado, e mensagens em pt-BR para arquivo inexistente ou falta de permissão.
- O modal também oferece o botão **Baixar**, para o fluxo completo em um só lugar.

### 3. Mesmo recurso para Qualidade e RH

- **Qualidade e Coordenadores**: tela compartilhada "Documentos de Colaboradores" (`/quality/employee-documents` e `/admin/employee-documents`).
- **RH**: aba de documentos na ficha do colaborador, que hoje abre o arquivo em nova aba — passa a usar o mesmo modal de visualização, mantendo o download já existente.

### 4. Auditoria preservada

Cada visualização registra a ação como consulta e cada download como download no log de acessos, com documento, colaborador e usuário responsável. Nenhuma permissão nova é concedida: valem as mesmas regras de tipos liberados, bloqueios individuais e empresa.

## Detalhes técnicos

- Novo componente `src/components/hr/sharing/DocumentPreviewDialog.tsx`: recebe `{ file_name, file_path, storage_bucket, document_id, employee_id }`, busca o blob via `downloadHrDoc`, decide entre `PDFCanvasViewer`, `<img>` (URL de objeto revogada ao fechar) e aviso de formato não suportado; expõe o botão de baixar.
- `src/hooks/useHRDocumentSharing.ts`: expor uma função de acesso a documento que retorna o blob e registra o log (`view` ou `download`), reaproveitando a lógica já existente de `getSignedDocUrl` sem depender de URL.
- `src/components/hr/sharing/EmployeeDocumentsView.tsx`: botão "Visualizar" que abre o modal; botão "Baixar" passa a usar blob + link com atributo `download`, com estado de processamento para evitar cliques repetidos.
- `src/components/hr/EmployeeDetailSheet.tsx`: substituir a abertura em nova aba pelo mesmo modal, mantendo `downloadHrDoc` no botão de baixar.
- Mensagens via `hrDocErrorMessage` (pt-BR) e toasts no padrão do projeto.

## Validação

- Perfil Qualidade: visualizar e baixar um documento do armazenamento de técnicos e outro do corporativo.
- Perfil RH: visualizar pela ficha do colaborador, sem abrir nova aba.
- Conferir que nenhuma URL de armazenamento é aberta, que o nome do arquivo baixado está correto e que os acessos aparecem no log.
- Repetir como Coordenador para garantir que a tela compartilhada não regrediu.
