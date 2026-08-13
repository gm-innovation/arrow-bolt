# Corrigir confirmações de cancelamento da Marina

## Diagnóstico confirmado

- A primeira chamada localiza corretamente as férias ativas de Hugo Alexandre e gera internamente o identificador real e um token assinado de confirmação.
- O histórico enviado no turno seguinte contém apenas o texto visível “Confirma o cancelamento?”, não os dados internos retornados pela ferramenta.
- Ao receber “sim”, o modelo inventou `request_id="654321"` e um token UUID. Por isso a consulta não encontrou a solicitação real, que continua aprovada no banco.
- Não é uma falha de permissão nem de cadastro das férias.

## Implementação

1. **Persistir a confirmação pendente no servidor**
   - Quando uma ferramenta destrutiva devolver `requires_confirmation`, salvar no contexto da conversa o nome da ferramenta, o ID real, o token assinado, o resumo e a validade.
   - Não expor token ou identificadores técnicos no texto da conversa.

2. **Tratar “sim” e “não” de forma determinística**
   - Antes de chamar o modelo, detectar uma confirmação ou recusa curta quando existir uma ação pendente válida.
   - Em “sim”, executar diretamente a mesma ferramenta com o ID e token preservados; o modelo não poderá inventar parâmetros.
   - Em “não”, limpar a pendência e informar que nada foi alterado.
   - Em token expirado ou registro já encerrado, limpar a pendência e orientar a reiniciar a operação.

3. **Evitar confirmações fora de contexto**
   - Vincular a pendência ao usuário, empresa e conversa atuais.
   - Substituir uma pendência antiga quando uma nova ação destrutiva for iniciada e limpar o estado após sucesso, recusa ou erro definitivo.
   - Manter o token assinado e a validação de permissão existentes como segunda camada de segurança.

4. **Resposta e atualização da tela**
   - Após o cancelamento, responder com o colaborador, período e novo status confirmado pelo banco.
   - Preservar o registro no histórico como cancelado.
   - Validar que a atualização em tempo real já existente retira a programação ativa da grade sem recarregar a página.

## Validação

- Reproduzir: “exclua as férias do Hugo Alexandre” → “sim”.
- Confirmar nos logs que a segunda chamada usa exatamente o mesmo UUID e token produzidos na primeira.
- Confirmar no banco a mudança de `approved` para `cancelled`.
- Confirmar na interface que a programação desaparece da grade ativa sem refresh.
- Cobrir também “não”, confirmação expirada e mensagem “sim” sem ação pendente.