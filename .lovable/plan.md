

## Anexos de Arquivos no Modal de Nova Solicitação

### Contexto
A infraestrutura já existe: tabela `corp_request_attachments`, bucket `corp-documents` (privado), e políticas RLS configuradas. Falta apenas a interface de upload e a lógica de envio.

### Dinâmica proposta

**Upload genérico por categoria:**
- **Reembolso**: Seção "Comprovante" com upload de foto/arquivo (substituir o campo texto "referência" por um upload real + campo texto opcional para nº da nota)
- **Documento**: Cada item de documento pode ter um arquivo anexo (ex: atestado médico escaneado, certificado em PDF)
- **Geral/Outros**: Seção opcional "Anexos" para qualquer tipo de solicitação

**Fluxo técnico:**
1. Usuário seleciona arquivos localmente (estado local com `File[]`)
2. Preview dos arquivos selecionados (nome, tamanho, botão remover)
3. Ao clicar "Criar Solicitação":
   - Cria a solicitação (obtém o `request_id`)
   - Faz upload dos arquivos para `corp-documents/{company_id}/requests/{request_id}/`
   - Gera URL assinada (bucket é privado)
   - Insere registros em `corp_request_attachments`

### Alterações

1. **`src/components/corp/NewRequestDialog.tsx`**:
   - Adicionar estado `attachedFiles: File[]`
   - Seção de upload com `<input type="file" multiple accept="image/*,.pdf,.doc,.docx" />`
   - Preview dos arquivos com ícone, nome, tamanho e botão remover
   - Para **Reembolso**: Upload aparece na seção de comprovante (label "Foto do comprovante / recibo")
   - Para **Documento**: Upload aparece em cada item de documento (label "Anexar documento")
   - Para **todas as categorias**: Seção "Anexos (opcional)" no final do formulário
   - No `handleSubmit`: após criar a request, fazer upload e inserir em `corp_request_attachments`
   - Sanitizar nomes de arquivo antes do upload (padrão existente no projeto)

2. **Sem migração SQL necessária** — tabela e bucket já existem.

