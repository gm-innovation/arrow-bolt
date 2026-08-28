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

**5. Ações rápidas configuráveis (modelos + especificações)**

O "Criar post" hoje só tem tema, texto e formato. Ele passa a ser um pedido de verdade, montado a partir de um modelo:

- **Modelos pré-definidos** com prompt base pronto (promoção/desconto, lançamento de serviço, caso de sucesso, vaga/RH, aviso operacional, institucional, evento/feira). Ao escolher o modelo, os campos já vêm sugeridos com o texto base — e podem ser editados.
- **Campo de especificações** livre e longo: o que precisa aparecer, o que evitar, referências, produtos, dados técnicos.
- Campos objetivos junto: formato, tom de voz (institucional, comercial, técnico, descontraído), chamada de ação (CTA), paleta/estilo (usar brand kit, imagem realista, ilustração, foto de bordo) e observação de marca (logo, contato, site).
- Prévia do pedido antes de enviar: a pessoa vê o texto final que vai para a Marina e pode ajustar na mão.
- **Meus modelos**: dá para salvar o pedido montado como modelo próprio (nome + campos preenchidos), reutilizar e apagar. Os modelos são por pessoa/empresa.
- Os mesmos campos alimentam também "Editar design" (especificações do ajuste) — sem mexer em Exportar e Assets.

**6. Padrão ultrarrealista e fidelidade aos produtos reais**

- O estilo **padrão passa a ser fotografia ultrarrealista** (luz natural, profundidade de campo real, sem ilustração, sem 3D, sem cartoon, sem elementos "cara de IA"). Desenho/ilustração só sai se a pessoa escolher explicitamente no seletor de estilo.
- Esse padrão vale nos dois caminhos: no pedido enviado ao Canva **e** na prévia gerada pela própria Marina.
- **Imagens de referência**: no "Criar post" dá para anexar fotos reais de produtos/equipamentos. Elas viajam com o pedido e a prévia é gerada a partir delas, com a regra de que o equipamento deve ser reproduzido fielmente — mesmo modelo, cor, marca e proporções, sem inventar peça, logo ou detalhe que não esteja na foto.
- Quando não houver foto anexada e o pedido mencionar equipamento específico, a Marina avisa em uma linha que gerou uma composição genérica e sugere anexar a foto real.



## Detalhes técnicos

- `supabase/functions/marina-chat/index.ts`: inserir a linha de `ai_messages` do assistente logo no início do turno (`metadata.streaming = true`) e atualizá-la por *flush* periódico e nos caminhos de erro/abort/timeout (`metadata.partial`); criar o registro em `marina_design_approvals` antes de `generateMarinaImage`, atualizando `storage_path`/`fail_reason` depois; reduzir o `AbortSignal.timeout` de design para 75 s.
- `supabase/functions/marina-chat/hermes.ts`: enviar o perfil do motor (header/campo conforme aceito pelo endpoint) a partir de `HERMES_PROFILE`.
- `src/hooks/useMarina.ts`: tratar mensagens `streaming`/`partial` na lista, sem duplicar o rascunho local.
- `src/components/marina/design/DesignWorkspace.tsx`: cair para a peça pendente mais recente quando a conversa não tem peça; `refetchOnWindowFocus` e invalidação ao fim do stream.
- `src/components/marina/design/DesignStage.tsx`: estado "preparando a peça…" para registro sem arquivo.
- `src/lib/marina/designTemplates.ts` (novo): catálogo de modelos com prompt base e campos sugeridos + função que monta o prompt final a partir de modelo, especificações, formato, tom, CTA e estilo.
- `src/components/marina/design/DesignQuickActions.tsx`: seletor de modelo, campo longo de especificações, tom/CTA/estilo, prévia do prompt e ações de salvar/usar/apagar "Meus modelos".
- Migração: tabela `marina_design_templates` (`id`, `user_id`, `company_id`, `name`, `payload jsonb`, timestamps) com `GRANT` para `authenticated`/`service_role`, RLS habilitada e políticas restritas ao próprio usuário; hook `src/hooks/useMarinaDesignTemplates.ts`.


## Fora do escopo

Reconfiguração de OAuth na VPS, publicação automática em redes e revisão dos alertas do linter de segurança.
