# Plano — causa raiz encontrada: o motor está chamando a si mesmo

## O diagnóstico

O `config.yaml` do Hermes tem:

```yaml
model:
  provider: custom
  base_url: http://187.127.60.250:8642/v1   # o próprio gateway
  model: hermes-agent
```

O gateway é o endereço do próprio Hermes. Então, quando a Marina pede uma resposta:

1. o Arrow chama o gateway;
2. o agente precisa do modelo e chama... o gateway de novo;
3. essa segunda chamada abre outra execução, que chama o gateway outra vez.

É recursão. Uma única mensagem da Marina consome as 10 vagas em poucos segundos e todas as chamadas seguintes recebem 429. Isso explica todos os sintomas: motor "limpo" com 0 agentes entre tentativas (o laço morre e libera), 429 imediato mesmo sem ninguém usando, e o mesmo erro no chat e no Design.

O limite de 10 é o padrão interno do Hermes e **não é o problema** — subir esse número só faria o laço demorar um pouco mais para estourar. A correção é apontar o modelo para um provedor de verdade.

## Estado na VPS

Já feito por você: o bloco `model` autorreferente saiu e o motor agora usa `provider: openrouter`, sem nenhuma referência a `187.127.60.250`. O gateway foi reiniciado.

Falta confirmar duas coisas — sem elas o motor apenas troca o 429 por um erro de credencial do provedor:

```bash
C=hermes-agent-ohcv-hermes-agent-1

# a chave do OpenRouter está disponível para o container?
docker exec $C sh -lc 'env | grep -c OPENROUTER_API_KEY'
docker exec $C sh -lc 'grep -rn OPENROUTER /opt/data/.env /opt/data/config.yaml 2>/dev/null | sed "s/=.*/=***/"'

# gateway de pé, sem agentes acumulados
docker exec $C sh -lc 'cat /opt/data/gateway_state.json'
```

Teste de ponta a ponta, com a chave completa do api server:

```bash
K=<chave do api server>
H=http://187.127.60.250:8642

curl -s -o /dev/null -w 'models:%{http_code}\n' $H/v1/models -H "Authorization: Bearer $K"

curl -s $H/v1/chat/completions -H "Authorization: Bearer $K" \
  -H 'Content-Type: application/json' \
  -d '{"model":"hermes-agent","messages":[{"role":"user","content":"responda apenas: ok"}],"max_tokens":20}'
```

Se voltar erro de credencial do provedor, basta cadastrar a chave e reiniciar:

```bash
docker exec $C sh -lc 'echo "OPENROUTER_API_KEY=<chave>" >> /opt/data/.env'
docker exec $C hermes gateway restart
```

Enquanto eu testo pelo Arrow, deixe o log aberto:

```bash
docker exec $C sh -lc 'tail -n 200 -F /opt/data/logs/gateways/default/current'
```


## O que eu faço no Arrow

Independente da VPS, o Arrow precisa parar de esconder esse tipo de falha e parar de amplificá-la.

1. **Erro honesto e rastreável**
   Distinguir `motor_ocupado` (recusa da VPS, com o `Retry-After` que ela mandar) de `sem_vaga_local` (nosso limitador), `motor_indisponivel` e `falha_de_rede`. Hoje as duas primeiras produzem exatamente a mesma frase e o mesmo log, o que travou o diagnóstico por dias.

2. **Uma chamada ao motor por mensagem**
   Rascunho de habilidade, resumo de conversa e aprendiz saem do caminho da resposta e passam a rodar depois, em fundo — nunca competindo com quem está esperando.

3. **Sem retentativa em cima de retentativa**
   O backoff interno e o botão **Tentar de novo** deixam de disputar: o botão fica bloqueado enquanto houver chamada pendente na mesma conversa.

4. **Ciclo de vida certo no frontend**
   Abortar a chamada anterior ao trocar de conversa (hoje só acontece ao sair da tela) e impedir que as abas **Conversa** e **Design** mantenham dois streams vivos na mesma conversa. Manter **Parar** ativo desde o primeiro instante de “pensando”.

5. **Aba Execuções útil**
   Mostrar por tentativa: origem (chat, Design, WhatsApp, fundo), duração, código do erro e a última resposta do motor — sem expor credencial.

Não vou implementar cancelamento por `run_id`: essa versão não tem `/v1/runs` (405). Fica valendo o fechamento da conexão, que já propagamos.

## Validação

1. Na VPS: `grep 187.127.60.250 /opt/data/config.yaml` não retorna nada no bloco `model`.
2. `curl` de chat responde 200 e `gateway_state.json` não fica acumulando agentes.
3. No Arrow: pergunta simples ("cotação do dólar"), criação no Canva e um ajuste em seguida — os três concluem.
4. Parar durante “pensando” e trocar de conversa no meio: o envio seguinte funciona na hora.
5. Se um 429 ainda aparecer, a aba Execuções diz se foi o motor ou o Arrow.

## Segurança

A chave do gateway apareceu por extenso — e ela está gravada em texto puro no `config.yaml`, servida por HTTP em IP puro. Depois da correção: gerar chave nova, atualizar o segredo no Arrow e publicar o motor em HTTPS com domínio próprio.
