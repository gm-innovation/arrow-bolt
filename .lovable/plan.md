# Canva da Marina: destravar a montagem das camadas

## Diagnóstico confirmado

- A tentativa mostrada na captura começou às **16:39:26** e terminou às **16:42:36** (horário de Brasília): a etapa Canva falhou após **190,291 segundos**.
- O backend limita a montagem a **180 segundos** com `AbortSignal.timeout(180_000)`. O tempo observado é compatível com esse corte mais a espera/liberação interna do Hermes.
- O heartbeat funcionou: a execução não ficou órfã e foi finalizada como `falhou`. Portanto, o problema atual não é mais perda da função, e sim a montagem não concluir dentro do limite.
- A chamada atual pede ao Hermes, em uma única execução: importar a fotografia, montar todas as camadas nativas, inserir logo/textos/formas, verificar que nada foi achatado, exportar PNG e devolver os links. Esse bloco monolítico concentra todo o trabalho mais demorado no mesmo prazo.
- O erro técnico foi perdido: qualquer exceção que não corresponda às poucas regras conhecidas vira apenas “A versão editável no Canva não ficou pronta”. Os logs não informam se o corte ocorreu esperando vaga, executando ferramenta MCP, importando asset, montando o layout ou exportando.
- A etapa visual mistura montagem e exportação, apesar de a timeline possuir etapas separadas. Assim, não é possível ver qual operação interna consumiu os três minutos.
- O fluxo inicial ainda chama o Canva sem o mesmo limite e a mesma instrumentação da retentativa; os dois caminhos podem se comportar de forma diferente.

## Correção

### 1. Dividir o trabalho em operações retomáveis

- Substituir a chamada única por fases persistidas:
  1. criar/abrir o design Canva;
  2. importar fotografia e assets;
  3. montar textos, logo, formas e CTA em camadas nativas;
  4. validar o arquivo editável;
  5. exportar o preview;
  6. armazenar o preview no Arrow.
- Salvar o `canva_url` imediatamente após a criação do arquivo, sem esperar a exportação.
- Se uma fase falhar, retomar do último artefato confirmado em vez de recriar tudo.
- Usar a mesma rotina para criação inicial, retentativa e ajuste, eliminando os três comportamentos diferentes atuais.

### 2. Corrigir limites e cancelamento

- Aplicar um orçamento próprio por fase, sem um corte único de 180 segundos para todo o layout.
- Aguardar e encerrar corretamente cada chamada ao Hermes; cancelamento explícito continua liberando a vaga, mas o sistema não descartará silenciosamente uma operação ainda faturável.
- Não usar timeout artificial nas chamadas de geração/IA. Para operações MCP longas, acompanhar progresso e aplicar apenas um limite operacional amplo e seguro, com persistência antes de qualquer interrupção.
- Impedir duas montagens simultâneas para a mesma versão usando estado persistido, não apenas a data da última atualização.

### 3. Progresso real e diagnóstico útil

- Expandir a timeline para mostrar as fases reais: “Criando arquivo”, “Importando fotografia”, “Montando textos e elementos”, “Validando camadas”, “Exportando preview”.
- Manter heartbeat em cada fase e registrar duração, status HTTP, classificação do retorno e fase ativa, sem guardar credenciais ou conteúdo sensível.
- Preservar separadamente os motivos: timeout/cancelamento, Hermes ocupado, erro MCP, falha ao importar asset, resposta sem `canva_url`, falha de validação e falha de exportação.
- Exibir no palco o motivo específico e a ação adequada: retomar montagem, tentar exportação novamente ou renovar a conexão.

### 4. Confirmar editabilidade de verdade

- Não considerar a montagem concluída apenas porque o Hermes escreveu `DESIGNCANVA`.
- Validar pelo MCP que o design existe e contém elementos separados antes de avançar para exportação.
- Bloquear aprovação até existirem `canva_url`, validação das camadas, exportação e preview final armazenado.
- Preservar a prévia atual do Arrow durante toda a recuperação.

### 5. Recuperar a versão atual

- Reutilizar a fotografia-base e o briefing da versão `1b0733bf-9bda-4fb1-bbf2-c82525d1e9ea`.
- Iniciar uma nova execução segmentada e manter essa versão selecionada no palco.
- Se o Canva já tiver criado um design parcial antes do corte, localizá-lo pelo MCP e continuar nele; só criar outro arquivo se nenhum artefato parcial válido existir.

## Validação

- Executar a versão atual e acompanhar todas as fases no palco, inclusive após recarregar a página.
- Confirmar que o `canva_url` aparece assim que o arquivo é criado, antes da exportação.
- Abrir o Canva e verificar fotografia, logo, cada texto, CTA, faixas e formas como elementos selecionáveis separados.
- Confirmar que o preview final exibido no Arrow foi exportado desse mesmo design.
- Simular demora, 429, importação inválida, resposta sem link e falha de exportação; cada caso deve parar na fase correta e permitir retomada sem duplicar o design.
- Confirmar que criação inicial, retentativa e ajuste usam a mesma rotina e nunca deixam spinner órfão.

## Arquivos envolvidos

- `supabase/functions/marina-chat/index.ts`: orquestração segmentada, persistência, retomada, heartbeat e unificação dos fluxos.
- `supabase/functions/marina-chat/design.ts`: operações Canva por fase, parsing e validação dos resultados.
- `supabase/functions/marina-chat/hermes.ts`: telemetria segura, cancelamento e classificação dos retornos do Hermes.
- `src/hooks/useMarinaDesigns.ts`: polling por heartbeat/fase e retomada resiliente.
- `src/components/marina/design/DesignStage.tsx`: timeline detalhada, motivo específico e ações de recuperação.