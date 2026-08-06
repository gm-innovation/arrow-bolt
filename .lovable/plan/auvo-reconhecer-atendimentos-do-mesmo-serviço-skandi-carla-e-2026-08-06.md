# Auvo: reconhecer atendimentos do mesmo serviço (Skandi Carla / ECDIS)

## O que a checagem mostrou

Sim, tudo indica que é o mesmo serviço. Na base, na Skandi Carla (cliente Norskan), com o mesmo técnico Filipe Sousa e o mesmo assunto (ECDIS):

```text
22/06/2026  OS 5308 (cancelada no Omie)  escopo: ECDIS 02 sem input de AIS / ECDIS 01 tela preta
09/07/2026  OS "N/A"                     escopo: Problemas no ECDIS        -> SEM serviço vinculado
27-28/07    OS 5406                      escopo: Lentidão na atualização do ECDIS
```

Hoje o sistema tratou isso como três coisas separadas: `os:5308`, `os:5406` e um atendimento órfão (o card "OS NA · SKANDI CARLA" que aparece na revisão de divergências, sem número de OS e sem grupo).

Três causas, todas verificadas no código e nos dados:

1. O atendimento de 09/07 tem `order_number` = "NA", então cai no caminho de similaridade — mas continua sem grupo. O agrupamento por similaridade só roda na ingestão/ação manual "Agrupar automaticamente", e este ficou de fora.
2. O escopo real do serviço está no campo de orientação do Auvo ("Escopo; Problemas no ECDIS"), mas a similaridade compara apenas `auvo_task_type`, que é sempre genérico ("Visita técnica"). Ou seja: o sinal de escopo hoje é inútil.
3. Muitos atendimentos declaram a OS no texto da orientação ("OS; 5289") mesmo com o campo de número vazio — esse número não é lido. Existe pelo menos um caso assim na base (grupo `os:5289` já existe e o atendimento ficou órfão).
4. Quando os números de OS são diferentes (5308 e 5406, erro humano/OS cancelada e reaberta), não existe nenhuma forma — automática ou manual — de tratar os dois como um único serviço.

## O que será feito

### 1. Ler o número de OS declarado no relato
Extrair a OS do texto de orientação ("OS; 5308", "OS: 5289", "OS 5406") quando o campo de número estiver vazio ou for "NA"/"N/A". Com isso, atendimentos como o de 09/07 e o da Macaé passam a entrar direto no serviço correto quando a OS está escrita no relato.

### 2. Usar o escopo de verdade na similaridade
Extrair o "Escopo" da orientação e comparar por palavras-chave em comum (ex.: ECDIS, radar, gyro) entre o atendimento e os atendimentos do grupo candidato, além do tipo do Auvo. Escopo em comum passa a valer como sinal forte.

### 3. Reagrupar automaticamente após cada sincronização
Rodar a varredura de órfãos no fim de cada sync (não só no botão manual), de modo que atendimentos sem OS não fiquem parados fora de um serviço.

### 4. Sugestão e fusão de serviços com OS diferentes
- Novo painel "Possíveis serviços duplicados" na aba de serviços: lista pares de grupos com mesma embarcação/cliente, escopo semelhante, técnico em comum e datas dentro de ~45 dias, com o motivo da sugestão.
- Ação "Unificar serviços": move os atendimentos, soma os números de OS envolvidos (5308 + 5406 + sem OS), mantém o grupo mais antigo como principal, marca o motivo da fusão e recoloca o serviço na fila de reauditoria (materiais e fotos recalculados sobre o conjunto).
- Ação "Desfazer unificação" para reverter, reconstruindo os grupos por número de OS.

### 5. Deixar visível na revisão
No cabeçalho do serviço e no card de revisão de divergências, mostrar todos os números de OS do serviço (ex.: "OS 5308 + 5406 + sem OS") e, quando houver, o motivo do agrupamento, para o auditor entender de onde vem cada pendência.

### 6. Corrigir o caso atual
Após a implementação, rodar o reagrupamento e unificar o serviço da Skandi Carla (5308, 09/07 sem OS e 5406) em um único serviço, disparando a reauditoria de materiais e fotos.

## Notas técnicas

- Extração de OS e escopo: novo utilitário compartilhado usado por `supabase/functions/auvo-sync/grouping.ts` (e espelhado no front onde necessário).
- `findSimilarGroup`: passa a receber escopos textuais por grupo; escopo em comum entra como sinal adicional junto de técnico e proximidade de datas.
- `resolveServiceGroup`: normaliza o número lido da orientação antes de decidir entre caminho por OS e caminho por similaridade.
- Fusão: novos modos `suggest-merges` e `merge-groups` na Edge Function `auvo-sync`; colunas de rastreio no grupo (`merged_into_id`, `merge_reason`) com GRANT/RLS conforme o padrão das tabelas Auvo; grupo absorvido é removido depois de mover os atendimentos.
- Reauditoria: ao unificar, `analysis_status` do grupo resultante volta para pendente e as divergências/apontamentos antigos dos grupos envolvidos são descartados.
- UI: novo bloco em `src/pages/admin/AuvoAudit.tsx` e mutações em `src/hooks/useAuvoServiceGroups.ts`; cabeçalho de `AuvoGroupReviewDialog.tsx` exibindo as OS do serviço.
