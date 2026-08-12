# Cadastro de Colaboradores — estrutura completa (Fase 1)

## Situação atual (verificada)

- Os dados do colaborador vivem hoje em `profiles`, com campos soltos: `cpf`, `rg`, `birth_date`, `hire_date`, `position` (texto livre), `nationality`, `emergency_contact_name`, `emergency_contact_phone`, `direct_manager_id`, `status`.
- Não existem: estado civil, escolaridade, órgão/UF do RG, CNH, endereço, dependentes, matrícula, tipo de vínculo, código de origem, data de desligamento.
- Setor existe como `departments` + `department_members` (sem código, centro de custo ou responsável de escala). Função **não** tem catálogo — é texto em `profiles.position`.
- Contatos: apenas `profiles.phone` e `profiles.email` (um de cada, sem tipo/categoria).
- Já existem e serão reaproveitados: `hr_employee_documents` + `hr_document_catalog` (documentos digitalizados com validade e revisão), `hr_vacation_periods` / `hr_vacation_requests` (férias), `technicians` (dados clínicos e ASO de técnicos).
- Dados sensíveis de `profiles` já são protegidos (leitura restrita a self/RH/diretoria; view `profiles_public` para nomes).

Decisões confirmadas: todo colaborador tem login no Arrow (o cadastro continua ancorado em `profiles`/usuário); a fase 1 cobre o bloco "Obrigatório + Recomendado".

## O que será construído

### 1. Catálogos auxiliares
- `hr_positions` (funções): nome, código, CBO, nível (I-A…I-D), setor relacionado, exige CNH + categoria, exige certificação, ativa.
- Extensão de `departments`: código, centro de custo, permite ausências simultâneas, limite de ausentes simultâneos.
- Estado civil e escolaridade como listas controladas (enums), com opção "não informado".
- Tela de manutenção em Configurações do RH (setores e funções).

### 2. Cadastro principal
Novos campos no colaborador: nome social, órgão e UF do RG, estado civil, escolaridade, naturalidade, código de origem (QTD da planilha), matrícula, tipo de vínculo (CLT/estágio/aprendiz/temporário/PJ), setor e função por referência ao catálogo, nível da função, data de início na função, data e motivo de desligamento, observações cadastrais (restritas ao RH), status controlado (ativo, em_férias, afastado, licença, desligado, inativo, cadastro_pendente).
- Status nunca digitado livremente: atualizado por ação autorizada do RH ou por evento (férias aprovadas, desligamento).
- "Tempo de admissão" e idade sempre calculados na exibição, nunca armazenados.

### 3. Entidades relacionadas (novas tabelas)
- **Contatos** — vários por colaborador: tipo (telefone, celular, WhatsApp, e-mail), categoria (corporativo/pessoal), valor, principal, verificado, data de verificação.
- **Contatos de emergência** — nome, relação, telefone principal e alternativo, e-mail, principal, observações (permite mais de um).
- **Endereços** — logradouro, número, complemento, bairro, cidade, UF, CEP, país, tipo, principal e **endereço original completo** preservado da planilha.
- **Dependentes** — nome, parentesco, nascimento, CPF, deficiência, marcadores de benefício/imposto/plano de saúde, inclusão/encerramento. No cadastro principal ficam `possui_dependentes` e `quantidade_dependentes` (o que a planilha permite migrar).
- **Documentos de identificação** — tipo (CPF, RG, CNH, CTPS, PIS, título, reservista…), número, órgão, UF, emissão, validade, categoria (CNH), verificado por/quando, status (pendente/válido/vencido/rejeitado). O arquivo digitalizado continua em `hr_employee_documents` (vínculo entre os dois).
- **Histórico profissional** — setor/função/gestor anteriores e novos, vigência início/fim, motivo (promoção, transferência, reorganização), usuário responsável. Preenchido automaticamente por gatilho quando setor, função ou gestor mudam — sem sobrescrever.
- **Auditoria de dados sensíveis** — toda alteração de CPF, RG, CNH, endereço e contatos grava quem alterou, valor anterior e novo, data/hora, motivo e origem (manual, importação, integração).

### 4. Interface
- **Ficha do colaborador** (`EmployeeDetailSheet`) reorganizada em abas: Pessoal, Profissional, Contatos, Endereço, Dependentes, Documentos, Acesso, Histórico, Auditoria.
- **Novo/editar colaborador** em etapas (pessoal → profissional → contatos/endereço → acesso), com validações de CPF, CEP e datas.
- **Mascaramento**: CPF/RG/CNH aparecem parcialmente mascarados, com ação "revelar" que registra o acesso no log — apenas RH, diretoria e super admin.
- **Lista de colaboradores** com filtros por setor, função, tipo de vínculo, status e pendências cadastrais.

### 5. Importação da planilha
- Tela "Importar colaboradores" no RH: upload de `.xlsx`/`.csv`, mapeamento de colunas, **pré-validação** (CPF inválido/duplicado, setor/função inexistentes no catálogo, e-mail repetido, datas inconsistentes) e prévia linha a linha antes de gravar.
- Normalizações automáticas: "Filhos?" (`Não`, `1`, `Sim, 2 filhos`) → possui/quantidade; estado civil e escolaridade para as listas controladas; nível da função extraído do sufixo (`TEC. EM ELETRONICA II - C`); endereço em texto livre preservado íntegro e quebrado quando possível.
- Como todo colaborador terá login, a importação cria o usuário com e-mail corporativo e perfil de acesso escolhido no mapeamento, ou apenas vincula quando o e-mail já existir. Linhas sem e-mail entram como `cadastro_pendente` para o RH completar.
- O link do SharePoint que você enviou exige login corporativo, então não consigo abrir o arquivo daqui: a importação será feita por você pela tela (ou anexe o arquivo no chat e eu rodo a carga dos 34 registros).

### 6. Segurança
Todas as tabelas novas com `company_id`, RLS habilitada e políticas: o colaborador vê os próprios dados; RH, diretoria e super admin veem/gerenciam os da empresa; gestor direto vê apenas dados profissionais (sem CPF/RG/CNH/endereço). Arquivos permanecem em bucket privado.

## Fora desta fase
Jornada/escala e centro de custo por colaborador, integração com folha, validação externa de CPF, notificações automáticas de vencimento, cadastro individual completo de dependentes migrado da planilha.

## Detalhes técnicos
- Migrações: novos enums (`hr_marital_status`, `hr_education_level`, `hr_employment_type`, `hr_employee_status`, `hr_document_status`); tabelas `hr_positions`, `hr_employee_contacts`, `hr_emergency_contacts`, `hr_employee_addresses`, `hr_employee_dependents`, `hr_employee_identity_documents`, `hr_employee_assignments` (histórico), `hr_sensitive_data_audit`; colunas novas em `profiles` e `departments`. Cada tabela com GRANT explícito + RLS + políticas via `has_role`, `created_at`/`updated_at` e trigger de atualização.
- Gatilho de histórico em `profiles` (setor/função/gestor) e gatilho de auditoria para campos sensíveis.
- Front: `src/hooks/useEmployeeRegistry.ts` (CRUD das novas entidades), `useHRCatalogs.ts` (setores/funções); componentes em `src/components/hr/employee/*`; nova rota `/hr/employees/import`; leitura de planilha com `xlsx` no cliente.
- `profiles_public` permanece sem PII; nenhuma nova coluna sensível é exposta nela.

## Validação
- Cadastrar um colaborador novo ponta a ponta e conferir criação do login, contatos múltiplos e documentos.
- Alterar setor e função e confirmar linha de histórico + registro de auditoria, sem perda do valor anterior.
- Importar a planilha em modo prévia e conferir os 34 registros, incluindo normalização de filhos, escolaridade e nível de função.
- Entrar como colaborador comum e confirmar que não vê dados de terceiros; como gestor, que não vê CPF/RG/CNH.
