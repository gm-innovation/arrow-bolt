# Painel de RH: mostrar todos os documentos irregulares

## O que está acontecendo

O painel não está errado no cálculo — ele está cortando a exibição. O card "Documentos Irregulares" conta 25 pendências (vencidas ou vencendo em 30 dias), mas a lista logo abaixo exibe apenas os 5 primeiros itens, sem qualquer indicação de que há mais. Como um colaborador pode ter mais de um documento irregular, 5 linhas podem representar apenas 3 ou 4 pessoas — daí a impressão de que a lista de colaboradores (11 com documentação vencida) e o painel discordam.

## O que será feito

1. **Lista completa e navegável**: remover o corte fixo de 5 itens. A lista passa a exibir todas as pendências dentro de uma área com rolagem, mantendo a altura do card estável.
2. **Agrupar por colaborador**: cada pessoa aparece uma vez, com seus documentos irregulares listados abaixo do nome (ex.: "NR 33 — venceu em 17/07/2026", "ASO — vence em 12/09/2026"). Isso deixa explícito por que 11 pessoas geram 25 pendências.
3. **Contagens claras no topo do card**: mostrar "X colaboradores · Y documentos" e separar vencidos de a vencer, para casar com os números da lista de colaboradores.
4. **Ordenação**: vencidos primeiro (do mais antigo para o mais recente), depois os a vencer por proximidade da data.
5. **Atalho para a lista de colaboradores**: botão "Ver todos" que abre a lista já filtrada por documentação vencida, aproveitando os filtros existentes.

Nenhuma regra de cálculo muda: continua valendo a versão vigente de cada documento (renovações substituem versões antigas e não geram alerta).

## Detalhes técnicos

- `src/pages/hr/Dashboard.tsx`: remover `expiringAsos.slice(0, 5)`; agrupar os alertas por `technician_id`/nome em memória; renderizar em `ScrollArea` (`max-h-[420px]`); derivar contadores de vencidos/a vencer com `statusFromExpiry`; botão navegando para `/hr/employees` com parâmetro de filtro de documentação.
- `src/pages/hr/Employees.tsx`: ler o parâmetro de URL para pré-selecionar o filtro de "Documentação vencida" já implementado.
- Sem mudanças de banco, RLS ou hooks de dados.
