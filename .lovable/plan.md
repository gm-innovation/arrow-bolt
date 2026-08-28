# Marina Design: nunca perder o turno e usar o Canva já conectado

Duas coisas diferentes aconteceram:

**Turno das 12:13** — funcionou como planejado: a Marina não conseguiu o Canva ("credenciais da API Canva não encontradas"), gerou a prévia própria, gravou a resposta e criou o registro para aprovação.

**Turno das 12:25 (o da imagem)** — a pergunta ficou gravada, mas **nada mais**: nenhuma resposta, nenhuma prévia, nenhum registro no palco. Isso confirma o problema de fundo: hoje tudo (texto, prévia, registro) só é gravado no fim de um turno que pode passar de dois minutos. Se esse turno morre antes do fim — tempo esgotado, aba/conexão interrompida — a pessoa fica com a tela exatamente como na imagem: mensagem enviada e palco vazio.

## O que muda

**1. A resposta passa a ser gravada durante o caminho, não só no fim**

- Assim que o turno começa, já existe uma resposta da Marina na conversa (em andamento).
- O texto vai sendo salvo enquanto ela escreve (a cada poucos segundos), então recarregar a página sempre mostra até onde ela chegou.
- Se o turno morrer, a resposta fica marcada como interrompida, com "tentar de novo" ao lado — nunca mais desaparece.

**2. O palco nunca fica vazio depois de um pedido**

- O registro da peça é criado **antes** da geração da imagem, já aparecendo no palco como "preparando a peça…".
- Quando a imagem fica pronta, o mesmo cartão é atualizado com a prévia; se falhar, o cartão fica com o motivo e o botão de repetir.
- O palco também deixa de "esconder" peças: se a conversa atual ainda não tem nenhuma, mostra a peça pendente mais recente e atualiza a lista ao voltar para a aba.

**3. Prazo mais curto para a peça**

O prazo de espera pelo Canva cai de 150 para 75 segundos, para sobrar tempo dentro do turno para gerar e guardar a prévia própria com folga.

**4. Canva conectado, mas invisível para a Marina**

Você autenticou o Canva no perfil `super-admin` do motor (`hermes -p super-admin mcp login canva`), e o Arrow conversa com o motor sem informar perfil nenhum — ou seja, provavelmente cai em outro perfil, que continua sem credencial do Canva. Isso explica a mensagem "credenciais da API Canva não encontradas" mesmo com o login concluído.

- O Arrow passa a enviar o perfil do motor de forma configurável (novo segredo `HERMES_PROFILE`), começando com `super-admin`.
- Para confirmar de qual perfil o Arrow é atendido, rode na VPS:

```
docker exec hermes-agent-ohcv-hermes-agent-1 hermes mcp list
docker exec hermes-agent-ohcv-hermes-agent-1 hermes -p super-admin mcp list
docker exec hermes-agent-ohcv-hermes-agent-1 hermes gateway status
```

Se o `mcp list` sem perfil não mostrar o Canva, o login precisa ser repetido no perfil que atende o gateway (ou o Arrow passa a apontar para `super-admin` via o segredo acima).

## Detalhes técnicos

- `supabase/functions/marina-chat/index.ts`: inserir a linha de `ai_messages` do assistente logo no início do turno (`metadata.streaming = true`) e atualizá-la por *flush* periódico e nos caminhos de erro/abort/timeout (`metadata.partial`); criar o registro em `marina_design_approvals` antes de `generateMarinaImage`, atualizando `storage_path`/`fail_reason` depois; reduzir o `AbortSignal.timeout` de design para 75 s.
- `supabase/functions/marina-chat/hermes.ts`: enviar o perfil do motor (header/campo conforme aceito pelo endpoint) a partir de `HERMES_PROFILE`.
- `src/hooks/useMarina.ts`: tratar mensagens `streaming`/`partial` na lista, sem duplicar o rascunho local.
- `src/components/marina/design/DesignWorkspace.tsx`: cair para a peça pendente mais recente quando a conversa não tem peça; `refetchOnWindowFocus` e invalidação ao fim do stream.
- `src/components/marina/design/DesignStage.tsx`: estado "preparando a peça…" para registro sem arquivo.

## Fora do escopo

Reconfiguração de OAuth na VPS, publicação automática em redes e revisão dos alertas do linter de segurança.
