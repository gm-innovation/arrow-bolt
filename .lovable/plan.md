# Correção: RH não consegue anexar ASO de colaboradores não técnicos

## Diagnóstico (confirmado)

O problema não é do setor "Administrativo" em si, e sim de **quem não é técnico**:

- Na ficha do colaborador (`/hr/employees` → painel de detalhes), o ASO de **técnicos** é anexado pela aba "Técnico", que grava no bucket `technician-documents` (122 registros existentes — funciona).
- Para os demais colaboradores, o único caminho é a aba "Docs", que envia o arquivo para o bucket `corp-documents` no caminho `{company_id}/employees/{employee_id}/{tipo}/...`.
- A regra de gravação desse bucket só aceita arquivos cuja **primeira pasta** seja o próprio usuário logado (ou `onboarding`). Como o caminho começa pelo `company_id`, o envio é recusado pela segurança e o RH vê falha no anexo.
- Consulta ao banco confirma: **nenhum** documento foi gravado com o caminho `{company_id}/employees/...`; os poucos registros em `corp-documents` (6) usam um caminho antigo, iniciado pelo id do usuário.
- Consequência secundária: mesmo se a gravação passasse, a leitura também falharia, pois a regra de leitura espera a pasta inicial como id de colaborador.

O tipo "ASO - Atestado de Saúde Ocupacional" existe e está ativo no catálogo, e as permissões da tabela de documentos já contemplam o perfil de RH. O ponto de falha é exclusivamente o caminho do arquivo x regra do armazenamento.

## O que será feito

1. **Padronizar o caminho de upload** de documentos de colaborador para começar pelo id do colaborador: `{employee_id}/hr/{tipo}/{timestamp}_{arquivo}`. Isso torna o registro compatível com as regras de leitura/exclusão já existentes e com os 6 registros antigos.
2. **Ajustar a regra de gravação do armazenamento** para permitir que RH, Diretor e Super Admin enviem arquivos na pasta de qualquer colaborador **da mesma empresa** (mantendo a permissão do próprio usuário para si e o fluxo de onboarding intacto).
3. **Manter a compatibilidade de leitura** com os registros antigos (o download já tenta o bucket alternativo), sem migrar arquivos existentes.
4. **Mensagens de erro em pt-BR**: exibir motivo claro quando o envio for recusado (hoje aparece apenas a mensagem crua do backend).
5. **Exibir a seção de ASO para todos**: na ficha do colaborador não técnico, destacar na aba "Docs" o status do ASO (vigente / a vencer / vencido) com base no documento do catálogo, para o RH ter a mesma visão que tem no técnico.

## Detalhes técnicos

- `src/hooks/useHRDocumentCompliance.ts` (`useUploadEmployeeDocument`): novo padrão de `path` e tratamento de erro traduzido.
- Migração de banco: nova policy de `INSERT` (e `DELETE` correspondente já existente é compatível) em `storage.objects` para `corp-documents`, permitindo `has_role(hr|director|super_admin)` quando a primeira pasta é um colaborador da mesma empresa (`user_company_id`). Nenhuma policy existente é removida.
- `src/components/hr/EmployeeDetailSheet.tsx` (`DocumentsTab`): badge de status do ASO no topo da aba, reutilizando os badges de validade já implementados.
- Sem alteração no fluxo de técnicos (`technician-documents`) e sem mexer no módulo `/hr/health-exams`.

## Validação

- Anexar ASO para uma colaboradora do setor Administrativo com perfil de RH e conferir gravação, badge de validade e download.
- Reanexar ASO de um técnico para garantir que o fluxo antigo segue funcionando.
- Confirmar que um colaborador comum continua sem acesso aos documentos de terceiros.
