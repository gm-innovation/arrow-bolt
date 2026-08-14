# Corrigir download de documentos na área da Qualidade

## Diagnóstico confirmado

O botão **Baixar** em `/quality/employee-documents` gera uma URL temporária e executa `window.open(url, "_blank")`. Por isso o navegador abandona a tela do Arrow e tenta abrir diretamente o endereço do armazenamento; no ambiente da usuária essa navegação é bloqueada pelo Chrome com `ERR_BLOCKED_BY_CLIENT`.

O projeto já possui `downloadHrDoc`, que busca o arquivo privado como `Blob` no armazenamento correto e mantém o fallback entre documentos corporativos e documentos legados de técnicos.

## Correção

1. Trocar a abertura da URL por download direto do conteúdo como `Blob`.
2. Criar um arquivo temporário no navegador e acionar um link com o atributo `download`, usando o nome original do documento; isso inicia o fluxo normal de salvamento/download sem navegar para o endereço privado.
3. Revogar a URL temporária após o disparo para não manter memória ocupada.
4. Preservar o registro de auditoria com ação `download`, incluindo documento, colaborador e usuário responsável.
5. Manter as mensagens em português para arquivo inexistente, falta de permissão e demais falhas.
6. Desabilitar o botão e exibir estado de processamento durante o download, evitando cliques duplicados.

## Arquivos envolvidos

- `src/hooks/useHRDocumentSharing.ts`: disponibilizar uma operação de download em blob com o mesmo registro de auditoria já usado no fluxo atual.
- `src/components/hr/sharing/EmployeeDocumentsView.tsx`: usar o blob para iniciar o download pelo nome original, sem `window.open`.

A correção valerá para a tela compartilhada por **Qualidade e Coordenadores**, mantendo comportamento consistente nos dois perfis.

## Validação

- Entrar com perfil de Qualidade e baixar um documento de `technician-documents` e outro de `corp-documents`.
- Confirmar que nenhuma nova aba/endereço do armazenamento é aberto e que o navegador inicia o salvamento/download com o nome correto.
- Confirmar que o arquivo baixado abre normalmente e que o acesso aparece no log de auditoria.
- Repetir como Coordenador para evitar regressão no componente compartilhado.