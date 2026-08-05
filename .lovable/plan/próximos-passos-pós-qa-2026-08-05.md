# Próximos passos — pós-QA

O QA funcional (Blocos 1 a 6) está concluído, incluindo a matriz de permissões por papel com os usuários de teste. O que sobrou são lacunas reais encontradas durante os testes, na ordem abaixo.

## 1. Configurações Financeiras (tela em construção)

`/finance/settings` hoje mostra apenas "Módulo em construção", embora o menu e o tour já apontem para ela. A tabela de categorias financeiras existe no banco e está vazia — nenhuma tela grava nela.

O que será construído:
- **Categorias financeiras**: CRUD com nome e tipo (receita/despesa), ativar/desativar, segmentado por empresa. Passa a alimentar os seletores de Contas a Pagar, Contas a Receber e Reembolsos.
- **Alertas de vencimento**: definir quantos dias antes do vencimento o sistema avisa (contas a pagar e a receber) e quem recebe o aviso.
- **Preferências**: categoria padrão e visibilidade de valores no dashboard.
- Seed inicial de categorias comuns (Serviços, Materiais, Impostos, Folha, Viagens) na primeira abertura da tela.

## 2. Notificações por e-mail e WhatsApp

Hoje as notificações do sistema são in-app. Existe backend de WhatsApp, mas não existe envio de e-mail transacional.

O que será construído:
- Central de preferências por usuário: escolher canal (in-app, e-mail, WhatsApp) por tipo de evento — aprovações, documentos vencendo, ASO, férias, chamados.
- Envio de e-mail transacional com os principais gatilhos de RH e aprovações.
- Reaproveitar o envio de WhatsApp já existente para os mesmos gatilhos, respeitando as preferências.
- Registro de entregas para auditoria e reenvio.

## 3. Retomada do plano de RH (ondas seguintes)

As Ondas 1 e 2 (núcleo legal/documental, SST/ASO, férias, folha) estão entregues e testadas. As ondas seguintes do relatório da responsável de RH continuam pendentes e entram depois dos itens 1 e 2, uma por vez, com validação sua entre cada uma.

## Detalhes técnicos

- **Financeiro**: nova tela com abas usando os componentes padrão; hook `useFinanceSettings` sobre `finance_categories` + nova tabela de preferências de alerta por empresa (com GRANT, RLS e políticas por `company_id`). Alertas rodam na função agendada de verificação já existente.
- **Notificações**: nova tabela de preferências de canal por usuário e tipo de evento; nova Edge Function de e-mail (registrada em `supabase/config.toml` com `verify_jwt = true`); despacho central que lê a preferência e chama in-app, e-mail ou o `send-whatsapp` existente. Configuração de domínio de e-mail é pré-requisito do envio real.
- Sem alteração nas rotas nem nos papéis; a tela financeira permanece restrita a `financeiro`, `director` e `super_admin`.

## Fora de escopo

- Módulo de Qualidade (em produção, não será testado nem alterado).
- Migração de voz full-duplex da Marina.
