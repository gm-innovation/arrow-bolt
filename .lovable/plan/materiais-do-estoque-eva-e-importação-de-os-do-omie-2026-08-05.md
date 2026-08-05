# Materiais do estoque (Eva) e importação de OS do Omie

Dois fluxos ainda não testados, mais um ajuste que o teste já mostra ser necessário.

## O que confirmei no sistema

- Nenhuma OS teve materiais registrados até hoje (a tabela de materiais da OS está vazia) — o fluxo nunca foi exercitado.
- A busca de materiais no Eva por número de OS só acontece dentro do **relatório do técnico**: ao abrir a seção de Materiais, se a lista estiver vazia, o sistema consulta o Eva automaticamente.
- Na **medição final do coordenador** existe apenas o botão "Importar materiais da OS", que lê o que já foi trazido antes. Se o técnico nunca abriu a seção de materiais no relatório, o coordenador fecha a OS sem os materiais que Suprimentos lançou no Eva. Isso contraria a regra que você descreveu.
- O Omie está habilitado só na Lecsor; a empresa de testes não tem credenciais, então o botão "Importar do Omie" nem aparece lá. Há OS reais já importadas (4722, 4706) para usar como referência de leitura.

## Etapa 1 — Testar a integração de materiais do Eva

1. Consultar a API do Eva por número de OS (leitura) e confirmar se responde e com quais campos.
2. Com uma OS de teste cujo número exista no Eva: abrir o relatório como técnico, verificar a importação automática, marcar/desmarcar "utilizado", ajustar quantidade e adicionar um material manual.
3. Conferir no banco se os materiais gravaram com origem, valor unitário e quantidade corretos.
4. Como coordenador, abrir a medição final e importar os materiais, checando markup e o total refletido no fechamento.
5. Se o número da OS de teste não existir no Eva, registro isso como limitação e valido o restante (manual + importação para a medição) com dados inseridos manualmente.

## Etapa 2 — Puxar materiais do Eva no fechamento do coordenador

Ajuste para o fluxo real (Suprimentos lança no Eva → coordenador fecha):

- Botão "Buscar materiais no Eva" na aba de Materiais da medição, usando o número da OS.
- Ao abrir a medição sem materiais registrados, buscar no Eva automaticamente, igual ao relatório do técnico.
- Aviso quando a embarcação retornada pelo Eva divergir da embarcação da OS (comportamento que já existe no relatório).

## Etapa 3 — Testar a importação da OS do Omie (Lecsor, somente leitura)

1. Consultar no Omie um número de OS real da Lecsor pela função de integração, sem gravar nada.
2. Verificar o que volta: cliente, embarcação, descrição do serviço e os campos extraídos por IA (data/hora, local, solicitante, supervisor, coordenador, técnicos, tipos de tarefa).
3. Validar na interface: abrir "Nova Ordem de Serviço" como coordenador da Lecsor, usar "Importar do Omie" com esse número e confirmar que o modal é populado (número da OS, cliente, embarcação, data, pessoas e tipos de tarefa) — **sem salvar a OS**.
4. Testar o negativo: número inexistente e rate-limit do Omie, conferindo as mensagens de erro.
5. Registrar cada campo que o Omie traz mas o formulário não aproveita, e cada campo que fica em branco.

## Etapa 4 — Relatório

Relatório único com: o que funcionou, o que falhou, evidências (telas e conferência no banco) e correções aplicadas.

## Notas técnicas

- Testes com Playwright em cima do preview local; asserções conferidas direto no banco.
- Etapa 3 usa a conta real da Lecsor apenas em leitura (consulta do Omie e preenchimento do modal), sem criar OS nem enviar anexos ao Omie.
- O ajuste da Etapa 2 fica em `src/components/admin/measurements/MaterialsTab.tsx` reaproveitando os hooks `useEvaMaterials` e `useOsMaterials`; sem mudança de banco.
- A chamada duplicada em `useEvaMaterials` (um `functions.invoke` sem uso antes do `fetch`) será removida.
