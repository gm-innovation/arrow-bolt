# Canva da Marina: eliminar execução órfã e erro genérico

## Diagnóstico confirmado

- A tentativa atual iniciou a etapa Canva em **28/08/2026 às 17:25 UTC** e não recebeu nenhuma atualização posterior; o banco ainda mantém `canva` como `andamento`, sem `canva_url`, sem exportação e sem `fail_reason`.
- A retentativa é uma única requisição HTTP síncrona: ela espera briefing, chamada Hermes/MCP Canva, exportação, download e armazenamento antes de responder.
- Durante a chamada longa ao Hermes não há heartbeat persistido. Se a requisição, o runtime ou o cliente cair, a linha fica órfã em `andamento` e a interface só consegue inferir depois que foi interrompida.
- O frontend considera uma execução ativa por até 15 minutos e continua consultando indefinidamente enquanto existir qualquer etapa `andamento`.
- Não há erro JavaScript ou log explícito disponível no momento; portanto, o overlay genérico da captura não prova a causa técnica. O dado persistido prova a interrupção sem finalização, que será o foco da correção.

## Correção

### 1. Retentativa rápida e controlada

- Antes de começar, validar Hermes, perfil configurado e MCP Canva com uma operação somente leitura.
- Interromper a criação no Canva em um limite seguro menor que o limite da função, em vez de deixar a chamada presa por vários minutos.
- Aplicar limites separados para criação e exportação, com mensagens específicas para autenticação, indisponibilidade, Hermes ocupado, resposta sem URL e timeout.
- Garantir `try/catch/finally` em todo o pipeline para que nenhuma saída mantenha uma etapa em `andamento`.

### 2. Heartbeat e recuperação automática

- Persistir heartbeat periódico enquanto o Hermes/MCP estiver trabalhando, inclusive na ação “Tentar criar no Canva novamente”.
- Ao carregar os designs, reconciliar execuções sem heartbeat além do prazo: marcar a etapa como `falhou`, registrar motivo simples e liberar imediatamente a retentativa.
- Reduzir a janela visual de “execução ativa” para refletir o heartbeat real; polling só permanece ligado enquanto a execução estiver saudável.
- Corrigir imediatamente o registro órfão mostrado na captura, preservando a fotografia-base e o briefing para nova tentativa.

### 3. Resposta resiliente no frontend

- Tratar timeout, resposta vazia e resposta não JSON da função sem derrubar a tela nem depender do overlay genérico.
- Manter a prévia visível e trocar o spinner por “Canva interrompido” com o motivo e o botão de retomar.
- Exibir horário do último avanço e tempo real de cada etapa, sem reiniciar o cronômetro a cada renderização ou recarga.
- Após iniciar a retentativa, retornar o controle da interface rapidamente e acompanhar o estado persistido por polling, evitando uma ação de botão bloqueada durante toda a operação.

### 4. Diagnóstico seguro do caminho MCP

- Registrar por etapa: início/fim, duração, status HTTP do Hermes, perfil utilizado e classificação do retorno, sem armazenar token, credencial ou conteúdo sensível.
- Confirmar que o perfil usado pelo Arrow é o mesmo perfil no qual o MCP Canva está autenticado.
- Só declarar “Canva conectado” após uma ferramenta Canva somente leitura responder; saúde HTTP do Hermes isoladamente não será tratada como sucesso do Canva.

## Validação

- Repetir a versão atual reutilizando a fotografia e o briefing, acompanhando heartbeat e etapas após recarregar a página.
- Confirmar os três artefatos obrigatórios: `canva_url`, exportação do próprio Canva e preview final armazenado no Arrow.
- Abrir o arquivo no Canva e verificar fotografia, logo, textos e formas como camadas separadas.
- Simular timeout, 429, autenticação vencida e resposta sem URL; em todos os casos a etapa deve terminar como falha, a prévia deve permanecer e a retentativa deve ficar disponível.
- Validar que uma falha de rede ou resposta inválida gera feedback dentro da tela, sem erro genérico e sem spinner órfão.

## Arquivos e dados envolvidos

- `supabase/functions/marina-chat/index.ts`: coordenação da retentativa, heartbeat, limites, reconciliação e finalização garantida.
- `supabase/functions/marina-chat/hermes.ts`: timeout/cancelamento e diagnóstico seguro do perfil/MCP.
- `supabase/functions/marina-chat/design.ts`: classificação dos retornos de criação e exportação.
- `src/hooks/useMarinaDesigns.ts`: chamadas resilientes, polling condicionado ao heartbeat e atualização de estado.
- `src/components/marina/design/DesignStage.tsx`: último avanço, estado interrompido e ação de retomada.
- `marina_design_approvals.steps`: permanece a fonte persistente da timeline; não é necessária nova tabela.