# Canva da Marina: transformar a montagem em um job rápido e confiável

## Diagnóstico confirmado

- A execução atual começou às **16:53:21** e o último heartbeat ocorreu às **16:59:42** (Brasília): ela permaneceu viva por **6min21s**, depois foi encerrada sem concluir nem registrar falha.
- O registro continua sem `canva_url`, `export_url` ou motivo de erro. Portanto, o Canva nem sequer confirmou a criação do arquivo-base.
- A interface continuou contando o tempo porque recebeu uma etapa `andamento`, mas o processo de backend que deveria atualizá-la já não estava mais vivo.
- A segmentação visual foi criada, porém `createCanvaFoundation`, `composeCanvaLayers` e `validateCanvaLayers` ainda fazem chamadas longas ao Hermes sem `AbortSignal` próprio.
- O processamento inteiro ainda depende de `EdgeRuntime.waitUntil`. Esse mecanismo desacopla a resposta HTTP, mas não é uma fila durável e pode ser encerrado pelo runtime antes da conclusão — exatamente o comportamento observado.
- O heartbeat atual apenas atualiza a mesma linha; ele não representa progresso real do MCP e, quando o runtime morre, não existe outro executor para retomar automaticamente.
- A consulta da lista de designs está respondendo normalmente. O gargalo não é o banco nem a tela: é a execução longa Hermes → MCP Canva mantida dentro de uma única função.

## Correção

### 1. Encerrar imediatamente estados falsamente ativos

- Reconciliar a execução atual como interrompida, preservando a fotografia, o briefing e a prévia já gerados.
- A tela nunca ficará em spinner indefinido: sem heartbeat válido, exibirá “Interrompida — retomar” e uma ação objetiva.
- Mostrar tempo de processamento apenas enquanto houver executor ativo; depois disso, parar o cronômetro.

### 2. Criar uma fila persistente para o Canva

- Criar uma tabela de jobs por design com fase atual, tentativa, lease/lock com expiração, próximo horário de execução, erro técnico seguro e estado `queued/running/retry/failed/completed`.
- Garantir uma única execução por design e operação com chave de deduplicação.
- Cada chamada processará **somente uma fase** e terminará; se houver trabalho restante, agenda a próxima fase com pequeno intervalo.
- Usar orçamento/depth explícito e impedir encadeamento infinito.
- Criação inicial, retentativa e ajuste alimentarão a mesma fila, sem três fluxos diferentes.

```text
pedido → job criar arquivo → job importar foto → job montar camadas
       → job validar → job exportar → job armazenar → concluído
```

### 3. Limitar e observar cada chamada Hermes/MCP

- Propagar `AbortSignal` real para todas as operações Canva, inclusive criação, composição e validação.
- Aplicar limite operacional por chamada MCP, não um timeout monolítico para toda a peça.
- Registrar início, primeira resposta, fim, status HTTP, duração, fase e classificação do erro — sem credenciais ou conteúdo sensível.
- Diferenciar: aguardando vaga, Hermes sem resposta, ferramenta MCP travada, autenticação, resposta sem URL, importação, composição, validação e exportação.
- Em `429` ou `5xx`, reagendar com backoff limitado; em falha terminal, parar e mostrar a ação correta.

### 4. Tornar a criação produtiva

- Meta operacional: o arquivo-base ou uma falha clara deve aparecer em até **90 segundos**, nunca após dez minutos de espera cega.
- Persistir `canva_url` imediatamente quando o arquivo for criado, antes da montagem das demais camadas.
- Retomar do último artefato confirmado; não recriar design, fotografia ou camadas já concluídas.
- Manter conversa e outras ações da Marina disponíveis durante o processamento.

### 5. Progresso real na interface

- A timeline será alimentada pelo estado persistido do job, não por suposição do frontend.
- Exibir estados distintos: “Na fila”, “Executando”, “Aguardando nova tentativa”, “Interrompida”, “Falhou” e “Concluída”.
- Mostrar a última atividade real e a próxima tentativa quando houver backoff.
- Oferecer **Retomar**, **Cancelar** e **Tentar novamente**; cancelar invalida o lease e impede o próximo hop.
- Reduzir polling desnecessário e encerrá-lo ao detectar estado terminal ou lease expirado.

### 6. Validar o resultado, não apenas a resposta textual

- Só avançar após receber e persistir uma URL Canva válida.
- Confirmar fotografia importada e elementos nativos separados antes da exportação.
- Bloquear aprovação enquanto camadas, exportação e preview final não forem confirmados.
- O preview final do Arrow deve vir do mesmo design Canva editável.

## Arquivos e dados envolvidos

- Nova migração: fila/lease persistente para jobs Canva, com `GRANT`, RLS e políticas por usuário/empresa.
- `supabase/functions/marina-chat/index.ts`: endpoints curtos para enfileirar, processar uma fase, retomar e cancelar.
- `supabase/functions/marina-chat/design.ts`: operações MCP atômicas e sinais propagados.
- `supabase/functions/marina-chat/hermes.ts`: telemetria, cancelamento e classificação dos retornos.
- `src/hooks/useMarinaDesigns.ts`: polling pelo job persistido e ações de recuperação.
- `src/components/marina/design/DesignStage.tsx`: estados reais, lease expirado e controles.
- `src/components/marina/design/DesignWorkspace.tsx`: criação, retry e ajuste usando a fila única.

## Validação

- Recuperar a versão `1b0733bf-9bda-4fb1-bbf2-c82525d1e9ea` sem perder a prévia existente.
- Confirmar que o primeiro job termina ou falha claramente em até 90 segundos.
- Recarregar a página durante cada fase e comprovar retomada sem duplicar o design.
- Simular encerramento do runtime, 429, 5xx, autenticação vencida, resposta sem URL, importação inválida e exportação falha.
- Confirmar lock contra cliques repetidos e duas execuções simultâneas.
- Abrir o design e verificar fotografia, logo, textos, CTA, faixas e formas como elementos selecionáveis separados.
- Confirmar que o preview armazenado foi exportado desse mesmo arquivo.
