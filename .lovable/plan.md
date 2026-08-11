# Marina: entender "passa a Belga Marine para a Gabriele"

## Por que ela não entendeu (verificado no código)

Três lacunas reais, não é questão de "treino":

1. **Ela não consegue procurar pessoas.** A ferramenta que lista colaboradores (`query_hr_employees`) só está liberada para RH/diretoria. O perfil comercial não tem nenhuma ferramenta de busca de pessoas — por isso ela respondeu "não encontrei nenhum registro de Gabril" sem ter consultado nada, e não conseguiu sugerir "Gabriele" como correção do nome.
2. **Ela não sabe o que é a Belga Marine.** A Belga Marine é um **lead do site** (aparece na coluna "Leads do Site" do pipeline). Marina buscou em clientes e oportunidades, não encontrou, e pediu CNPJ. Ela tem leitura de leads, mas nenhuma ferramenta para **atribuir responsável** a um lead.
3. **Ela não consegue trocar o responsável de nada.** Na definição de escrita de oportunidades os campos editáveis são título, estágio, valor e data de fechamento — `assigned_to` (responsável) não existe. Ou seja, mesmo tendo entendido o pedido, não havia como executá-lo.

## O que vai ser feito

### 1. Marina passa a reconhecer pessoas da empresa
- Ferramenta de busca de pessoas disponível para todos os perfis (nome, cargo, área), somente leitura e restrita à empresa do usuário.
- Busca tolerante a erro de digitação e a nome parcial: "Gabril" → sugere "Gabriele Camorim"; "passa pra Gabi" resolve sozinha quando há só uma candidata; com mais de uma, lista numerada curta.
- Nunca mais responder "não existe essa pessoa" sem ter consultado a lista.

### 2. Atribuir responsável (a ação pedida)
- Oportunidades: passa a ser possível trocar o responsável.
- Leads do site: nova ação de atribuir responsável e registrar a mudança.
- Regra de execução: resolve pessoa + resolve registro e **executa no mesmo turno**, com a verificação pós-escrita que já existe (relê o banco e confirma). Se faltar exatamente uma informação, faz uma pergunta curta — nunca "aguarde um momento".

### 3. Entender "Belga Marine" sem pedir CNPJ
- Antes de pedir qualquer identificador, procurar o nome em **leads do site, clientes e oportunidades** de uma vez.
- Quando o nome aparece só em leads, tratar como lead e dizer isso ("A Belga Marine está como lead do site"), em vez de pedir CNPJ.
- "o pedido da Belga Marine" com um único registro compatível → age direto.

### 4. Correção de nome no meio da conversa
- Quando o usuário corrige um nome ("é a Gabriele"), a correção substitui o anterior e a ação pendente continua de onde parou, sem reiniciar o diálogo nem repetir a pergunta.

## Validação
- "a Belga Marine quem vai atender é a Gabriele" → responsável do lead Belga Marine passa a ser Gabriele, com confirmação do estado lido do banco.
- "quem é a Gabril?" → sugere Gabriele.
- "passa a RFQ pelo site — Cahuã pra Gabriele" → troca o responsável da oportunidade.
- Conferir nos registros da função que a busca de pessoas e a escrita realmente aconteceram.

## Detalhes técnicos
- `supabase/functions/ai-assistant/tools.ts`: nova ferramenta universal de busca de pessoas (`profiles` da empresa, com normalização/similaridade de nome); `assigned_to` nos campos de atualização de `crm_opportunities`; nova escrita de atribuição em `public_site_leads` (responsável + status), respeitando RLS.
- `supabase/functions/ai-assistant/index.ts`: detecção de intenção "atribuir/passar para alguém" → busca preventiva de pessoa + registro (lead/cliente/oportunidade) antes da resposta; foco da conversa passa a guardar a pessoa mencionada; regra de persona proibindo negar existência de pessoa sem consulta.
- Sem migração de banco caso `public_site_leads` já tenha coluna de responsável; se não tiver, uma migração mínima com `GRANT` + RLS para a coluna de atribuição.
