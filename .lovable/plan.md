# Aviso de lead novo + conversão em Oportunidade

## O que já existe
- Edge Function `public-lead-intake` já insere notificações no sininho — mas só para `coordinator`, `director` e `admin`, e o link aponta para `/manager/site-leads` (rota errada).
- A tela `/commercial/site-leads` lista os leads e permite marcar status (Novo, Revisado, Convertido, Descartado), mas "Convertido" hoje é só um rótulo — não cria nada no CRM.

## Mudanças

### 1. Notificação correta para o time comercial
- Atualizar `public-lead-intake` para também notificar usuários com role `commercial` e `marketing` da empresa do lead.
- Corrigir o `link` da notificação para `/commercial/site-leads`.
- Texto continua direto: "Nova solicitação de proposta — Fulano <email>" / "Novo contato pelo site — Fulano <email>".
- O sino (`NotificationBell`) já reage a inserts em `notifications` em tempo real, então o aviso vai aparecer sozinho.

### 2. Vincular lead a Oportunidade (CRM)
- Acrescentar duas colunas em `public_site_leads`: `opportunity_id uuid` e `converted_at timestamptz`, ambas anuláveis. Index em `opportunity_id`.
- Na tela `/commercial/site-leads`, dentro do diálogo "Ver lead", adicionar botão **"Converter em oportunidade"** (visível enquanto `opportunity_id` for nulo).
- Esse botão abre um sub-diálogo simples com:
  - **Cliente** (Combobox sobre `crm_clients` da empresa). Se o lead trouxe `company_name` mas o cliente ainda não existe, oferecer link "Cadastrar novo cliente" que abre a tela de cliente em nova aba (não duplicamos formulário aqui — segue o padrão do CRM).
  - **Comprador / contato** (opcional, Combobox de `crm_buyers` filtrado pelo cliente; com botão "+ Criar a partir do lead" que cria um `crm_buyers` usando nome/email/telefone do lead).
  - **Título** (pré-preenchido: "RFQ pelo site — {nome do lead}" ou "Contato pelo site — {nome}").
  - **Tipo da oportunidade** (Select: usar valores já existentes de `crm_opportunities.opportunity_type`).
  - **Valor estimado** (numérico, opcional).
  - **Descrição/notas** (textarea, pré-preenchida com a `message` do lead + lista de `items` em texto).
  - **Responsável** (default = usuário atual; pode trocar por outro `commercial`/`coordinator` da empresa).
- Ao confirmar:
  1. Insere em `crm_opportunities` (`stage='qualification'`, `created_by=auth.uid()`, demais campos do diálogo).
  2. Atualiza o lead: `opportunity_id`, `converted_at = now()`, `status = 'converted'`.
  3. Toast de sucesso + opção "Abrir oportunidade".
- Quando `opportunity_id` já existe, o diálogo do lead mostra um link **"Ver oportunidade →"** em vez do botão de conversão. Na linha da tabela, badge "Convertido" vira link clicável.

### 3. Pequenas melhorias na lista
- Coluna "Status" passa a destacar em accent quando há `opportunity_id` vinculada.
- Filtro rápido "Mostrar só pendentes" (esconde `converted` e `discarded`) — útil para o dia a dia comercial.

## Detalhes técnicos

Migration:
```sql
ALTER TABLE public.public_site_leads
  ADD COLUMN opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN converted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_public_site_leads_opportunity ON public.public_site_leads(opportunity_id);
```

RLS já cobre (foi liberada agora para `commercial`/`marketing`/`coordinator`/`director`/`admin`), então o UPDATE da conversão funciona client-side. A criação da oportunidade usa as policies existentes de `crm_opportunities`.

Edge Function (`public-lead-intake/index.ts`):
- Trocar `.in('role', ['coordinator','director','admin'])` por `['coordinator','director','admin','commercial','marketing']`.
- Trocar `link: '/manager/site-leads'` por `'/commercial/site-leads'`.

Frontend:
- Editar `src/pages/commercial/SiteLeads.tsx`: adicionar tipos `opportunity_id`, `converted_at`, novo sub-diálogo de conversão, hook leve para listar `crm_clients`/`crm_buyers` (paginados/Combobox conforme padrão de telas grandes).
- Sem mexer em `Opportunities.tsx`; a oportunidade criada aparece naturalmente lá.

## Fora de escopo
- Reagir automaticamente a leads (auto-criar oportunidade sem revisão humana). Mantemos confirmação manual.
- Roteamento por produto/serviço de interesse para responsável específico — fica para depois.
- E-mail externo de notificação — só sino interno por enquanto.
