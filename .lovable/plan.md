# Marina: voz reconhecida e respostas confiáveis

## Objetivo
Impedir que a Marina se declare “apenas texto”, garantir instruções corretas sobre microfone e reprodução de voz e reduzir respostas baseadas em informações irrelevantes.

## Implementação
1. **Definir as capacidades reais no prompt da Marina**
   - Registrar explicitamente que o chat aceita entrada por microfone com transcrição e reproduz respostas por áudio.
   - Explicar os três modos de voz: desligada, automática após mensagem falada e sempre ativa.
   - Explicar corretamente os estados do microfone: iniciar, gravação com contador, parar para transcrever e cancelar.
   - Informar que cada resposta também possui a ação manual “Ouvir”.
   - Proibir afirmações genéricas como “sou apenas um modelo de texto” quando a interface do Arrow oferece esses recursos.

2. **Enviar contexto de voz junto da conversa**
   - Incluir na chamada da Marina a preferência de reprodução atual e se a mensagem foi originada do microfone.
   - Usar esse contexto para respostas específicas, sem inventar qual modo está ativo para o usuário.

3. **Tornar a busca de ajuda mais confiável**
   - Separar perguntas sobre capacidades nativas da Marina da busca genérica nos manuais dos módulos.
   - Reforçar que resultados de baixa relevância ou de outro módulo não podem ser apresentados como resposta correta.
   - Quando não houver fonte adequada, responder pelos recursos confirmados da interface, sem fabricar passos ou citar manual incorreto.

4. **Validar o comportamento**
   - Testar perguntas como “você responde por áudio?”, “como uso o microfone?” e “qual modo de voz está ativo?”.
   - Confirmar entrada falada, transcrição, resposta automática conforme preferência e botão manual “Ouvir”.
   - Conferir nos logs que as chamadas de chat e síntese concluíram sem erro.

## Detalhes técnicos
- Ajustar o prompt e as regras de ferramentas da função `ai-assistant`.
- Acrescentar metadados de canal de voz no payload do chat sem alterar o histórico existente.
- Manter autenticação, permissões e preferências atuais intactas.
- Registrar a função com verificação de JWT conforme as regras do projeto, preservando a validação de usuário já existente.