# Importação da planilha de colaboradores ativos (2026)

Planilha recebida: 33 colaboradores, 21 colunas. Regra combinada: **a planilha manda** em caso de conflito.

## Situação atual no sistema

- 58 registros de colaboradores; 38 já têm CPF e data de nascimento.
- **Data de admissão preenchida em apenas 1 de 58.**
- Estado civil e escolaridade estão todos em "não informado".
- Tabelas de **contatos, endereços, contatos de emergência, documentos de identificação e dependentes estão vazias (0 registros)**.
- Catálogo de **funções (cargos) está vazio**; setores existem, mas faltam: Coordenação, Engenharia, Laboratório, Recepção e Gestão de Pessoas.

## O que será importado

Para cada um dos 33 colaboradores da planilha:

| Bloco | Campos |
|---|---|
| Pessoal | Data de nascimento, estado civil, escolaridade, tem filhos / quantidade |
| Profissional | Data de admissão, setor, função + nível (ex.: "TEC. EM ELETRONICA III - C" → função "Tec. em Eletrônica III", nível "C") |
| Documentos | RG, CPF, CNH |
| Contatos | Telefone e e-mail corporativos, telefone e e-mail pessoais |
| Emergência | Telefone de emergência (com nome quando indicado na célula, ex.: "Leandro") |
| Endereço | Logradouro/número, bairro, cidade, estado, CEP |

## Regras de tratamento dos dados

- **Casamento de registro:** por CPF (só dígitos); se não houver, por nome completo normalizado (sem acentos, maiúsculas). Nenhum colaborador novo é criado sem confirmação — divergências entram em relatório.
- **Datas:** `dd/mm/aaaa` convertido com construtor local de data, sem fuso. A coluna "TEMPO DE ADMISSÃO" é ignorada (é cálculo derivado).
- **Filhos:** texto livre normalizado ("Sim, três" → 3; "Não"/"0"/"Nao" → 0; "01 filho" → 1). Grava indicador + quantidade; não cria dependentes individuais (a planilha não traz nomes deles).
- **CNH:** valores como "n/a", "..", "-", "Não possuo", "Não tenho", "B", "Sim (B)" não são número de habilitação — não viram registro de CNH; quando indicam apenas categoria, a categoria é registrada.
- **RG:** normalizado; casos em que a planilha repete o CPF na coluna RG (ex.: José Rosa) são sinalizados no relatório e o RG fica em branco.
- **Telefones:** só dígitos + DDD; anotações dentro da célula (nomes, segundo número) são preservadas em observação do contato.
- **Endereço:** "Bairro / Estado" é dividido em bairro, cidade e UF com heurística (RJ como padrão apenas quando explícito na célula); casos ambíguos vão para o relatório.
- **Setores e funções:** setores faltantes são criados; cada função distinta é criada no catálogo de cargos com o nível separado.
- **Auditoria:** as alterações passam pelos gatilhos existentes, portanto ficam registradas na aba Histórico / Auditoria de dados sensíveis de cada colaborador.

## Como será executado

1. Script de conferência (somente leitura) que casa a planilha com a base e produz o relatório: quantos casaram por CPF, por nome, e quais não casaram.
2. Ajuste dos catálogos (setores faltantes + funções).
3. Gravação dos dados dos 33 colaboradores nas tabelas de cadastro, contatos, emergência, endereço e documentos.
4. Verificação final por amostragem na ficha do colaborador (abas Pessoal, Profissional e Documentos).

## Detalhes técnicos

- Normalização e parsing implementados em um script de importação, com dados inseridos via migração/inserções idempotentes (chave: colaborador + tipo de contato/documento) para permitir reexecução sem duplicar.
- Alvos: `profiles` (pessoais, admissão, setor, cargo, nível, RG/CPF), `hr_positions` (catálogo de funções), `departments` (setores faltantes), `hr_employee_contacts`, `hr_emergency_contacts`, `hr_employee_addresses`, `hr_employee_identity_documents` (RG/CPF/CNH).
- Enums usados: `hr_marital_status`, `hr_education_level`, `hr_contact_kind`, `hr_contact_category`, `hr_address_kind`.
- Nenhuma alteração de RLS é necessária: todas as tabelas já existem com políticas ativas.
