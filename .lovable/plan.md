# Plano — Marina: destravar o 429 com o motor limpo

## O que o seu diagnóstico mudou

- O motor está **v0.20.4, rodando, com 0 agentes ativos** — não existem execuções órfãs consumindo vagas.
- **Não existe `/v1/runs` nem `/v1/runs/stop`** nessa versão (405). Cancelamento explícito por `run_id` está fora de cogitação: só temos o fechamento da conexão HTTP.
- Existem **6 gateways** (`default`, `super-admin`, `marketing`, `cahuan-fernandes`, `onboarding-test`, `test-user`), mas todo o tráfego do Arrow entra por uma única chave de API server.
- Consequência: o 429 não vem de acúmulo de trabalho real. Vem de um limite por gateway/sessão, ou o Arrow está desistindo cedo por conta própria e mostrando a mesma frase.

Um detalhe do nosso código explica a confusão da tela: quando o limitador interno esgota as tentativas, o Arrow devolve exatamente `{"error":"engine_busy"}` — a mesma forma que registramos como “motor externo falhou 429”. Ou seja, hoje **não é possível distinguir no log** um 429 vindo da VPS de um 429 gerado pelo próprio Arrow. É isso que vamos resolver primeiro.

## O que faço no Arrow agora

### 1. Separar culpa: erro do motor x erro nosso

- Passar a registrar, no 429, se veio da VPS ou do limitador interno, com o corpo e os cabeçalhos da resposta do motor (inclusive `Retry-After`), sem expor a credencial.
- Códigos distintos: `motor_ocupado` (VPS), `sem_vaga_local` (nosso limitador), `motor_indisponivel`, `falha_de_rede`.
- Aba **Execuções** passa a mostrar esses códigos, o gateway usado e a última resposta do motor.

### 2. Parar de criar escassez artificial

- Elevar o teto interno e deixar de tratá-lo como limite global: ele volta a ser só proteção por instância, já que cada instância da função tem contador próprio e o número nunca foi global de verdade.
- Uma única chamada ao motor por mensagem: rascunho de habilidade, resumo e aprendiz saem do caminho da resposta e passam a rodar como fundo, depois.
- Remover a soma de retentativas: o backoff interno e o botão **Tentar de novo** deixam de disputar; o botão fica bloqueado enquanto houver chamada pendente na mesma conversa.

### 3. Cancelar da melhor forma possível sem `/v1/runs`

- Manter a propagação do `AbortSignal` até o `fetch` do motor e drenar o corpo ao cancelar, que é o único mecanismo que a versão instalada oferece.
- Abortar a chamada anterior quando o usuário **troca de conversa** — hoje isso só acontece ao desmontar a tela, e a execução antiga continua bloqueando o envio seguinte.
- Impedir que a aba **Conversa** e a aba **Design** mantenham dois streams vivos ao mesmo tempo na mesma conversa.
- Tratar cancelamento como estado normal: preserva o texto parcial, sem mensagem genérica de erro.

### 4. Mensagem honesta na tela

- Enquanto está esperando: “aguardando vaga no motor”.
- Se o motor recusou: dizer que o motor recusou e mostrar em quantos segundos ele pediu para tentar de novo.
- Se fomos nós: dizer que a fila do Arrow está cheia, sem culpar o motor.

## O que preciso da VPS

O limite que está recusando não está no Arrow. Como não há execuções ativas, ele é configuração do gateway. Os comandos abaixo mostram qual é e onde mudar.

### A. Ver a configuração de concorrência do gateway

```bash
C=hermes-agent-ohcv-hermes-agent-1

docker exec $C sh -lc 'grep -rniE "max_in_progress|max_concurrent|concurrency|rate_limit|429" /opt/data/*.json /opt/data/*.y*ml /opt/hermes/*.y*ml 2>/dev/null | head -40'
docker exec $C sh -lc 'ls -la /opt/data; sed -n "1,200p" /opt/data/config.yaml 2>/dev/null'
docker exec $C env | grep -iE 'max|concurr|limit|api_server' 
```

### B. Ver o 429 acontecendo do lado do motor

```bash
# deixe rodando e mande uma mensagem para a Marina pelo Arrow
docker exec $C sh -lc 'tail -n 200 -F /opt/data/logs/gateways/default/current'
docker logs -n 200 -f $C
```

### C. Confirmar de fora (a chave completa, sem truncar)

```bash
K=31070037463e82f533385844d9e1998b5bde1cbc29d7f9adc34dff6a4bf8b634
H=http://187.127.60.250:8642

curl -s -o /dev/null -w 'models:%{http_code}\n' $H/v1/models -H "Authorization: Bearer $K"

# uma chamada real, e depois duas ao mesmo tempo: a segunda dá 429?
curl -s -D- -o /dev/null $H/v1/chat/completions -H "Authorization: Bearer $K" \
  -H 'Content-Type: application/json' \
  -d '{"model":"hermes-agent","messages":[{"role":"user","content":"ok"}],"max_tokens":10}'

for i in 1 2; do
  curl -s -o /dev/null -w "req$i:%{http_code}\n" $H/v1/chat/completions \
    -H "Authorization: Bearer $K" -H 'Content-Type: application/json' \
    -d '{"model":"hermes-agent","messages":[{"role":"user","content":"conte ate 200"}],"max_tokens":600}' &
done; wait
```

### D. Elevar o limite quando ele aparecer

```bash
# ajuste o valor no arquivo que o passo A apontou e recarregue
docker exec $C hermes gateway restart
sleep 10
docker exec $C sh -lc 'cat /opt/data/gateway_state.json'
```

## Como validamos

1. O passo C mostra se **duas chamadas paralelas** já geram 429 — isso identifica o teto real do gateway.
2. Com o log do passo B aberto, uma mensagem no Arrow tem que aparecer no gateway `default`; se não aparecer, o 429 é nosso e o novo código vai dizer isso explicitamente.
3. Depois do ajuste: pergunta simples, criação no Canva e um ajuste seguido — todos concluem.
4. Parar durante “pensando” e trocar de conversa no meio: o envio seguinte funciona na hora.
5. Aba Execuções mostra origem, gateway e código do erro em cada tentativa.

## Observação de segurança

A chave do gateway apareceu por extenso na sua mensagem. Depois de resolvermos isso, vale trocá-la e atualizar o segredo no Arrow — e migrar o endpoint de HTTP em IP puro para HTTPS com domínio, já que hoje a credencial viaja sem criptografia.
