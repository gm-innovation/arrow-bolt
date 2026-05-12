## Problema

No diálogo "Converter em oportunidade", o campo **Cliente** já tem um seletor com busca, mas:

1. A busca vem pré-preenchida com o nome que o lead digitou (ex: "Googlemarine Eletrônica Naval"). Se esse nome não bate exatamente com o cadastro ("Googlemarine"), a lista aparece **vazia** e parece que não há clientes.
2. Não fica claro que o usuário pode **apagar a busca e procurar por outro nome**, nem há atalho para usar a sugestão do lead como busca.
3. Quando vazio, mostramos só os 100 primeiros sem indicar isso.

## Mudanças (apenas em `src/pages/commercial/SiteLeads.tsx`)

1. **Não pré-preencher a busca** com `lead.company_name`. Abrir o picker já mostrando todos os clientes ordenados por nome.
2. **Mostrar a sugestão do lead acima do campo de busca dentro do popover**, como um botão clicável: *"Sugestão do lead: Googlemarine Eletrônica Naval — buscar"*. Ao clicar, preenche o campo de busca com esse texto (o comercial pode então editar/encurtar até achar o cliente real).
3. **Melhorar o estado vazio**: quando a busca não encontra nada, mostrar:
   - "Nenhum cliente com esse nome."
   - Botão "Limpar busca" (volta a listar todos).
   - Link "Cadastrar novo cliente" (já existe).
4. **Indicador de lista parcial**: quando há mais de 100 resultados, mostrar rodapé "Mostrando 100 de N — refine a busca".
5. **Permitir buscar por trechos**: a busca já é `includes` case-insensitive, mantemos. Adicionar match também por **CNPJ** (carregar `id, name, cnpj` e buscar nos dois campos) — útil quando o lead manda o nome comercial e o cadastro está pela razão social.
6. Manter o texto de "Sugestão do lead" abaixo do campo (fora do popover) apenas quando nenhum cliente foi selecionado, com link para cadastrar.

Sem mudanças em banco, edge functions ou outras telas.