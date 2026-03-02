

## Ajuste de Lógica: Anexos por Categoria

### Entendimento

- **Reembolso**: correto — anexar comprovante/recibo faz sentido
- **Abono de falta/horas**: é uma solicitação de folga/abono, e o atestado é o documento comprobatório anexado. Não é "solicitar um documento"
- **Certificados**: envio espontâneo ou em resposta a uma solicitação da empresa — não se encaixa como "nova solicitação"

### Alterações em `NewRequestDialog.tsx`

1. **Categoria `time_off`**: Adicionar seção de anexo quando o tipo for `abono`, com label "Anexar comprovante (atestado médico, etc.)" — o atestado é prova, não o objeto da solicitação

2. **Categoria `document`**: Remover "Atestado" das opções de tipo de documento (`DOCUMENT_TYPE_OPTIONS`), pois atestado é anexo de abono, não documento solicitado. Manter: Declaração, Certidão, Contrato, Contra-cheque/Holerite, Outro

3. **Remover upload de arquivo da categoria `document`**: O fluxo de "Documento" é para *solicitar* documentos ao RH/empresa (ex: declaração, holerite). Não faz sentido anexar arquivo — quem anexa é quem responde à solicitação. Remover o `FileUploadSection` dos `documentItems`

4. **Anexos gerais**: Manter a seção "Anexos gerais (opcional)" no final para casos diversos

### Resumo das mudanças

```text
time_off (abono)  → + FileUploadSection para comprovante
document          → - "Atestado" das opções
                    - Remover FileUploadSection por item
                    (solicitar documento ≠ enviar documento)
reimbursement     → sem mudança (já tem upload de recibo)
```

