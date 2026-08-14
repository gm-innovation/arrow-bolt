# Correção: Qualidade não consegue baixar documentos de colaboradores

## Diagnóstico (confirmado no banco)

O botão "Baixar" falha por regras de armazenamento, não por bug de interface.

1. **Onde os arquivos moram**: dos 129 documentos registrados, **122 estão no armazenamento de técnicos** e apenas 7 no de documentos corporativos.
2. **A regra de leitura do armazenamento de técnicos** exige que o usuário consiga consultar o cadastro de técnicos da empresa. Esse cadastro só é visível para RH, coordenador, admin e gestor — **Qualidade não está na lista**. Resultado: para os 122 arquivos, a Qualidade recebe recusa de permissão e a tela mostra "Erro ao baixar". (Rayane Silva tem exclusivamente o papel `qualidade`.)
3. **A regra específica de liberação (a que já contempla Qualidade) tem semântica invertida**: ela exige que exista um registro de liberação para o par colaborador/tipo, mas a tabela hoje guarda apenas **exceções de bloqueio** — a listagem da tela usa "liberado por padrão, salvo bloqueio". Só existem 5 registros antigos, então essa regra praticamente nunca autoriza (afeta também coordenadores nos arquivos corporativos).
4. **A tela não informa o armazenamento do documento** ao pedir o link: o dado existe na tabela mas não é retornado pela consulta usada na tela, então o link é tentado primeiro no armazenamento errado.

## O que será feito

1. **Alinhar a regra de permissão de leitura à regra da listagem**: liberação é o padrão para os tipos marcados como compartilháveis; a autorização só é negada quando existe **bloqueio ativo** para aquele colaborador/tipo (ou quando o tipo não é compartilhável). Papéis autorizados seguem sendo coordenador, admin e qualidade, sempre dentro da mesma empresa. Pacotes ativos próprios continuam valendo como via alternativa de acesso.
2. **Cobrir o armazenamento de técnicos**: nova regra de leitura para esse armazenamento usando a mesma função de permissão dos documentos liberados, sem tocar nas regras existentes de técnicos/RH.
3. **Enviar o armazenamento correto no download**: a listagem passa a trazer o armazenamento de cada documento e a tela repassa essa informação ao gerar o link, evitando tentativa no lugar errado.
4. **Mensagens em pt-BR**: manter/usar as mensagens traduzidas já existentes (arquivo não encontrado x sem permissão) no lugar do erro cru.

## Segurança

Nada de acesso amplo: a Qualidade continua limitada aos tipos marcados como liberáveis pelo RH, dentro da própria empresa, e nunca aos bloqueados individualmente. Ela segue sem poder liberar tipos ou revogar bloqueios. Todo download continua registrado no log de acessos.

## Detalhes técnicos

**Banco (migração)**
- `can_coordinator_read_hr_doc`: trocar a exigência de `EXISTS` em `hr_coordinator_document_grants` por `NOT EXISTS (… is_block = true AND revoked_at IS NULL)`, somada à checagem de `hr_document_catalog.coordinator_shareable = true AND is_active = true` para o `catalog_id` do documento; manter o ramo de pacote ativo próprio e os papéis `coordinator`/`admin`/`qualidade` + mesma empresa.
- `hr_coordinator_visible_docs`: sem mudança de filtro, apenas adicionar `d.storage_bucket` no retorno (recriar com `DROP`/`CREATE` por mudança de assinatura).
- Nova policy `SELECT` em `storage.objects`: `bucket_id = 'technician-documents' AND EXISTS (select 1 from hr_employee_documents d where d.file_path = objects.name and can_coordinator_read_hr_doc(auth.uid(), d.id))` — espelho da já existente para `corp-documents`.

**Frontend**
- `src/hooks/useHRDocumentSharing.ts`: mapear `storage_bucket` no item de documento em `useCoordinatorEmployeeDocs` (e nas consultas de pacote, se aplicável) e repassá-lo em `getSignedDocUrl`.
- `src/components/hr/sharing/EmployeeDocumentsView.tsx`: passar `storage_bucket: doc.storage_bucket` no handler de download (e no de pacotes), com toast pt-BR vindo de `hrDocErrorMessage`.
- Tipagem explícita do item (sem `any` novo) nos pontos alterados.

## Validação

- Entrar como usuário de Qualidade e baixar um ASO/NR antigo (armazenamento de técnicos) e um documento enviado pela tela do RH (armazenamento corporativo).
- Conferir que um tipo bloqueado individualmente continua indisponível e que o log de acessos registra os downloads.
- Repetir um download como coordenador para garantir que o fluxo antigo segue funcionando.
