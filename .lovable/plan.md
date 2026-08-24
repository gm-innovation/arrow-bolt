# Marina reconhece o colaborador pelo número cadastrado

## Objetivo
Quando um colaborador chamar a Marina no WhatsApp, ela identifica automaticamente quem é pela base de cadastro (RH) — sem precisar do código de 6 dígitos — e aplica as permissões do papel dele. Quem não for colaborador cadastrado recebe uma recusa educada e a conversa não avança.

## Estado atual (confirmado)
- `whatsapp-in` só resolve identidade via `channel_identities`; número desconhecido recebe instrução de gerar código no app.
- `profiles.phone` é capturado no cadastro de colaborador (`NewEmployeeForm`) e `hr_employee_contacts` já tem kind `whatsapp`/`celular` (aba Contatos da ficha).
- Permissões já funcionam após resolução: `whatsapp-in` lê `user_roles` e passa `userRole` ao `ai-assistant`, que filtra as ferramentas por papel.
- `profiles.employee_status` permite recusar desligados/inativos.

## O que será feito

### 1. Migration: função `resolve_employee_by_phone(p_phone)`
- `SECURITY DEFINER`, normaliza variantes BR do número: com/sem DDI 55, com/sem 9º dígito.
- Procura o número em `profiles.phone` e em `hr_employee_contacts.value` (kinds `telefone`, `celular`, `whatsapp`).
- Retorna `user_id`, `company_id`, `full_name`, `employee_status` e quantos usuários distintos casaram.
- Sem tabelas novas — apenas a função.

### 2. `whatsapp-in`: nova ordem de resolução
```text
mensagem entra
  ├─ channel_identities (vínculo existente) → Marina (fluxo atual)
  ├─ não achou → resolve_employee_by_phone:
  │    ├─ 1 colaborador ativo → AUTO-VÍNCULO:
  │    │    cria channel_identities (verified=true, origem cadastro),
  │    │    saudação "Olá, {nome}! Reconheci seu número pelo cadastro..."
  │    │    e segue para a Marina com o papel do usuário
  │    ├─ desligado/inativo → recusa educada (ex-colaborador)
  │    ├─ ambíguo (>1 usuário com o número) → cai no fluxo do código de 6 dígitos
  │    └─ não encontrou → recusa: "Sou a Marina, assistente dos colaboradores
  │         da Lecsor/GM Innovation. Só consigo atender números cadastrados —
  │         procure o RH para cadastrar seu WhatsApp." (nada mais é processado)
  └─ fluxo do código de 6 dígitos permanece como alternativa
```

### 3. Cadastro do número (frontend, mínimo)
- `NewEmployeeForm`: label "Telefone" → "Telefone / WhatsApp" + checkbox "Este número tem WhatsApp" (marcado por padrão); quando marcado, grava também em `hr_employee_contacts` (kind `whatsapp`, categoria pessoal).
- Aba Contatos da ficha já permite adicionar/editar contato `whatsapp` — sem mudança estrutural.
- Verificar que a importação CSV de colaboradores já popula `profiles.phone` (se não, ajustar o mapeamento).

### 4. Sem mudança em permissões
O papel já é lido de `user_roles` a cada mensagem e repassado à Marina — técnico, RH, diretor etc. mantêm suas restrições no WhatsApp automaticamente.

## Casos de borda
- Número compartilhado entre 2 cadastros: não auto-vincula; exige código (evita impersonação).
- Troca de número: colaborador desvincula em `/account`; o novo número auto-vincula se estiver no cadastro.
- Número de emergência (`emergency_contact_phone`) **não** entra na resolução.

## Validação
- Simular webhook com `curl`: número cadastrado (auto-vínculo + saudação), não cadastrado (recusa), desligado (recusa) e código de 6 dígitos (fluxo atual intacto).
- Teste com 2 perfis (técnico e diretor) confirmando que as ferramentas disponíveis mudam conforme o papel.
