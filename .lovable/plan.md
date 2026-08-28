# Canva da Marina: execução real e progresso visível

## Diagnóstico confirmado

- A conexão esperada é indireta: `Arrow → Hermes na VPS → MCP do Canva`, usando o perfil Hermes configurado em `HERMES_PROFILE` (o código envia o perfil no payload e no cabeçalho `X-Hermes-Profile`).
- O Arrow possui os três parâmetros necessários do Hermes configurados, inclusive `HERMES_PROFILE`, mas hoje não existe um diagnóstico que confirme se o MCP Canva está autenticado especificamente dentro desse perfil.
- Existem registros anteriores com URL do Canva, comprovando que o caminho Hermes/MCP já funcionou; isso não prova que a sessão MCP atual está saudável.
- A versão mais recente não possui `canva_url`; portanto, nenhuma imagem editável foi criada no Canva.
- O registro terminou com `steps: []`; a mensagem “conexão precisa ser renovada” foi inferida por uma regra ampla do Arrow e não é prova suficiente de que o token MCP esteja vencido.
- A tela mostra “Preparando no Canva” sempre que a peça ainda não está pronta e não recebeu a falha no estado local; isso pode exibir preparação mesmo sem operação ativa.
- A timeline desaparece quando `steps` está vazio, justamente no cenário de falha observado.
- A ação de tentar novamente executa briefing, Canva, exportação e armazenamento de forma síncrona, mas não grava nem transmite etapas e não aplica os mesmos limites de tempo do fluxo principal.

## Correção

### 1. Estado verdadeiro no palco

- Separar explicitamente os estados `aguardando`, `executando`, `concluído`, `falhou` e `cancelado`.
- Nunca inferir “Preparando no Canva” apenas pela ausência de URL.
- Exibir “Canva pendente” com o motivo e o botão “Tentar Canva novamente” quando não houver execução ativa.
- Mostrar o botão “Abrir no Canva” somente depois de existir uma URL válida.

### 2. Timeline sempre visível

- Inicializar e persistir a lista completa de etapas assim que o pedido nasce: briefing, fotografia-base, revisão, montagem das camadas, exportação e armazenamento do preview.
- Exibir cada etapa como aguardando, em andamento, concluída ou falhou, incluindo duração e horário da última atualização.
- Manter a timeline visível após recarregar a página e também em falhas, sem depender apenas do stream aberto no navegador.
- Marcar automaticamente uma execução como interrompida quando ficar sem atualização além do prazo, em vez de manter spinner infinito.

### 3. Retentativa rastreável do Canva

- Fazer “Tentar Canva novamente” reutilizar a fotografia-base e o briefing já existentes, sem regenerar a imagem.
- Aplicar etapas e persistência incremental também à retentativa.
- Atualizar o palco a cada avanço e preservar o erro técnico simplificado na etapa exata em que ocorreu.
- Impedir duas tentativas simultâneas para a mesma versão.

### 4. Diagnóstico específico do MCP Canva

- Criar uma verificação autenticada do perfil Hermes usado pelo Arrow que confirme: Hermes acessível, perfil correto, servidor MCP Canva presente, autenticação ativa e ferramenta mínima disponível.
- Exibir separadamente “Hermes conectado” e “Canva MCP conectado”, sem concluir que o token expirou apenas porque faltou `DESIGNCANVA` na resposta.
- Registrar o retorno real do Hermes de forma segura para distinguir autenticação MCP, ferramenta indisponível, formato de resposta inesperado e falha de exportação.
- Disponibilizar essa verificação na área de Conexões e antes de iniciar/repetir uma montagem no Canva.

### 5. Confirmação real do arquivo editável

- Considerar a preparação concluída somente quando houver: URL do design, exportação do próprio Canva e preview armazenado no Arrow.
- Manter aprovação bloqueada até os três itens existirem.
- Se o Canva devolver o design mas falhar na exportação, preservar a URL e permitir abrir o arquivo, mostrando apenas a exportação como pendente.

## Validação

- Testar uma conversa comum sem gerar imagem.
- Executar uma retentativa da versão atual e acompanhar cada etapa na interface.
- Confirmar no diagnóstico que o Arrow está usando o perfil `super-admin` e que o MCP Canva desse perfil está autenticado antes da retentativa.
- Confirmar que “Abrir no Canva” abre o arquivo editável e que o preview mostrado veio desse mesmo arquivo.
- Simular indisponibilidade e timeout para comprovar que a tela sai do spinner, indica a etapa que falhou e permite nova tentativa.
- Validar atualização após recarregar a página e em desktop/mobile.

## Detalhes técnicos

- Reutilizar `marina_design_approvals.steps` como fonte persistente da timeline e acrescentar marcadores de execução/heartbeat necessários ao estado real.
- Unificar o pipeline inicial e o de retentativa em uma única rotina instrumentada, evitando comportamento diferente entre os dois caminhos.
- Remover os `Promise.race` que descartam chamadas de IA/MCP ainda em execução; manter a chamada aguardada, transmitir progresso/heartbeat e permitir cancelamento somente por ação explícita do usuário.