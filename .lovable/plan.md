# Canva da Marina: execução real e progresso visível

## Diagnóstico confirmado

- A versão mais recente não possui `canva_url`; portanto, nenhuma imagem editável foi criada no Canva.
- O registro terminou com a pendência de conexão do Canva e com `steps: []`.
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
- Aplicar etapas, persistência incremental e limites de tempo também à retentativa.
- Atualizar o palco a cada avanço e preservar o erro técnico simplificado na etapa exata em que ocorreu.
- Impedir duas tentativas simultâneas para a mesma versão.

### 4. Confirmação real do arquivo editável

- Considerar a preparação concluída somente quando houver: URL do design, exportação do próprio Canva e preview armazenado no Arrow.
- Manter aprovação bloqueada até os três itens existirem.
- Se o Canva devolver o design mas falhar na exportação, preservar a URL e permitir abrir o arquivo, mostrando apenas a exportação como pendente.

## Validação

- Testar uma conversa comum sem gerar imagem.
- Executar uma retentativa da versão atual e acompanhar cada etapa na interface.
- Confirmar que “Abrir no Canva” abre o arquivo editável e que o preview mostrado veio desse mesmo arquivo.
- Simular indisponibilidade e timeout para comprovar que a tela sai do spinner, indica a etapa que falhou e permite nova tentativa.
- Validar atualização após recarregar a página e em desktop/mobile.

## Detalhes técnicos

- Reutilizar `marina_design_approvals.steps` como fonte persistente da timeline e acrescentar marcadores de execução/heartbeat necessários ao estado real.
- Unificar o pipeline inicial e o de retentativa em uma única rotina instrumentada, evitando comportamento diferente entre os dois caminhos.
- Fazer os prazos encerrarem e sinalizarem a operação de fato, não apenas deixar a chamada subjacente continuar em segundo plano.