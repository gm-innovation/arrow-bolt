# Revisão da importação de colaboradores

## O que a auditoria mostrou

Conferi os 34 colaboradores importados diretamente no banco. O núcleo da importação está correto:

- 34/34 com data de admissão, data de nascimento, CPF, estado civil, escolaridade, setor e função preenchidos.
- 34/34 com endereço, contato (corporativo/pessoal) e documentos criados.
- Exemplo verificado (ADRIANO MOURA VALE): admissão 16/05/2023, telefone, CPF, estado civil "casado", escolaridade "superior completo" — todos gravados. A tela que você mostrou exibia dados antigos em cache do navegador; o registro no banco está certo.

## Lacunas reais encontradas

1. **Endereços incompletos:** 25 sem cidade e 20 sem UF (a planilha traz o endereço em texto livre, sem cidade/estado). Todos têm CEP.
2. **Dependentes não criados:** 20 colaboradores marcados com dependentes (26 no total), mas nenhum registro na lista de dependentes — a planilha só informa a quantidade, não nomes/datas.
3. **Contato de emergência sem nome:** 31 registros ficaram com o nome genérico "Contato de emergência" (a planilha só traz o telefone).
4. **Documentos sem órgão emissor/UF:** RG e CNH sem órgão emissor e UF; 21 CNHs sem categoria (dados ausentes na planilha).
5. **Telefone corporativo vazio em 3 casos** (JOSE ROSA, MURILO FERREIRA YAMAMOTO, JOÃO VICTOR DA SILVA ARAÚJO) — sem telefone corporativo na planilha; existe telefone pessoal registrado.
6. **1 colaborador sem RG** na planilha.

## O que fazer

1. **Completar cidade/UF pelo CEP:** preencher cidade e estado dos 25 endereços a partir do CEP já gravado (consulta de CEP em lote, gravando só onde estiver vazio). Nada é sobrescrito.
2. **Exibir telefone pessoal quando não houver corporativo:** na ficha do colaborador, usar o telefone pessoal como fallback para não mostrar "—".
3. **Marcar pendências visíveis para o RH:** na ficha, sinalizar campos que a planilha não trouxe (nome do contato de emergência, órgão emissor do RG, categoria da CNH, dependentes cadastrados vs. quantidade informada), para o RH completar manualmente.
4. **Não inventar dados:** nomes de dependentes, órgãos emissores e nomes de contatos de emergência ficam como preenchimento manual pelo RH.

## Detalhes técnicos

- Complemento de cidade/UF via script de importação usando os CEPs de `hr_employee_addresses` (update condicional `where city is null`).
- Fallback de telefone: no componente da ficha, se `profiles.phone` estiver vazio, usar o contato pessoal de `hr_employee_contacts`.
- Indicadores de pendência: comparação entre `profiles.dependents_count` e registros em `hr_employee_dependents`, e checagem de `issuer`/`issuer_state`/`category` em `hr_employee_identity_documents`.
- A tela de colaboradores já busca todos os campos necessários; nenhuma mudança de consulta é preciso — apenas recarregar a página resolve a exibição antiga.
