# Onde cadastrar os segredos da Evolution + card de pareamento sempre visível

## Contexto

Dois pontos de confusão na aba WhatsApp (Evolution):

1. **"Nada apareceu no front"**: o card "Conectar instância ao WhatsApp" (geração do código de pareamento) só renderiza quando `status.configured` é verdadeiro — ou seja, enquanto os 4 segredos não existirem no cofre, o card fica invisível. O comportamento técnico está certo (sem credenciais não há como gerar código), mas a tela não dá pista de que o recurso existe.
2. **"Onde insiro os valores?"**: NÃO é na aba "Integrações (B2B)" — aquela aba gerencia as chaves da API pública do Arrow (clientes externos que consomem o Arrow). Os 4 segredos da Evolution são credenciais de infraestrutura e ficam no cofre seguro do backend: **Cloud → Secrets**. O texto atual do painel menciona "Project Settings → Secrets", caminho desatualizado.

## O que será ajustado

### 1. Card de pareamento sempre visível (`EvolutionAPIConfig.tsx`)

- O card "Conectar instância ao WhatsApp" passa a renderizar **sempre** (hoje: só com `configured && !connected`).
- Quando os segredos ainda não existirem: campo e botão **desabilitados**, com aviso "Cadastre os 4 segredos da integração (Cloud → Secrets) para liberar o pareamento".
- Quando configurado e desconectado: comportamento atual (gera o código).
- Quando já conectado: card substituído por confirmação "Instância conectada" (o badge verde no topo já indica; aqui só um texto curto).

### 2. Orientação de onde cadastrar os segredos

- Atualizar o texto do checklist de segredos de "Project Settings → Secrets" para **"Cloud → Secrets"** (caminho real no Lovable).
- Adicionar uma linha no checklist: "Ou peça no chat que eu abro o formulário seguro para colar os valores."

### 3. Cadastro dos valores (passo operacional, após aprovação)

Quando você tiver os dados da Evolution em mãos (URL do servidor, nome da instância, API key e um token de webhook que você mesmo gera), eu abro o **formulário seguro** aqui no chat (`add_secret`) para os 4 valores — eles entram direto no cofre, sem passar pela conversa.

O `EVOLUTION_WEBHOOK_TOKEN` é um valor aleatório forte que **você cria** (ex.: `openssl rand -hex 32` ou gerador de senha) e usa em dois lugares: no cofre do projeto e na URL do webhook que cadastra na Evolution.

## Fluxo resultante

```text
Hoje (sem segredos):
  Aba WhatsApp (Evolution) → card de pareamento visível mas desabilitado
  → aviso indica Cloud → Secrets

Depois de cadastrar os 4 segredos:
  Badge muda para "Desconectada" → card de pareamento habilitado
  → informa número corporativo → gera código → digita no WhatsApp
  → badge "Conectada" → Testar envio liberado
```

## Arquivos

| Arquivo | Ação |
| --- | --- |
| `src/components/super-admin/settings/EvolutionAPIConfig.tsx` | Editar — card de pareamento sempre visível + texto do caminho do cofre |

Sem mudanças de backend: a ação `pairing_code` da função `whatsapp-config` já está pronta e testada.
