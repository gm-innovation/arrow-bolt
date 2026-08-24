# Gerar código de pareamento da Evolution API direto no painel do Super Admin

## Contexto

São **dois códigos diferentes** no fluxo do WhatsApp — importante não confundir:

1. **Código de pareamento da instância** (esta demanda): conecta a instância da Evolution API ao número corporativo de WhatsApp. É gerado pela Evolution (`POST /instance/connect/{instância}` com o número) e digitado no app WhatsApp em *Aparelhos conectados → Conectar com número de telefone*. Configuração única, feita pelo Super Admin. Hoje o painel só descreve esse passo em texto — não há como gerar o código pelo app.
2. **Código de 6 dígitos do colaborador** (já existe): cada colaborador gera em `/account/settings` → Assistente → WhatsApp e **envia** pelo WhatsApp para a Marina, vinculando o número dele ao próprio perfil.

O que falta: um botão no painel `/super-admin/api-docs` → aba "WhatsApp (Evolution)" que chama a Evolution API, exibe o código de 8 caracteres na tela e orienta onde digitá-lo no WhatsApp.

## O que será construído

### 1. Nova ação `pairing_code` na Edge Function `whatsapp-config`

Em `supabase/functions/whatsapp-config/index.ts` (já valida JWT e exige `super_admin` ou `director`):

- **POST** `{ action: "pairing_code", phone: "5521999990000" }`:
  - Valida o número (só dígitos, com DDI+DDD, 10–15 dígitos) reutilizando `normalizePhone`.
  - Exige os segredos `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE` e `EVOLUTION_API_KEY` configurados.
  - Chama `POST {EVOLUTION_API_URL}/instance/connect/{EVOLUTION_INSTANCE}` com header `apikey` e body `{ "number": "<digits>" }`.
  - Extrai `pairingCode` da resposta da Evolution (formato `XXXX-XXXX`) e retorna `{ ok: true, pairingCode }`.
  - Erros tratados com mensagens claras: instância inexistente (404 → criar a instância primeiro), instância já conectada (state `open` → não precisa de código), Evolution inacessível (timeout).

### 2. Card "Conectar instância ao WhatsApp" no painel

Em `src/components/super-admin/settings/EvolutionAPIConfig.tsx`, novo bloco dentro do card principal, visível quando os segredos estão configurados e a instância **não** está `open`:

- **Input** do número corporativo que vai hospedar a Marina (com DDI e DDD).
- **Botão "Gerar código de pareamento"** → chama a ação `pairing_code`.
- **Exibição do código**: tipografia mono grande (ex.: `ABCD-1234`), com botão "Gerar novamente" (o código expira em ~60 s).
- **Instrução curta ao lado do código**: no WhatsApp do número corporativo → *Aparelhos conectados → Conectar aparelho → Conectar com número de telefone* → digitar o código.
- O painel já atualiza o status a cada 30 s — ao concluir o pareamento, o badge muda para "Conectada" sozinho.

### 3. Ajustes de texto

- Acordeão "2. Conectar a instância ao WhatsApp" no mesmo componente: passa a referenciar o botão da tela em vez do `POST` manual.
- `docs/whatsapp-evolution-setup.md`: atualizar o passo 2 do guia para o fluxo pelo painel.

## Fluxo resultante

```text
Super Admin → /super-admin/api-docs → aba WhatsApp (Evolution)
  → informa o número corporativo → "Gerar código de pareamento"
  → vê ABCD-1234 na tela
  → no WhatsApp do número: Aparelhos conectados → Conectar com número de telefone → digita ABCD-1234
  → painel mostra "Conectada" (badge verde) na próxima atualização

Colaborador (inalterado) → /account/settings → Assistente
  → gera código de 6 dígitos → envia pelo WhatsApp → número vinculado
```

## Arquivos a editar

| Arquivo | Ação |
| --- | --- |
| `supabase/functions/whatsapp-config/index.ts` | Adicionar ação `pairing_code` |
| `src/components/super-admin/settings/EvolutionAPIConfig.tsx` | Card de pareamento com exibição do código |
| `docs/whatsapp-evolution-setup.md` | Atualizar passo 2 do guia |

## Observações técnicas

- O código é gerado pela Evolution e apenas repassado — nada é persistido no banco; é um segredo de uso único e curta duração (~60 s), exibido apenas ao Super Admin autenticado.
- A chamada à Evolution acontece **na Edge Function** (servidor), nunca no browser — a API key não sai do backend.
- Se a Evolution ainda não estiver hospedada, o botão fica desabilitado (segredos ausentes) e o checklist de segredos continua indicando o que falta.
