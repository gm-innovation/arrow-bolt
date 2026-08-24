# Email do colaborador: esclarecer, reposicionar e permitir edição

## Respostas às perguntas

**1. A Marina verifica pelo número ou também por email?**
Somente pelo **número de telefone**. O WhatsApp (Evolution API) só informa o número de quem enviou a mensagem — o canal não carrega email. Além disso, pedir o email na conversa não seria seguro: qualquer pessoa poderia digitar o email de um colaborador, enquanto a posse do número de WhatsApp é a própria prova de identidade. Nada a mudar aqui.

**2. O email da ficha é do colaborador ou do contato de emergência?**
É do **colaborador** — é o email de login dele no Arrow. Hoje ele aparece como campo somente-leitura logo abaixo do bloco "🚨 Contato de Emergência", o que causa a confusão, e não há como editá-lo pela tela.

## Estado atual (confirmado)

- `EmployeeDetailSheet.tsx` (aba Pessoal): email está em `readOnlyFields` (linha 469), renderizado depois de "Na empresa desde", colado ao bloco de emergência.
- A Edge Function `update-user` já suporta troca de email: valida formato, atualiza `profiles.email` e `auth.users.email` (login) com confirmação automática, e autoriza os papéis `super_admin`, `hr` e `director`.
- O hook `useAllUsers.updateUser` já encapsula a chamada — só não é usado na ficha do colaborador.

## O que será feito

### 1. Reorganizar a aba Pessoal da ficha (`EmployeeDetailSheet.tsx`)
- Criar uma seção própria **"Acesso ao sistema"** no topo da aba (logo após Nome completo), contendo o campo **"Email de acesso (login)"** — separado visualmente do bloco de Contato de Emergência.
- Remover o email da lista `readOnlyFields` (ele sai da posição confusa atual).
- Manter "Cargos" como somente-leitura.

### 2. Tornar o email editável
- Em modo de edição, o campo vira um `Input` com validação de formato.
- Ao salvar com email alterado: chamar `useAllUsers.updateUser` (Edge Function `update-user`), que sincroniza login (`auth.users`) e cadastro (`profiles`) atomicamente.
- Aviso inline no campo: "Alterar o email muda o login do colaborador no sistema".
- Se a troca de email falhar (ex.: email já em uso), exibir o erro e não concluir a edição dos demais campos como se tivesse trocado.

### 3. Sem migration
Nenhuma mudança de banco — a função e as permissões já existem.

## Validação
- Abrir a ficha de um colaborador como RH: email aparece na seção "Acesso ao sistema", fora do bloco de emergência.
- Editar o email de um colaborador de teste, salvar, recarregar e confirmar o novo valor.
- Confirmar no banco que `profiles.email` e o login foram atualizados juntos.
- Testar email inválido (validação) e email duplicado (erro exibido).
