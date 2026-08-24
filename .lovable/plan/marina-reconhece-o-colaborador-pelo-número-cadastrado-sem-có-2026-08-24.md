# Marina reconhece o colaborador pelo número cadastrado (sem código)

## Objetivo
A Marina identifica automaticamente quem está falando com ela no WhatsApp pelo número cadastrado no RH — o colaborador **não precisa de nenhum código de autenticação**. Quem não for colaborador cadastrado recebe uma recusa educada e a conversa não avança. As permissões de cada um seguem o papel cadastrado no Arrow.

(O código de pareamento que já implementamos é outra coisa: ele vincula o **número da Marina** à Evolution API e continua existindo apenas na central do Super Admin.)

## Estado atual (confirmado)
- `whatsapp-in` só resolve identidade via `channel_identities` e exige o fluxo manual de código de 6 dígitos para números novos.
- `profiles.phone` é capturado no cadastro de colaborador (`NewEmployeeForm`) e `hr_employee_contacts` já tem kind `whatsapp`/`celular` (aba Contatos da ficha).
- Permissões já funcionam após resolução: `whatsapp-in` lê `user_roles` e passa `userRole` ao `ai-assistant`, que filtra as ferramentas por papel.
- `profiles.employee_status` permite recusar desligados/inativos.

## O que será feito

### 1. Migration: função `resolve_employee_by_phone(p_phone)`
- `SECURITY DEFINER`, normaliza variantes BR do número: com/sem DDI 55, com/sem 9º dígito.
- Procura o número em `profiles.phone` e em `hr_employee_contacts.value` (kinds `telefone`, `celular`, `whatsapp`).
- Retorna `user_id`, `company_id`, `full_name`, `employee_status` e quantos usuários distintos casaram.
- Sem tabelas novas — apenas a função.

### 2. `whatsapp-in`: resolução só pelo cadastro (fim do código de 6 dígitos)
```text
mensagem entra
  ├─ channel_identities (vínculo já criado) → Marina (fluxo atual)
  └─ não achou → resolve_employee_by_phone:
       ├─ 1 colaborador ativo → AUTO-VÍNCULO:
       │    cria channel_identities (verified=true, origem cadastro),
       │    saudação "Olá, {nome}! Sou a Marina... já sei quem você é
       │    pelo seu cadastro" e segue com o papel do usuário
       ├─ desligado/inativo → recusa educada (ex-colaborador)
       ├─ ambíguo (>1 usuário com o mesmo número) → recusa pedindo
       │    para procurar o RH corrigir o cadastro
       └─ não encontrou → recusa: "Sou a Marina, assistente dos
            colaboradores da Lecsor/GM Innovation. Só consigo atender
            números cadastrados — procure o RH para cadastrar seu
            WhatsApp." (nada mais é processado)
```
- Todo o trecho de verificação de código (`verification_code`, `pending_verification`) sai do `whatsapp-in`.

### 3. Frontend
- `NewEmployeeForm`: label "Telefone" → "Telefone / WhatsApp" + checkbox "Este número tem WhatsApp" (marcado por padrão); quando marcado, grava também em `hr_employee_contacts` (kind `whatsapp`, categoria pessoal).
- `/account` (`WhatsAppLinkCard`): remove a geração de código; vira um card de **status somente leitura** mostrando qual número a Marina reconhece para o usuário logado (e orientando a falar com o RH se estiver errado/ausente).
- Verificar que a importação CSV de colaboradores já popula `profiles.phone` (se não, ajustar o mapeamento).

### 4. Sem mudança em permissões
O papel já é lido de `user_roles` a cada mensagem e repassado à Marina — técnico, RH, diretor etc. mantêm suas restrições no WhatsApp automaticamente.

## Casos de borda
- Número compartilhado entre 2 cadastros: não vincula; recusa orientando o RH a corrigir.
- Troca de número: RH atualiza o cadastro; na próxima mensagem do novo número ocorre o auto-vínculo. O vínculo antigo deixa de receber mensagens (número antigo não está mais no cadastro).
- `emergency_contact_phone` **não** entra na resolução.

## Validação
- Simular webhook com `curl`: número cadastrado (auto-vínculo + saudação), não cadastrado (recusa), desligado (recusa).
- Confirmar que mensagem não processada não gera conversa nem chama a IA.
- Teste com 2 perfis (técnico e diretor) confirmando que as ferramentas disponíveis mudam conforme o papel.
