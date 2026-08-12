# Importação da planilha de colaboradores do RH

Objetivo: carregar no Arrow os dados que a Thaís já mantém na planilha — dados pessoais, documentos de identificação, contatos, endereços e dependentes — para todos os colaboradores já cadastrados. Onde houver divergência, **a planilha vale como fonte da verdade**.

## Primeiro passo: acesso ao arquivo

Testei o link do SharePoint e ele retorna **403 Forbidden** para quem está fora do tenant — mesmo o link "compartilhado" exige sessão da Lecsor. Então preciso do arquivo anexado aqui.

Formato preferido, em ordem:

1. **CSV UTF-8** (`Arquivo > Exportar > Baixar como CSV UTF-8`). É o mais confiável: preserva acentos, ignora formatação e não perde os zeros à esquerda de CPF/CEP quando lido como texto. Se a planilha tiver várias abas, exporte **uma por aba**, pois o CSV salva só a aba ativa.
2. **XLSX** (`Baixar uma cópia`), caso haja muitas abas — leio todas de uma vez.

Evitar PDF e ODS: PDF perde a estrutura de colunas e ODS dá mais trabalho na leitura.

Nada de importação acontece antes de eu ler a planilha real — a definição das colunas depende do conteúdo dela.


## Etapas depois de ter o arquivo

### 1. Leitura e mapa de colunas
Leio todas as abas, listo as colunas encontradas e monto um mapa coluna → campo do Arrow, apresentado para sua conferência antes de qualquer escrita. Campos previstos:

- **Pessoais** (ficha do colaborador): data de nascimento, estado civil, escolaridade, nacionalidade, naturalidade, nome da mãe/pai, sexo, admissão.
- **Identificação**: CPF, RG (órgão/UF/emissão), PIS, CTPS, título de eleitor, CNH (categoria/validade), reservista.
- **Contatos**: telefone, celular, WhatsApp, e-mail pessoal e corporativo, contato de emergência (nome, parentesco, telefone).
- **Endereço**: CEP, rua, número, complemento, bairro, cidade, UF.
- **Dependentes**: nome, parentesco, data de nascimento, CPF.

### 2. Casamento com os colaboradores existentes
Ordem de identificação: **CPF** (sem máscara) → matrícula, se houver → nome completo normalizado (sem acentos, maiúsculas). Linhas que não casarem com ninguém não são inventadas como novo cadastro: entram num relatório de pendências para o RH decidir.

### 3. Validação antes de gravar
CPF validado por dígito verificador, datas convertidas sem deslocamento de fuso, telefones e CEP normalizados, textos livres (estado civil, escolaridade, parentesco) traduzidos para as opções fixas do sistema. Valor que não se encaixa em nenhuma opção vira pendência em vez de virar lixo no banco.

### 4. Gravação
Planilha manda: campo preenchido na planilha sobrescreve o valor atual no Arrow. Campo vazio na planilha **não apaga** o que já existe. Contatos, endereços e dependentes são atualizados por chave natural (tipo do contato, endereço principal, nome do dependente) para não duplicar registros.

Como o histórico já está ativo, as alterações de dados sensíveis ficam registradas na aba **Histórico > Auditoria**, e mudanças de setor/função/gestor geram movimentação. A carga será marcada com origem "importação de planilha" para diferenciar de edição manual.

### 5. Relatório final
Ao terminar, entrego um resumo: quantos colaboradores atualizados, quantos campos por bloco, linhas não identificadas, valores rejeitados na validação e divergências sobrescritas (antes → depois), para a Thaís revisar.

## Detalhes técnicos

- Leitura da planilha com pandas/openpyxl no sandbox; nenhum binário da planilha entra no repositório.
- Escrita via operações de dados (não migração): `UPDATE public.profiles` e upsert em `hr_employee_identity_documents`, `hr_employee_contacts`, `hr_emergency_contacts`, `hr_employee_addresses`, `hr_employee_dependents`, todos com `company_id` da empresa correspondente.
- Enums envolvidos: `hr_marital_status`, `hr_education_level`, `hr_contact_kind`, `hr_contact_category`, `hr_address_kind`, `hr_dependent_relation`.
- Triggers de auditoria existentes (`hr_profiles_audit_sensitive`, `hr_id_docs_audit`, `hr_addresses_audit`) registram tudo automaticamente; nenhuma alteração de schema é necessária.
- Carga executada em lote idempotente, para poder repetir com uma planilha atualizada sem duplicar registros.
