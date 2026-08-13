# Qualidade com acesso aos documentos dos colaboradores

A Qualidade passa a ter exatamente a mesma capacidade que hoje existe para os coordenadores: consultar os documentos liberados pelo RH, baixar com registro em log e montar pacotes de compartilhamento para terceiros (estaleiro, porto, viagem, hospedagem).

## O que muda

- **Mesmo conjunto de documentos**: a Qualidade vê os tipos já marcados como liberáveis no catálogo do RH, com as mesmas exceções por colaborador (bloqueios individuais continuam valendo).
- **Nova tela na Qualidade**: "Documentos de Colaboradores", com as abas Colaboradores e Meus pacotes, idêntica à dos coordenadores — busca, download e seleção de documentos.
- **Pacotes de compartilhamento**: a Qualidade cria os próprios pacotes, com finalidade, destinatário, justificativa e validade, e enxerga somente os pacotes que ela criou.
- **Auditoria mantida**: todo download continua registrado no log de acessos, e o RH continua vendo tudo (quem acessou, quando e para quê).
- **Painel do RH**: onde hoje se lê "coordenadores", passa a constar que a liberação vale para coordenadores e Qualidade, sem alterar as marcações já feitas.

## Segurança

O banco continua sendo a autoridade final: a Qualidade só alcança documentos de tipos liberados, dentro da própria empresa, e nunca os bloqueados individualmente. Nenhuma permissão nova é dada sobre dados sensíveis fora dessa lista, e a Qualidade não pode liberar tipos nem revogar bloqueios — isso segue exclusivo de RH/Diretoria.

## Detalhes técnicos

**Banco (migração)**
- `can_coordinator_read_hr_doc`: incluir `quality` na verificação de papel, mantendo as mesmas condições (liberação por tipo, ausência de bloqueio, pacote ativo próprio).
- `hr_coordinator_visible_docs`: função permanece igual (não filtra por papel); o controle de quem chama fica na política e na rota.
- `hr_coordinator_document_grants`: política de leitura `hr_grants_select_coordinators` passa a aceitar `quality`.
- `hr_document_share_packages`: política `hr_share_pkg_coordinator_own` passa a aceitar `quality` (escopo continua `requested_by = auth.uid()`).
- `hr_document_share_items` e `hr_document_share_access_log` já derivam do pacote/autor — sem mudança.
- Política de storage `corp_storage_select_hr_coord` permanece, pois depende da função helper atualizada.

**Frontend**
- Extrair a tela `src/pages/admin/EmployeeDocuments.tsx` para um componente compartilhado (`src/components/hr/sharing/EmployeeDocumentsView.tsx`) e reusar em `/admin/employee-documents` e na nova página `src/pages/quality/EmployeeDocuments.tsx`.
- `src/App.tsx`: rota `/quality/employee-documents`.
- `src/components/DashboardLayout.tsx`: item "Documentos de Colaboradores" no menu da Qualidade.
- `src/pages/hr/DocumentSharing.tsx`: ajustar textos para "coordenadores e Qualidade".
- Sem mudanças no `useHRDocumentSharing.ts` além de textos/labels, pois os hooks já usam a RPC e o usuário autenticado.
