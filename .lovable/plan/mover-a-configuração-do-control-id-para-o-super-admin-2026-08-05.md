# Mover a configuração do Control iD para o Super Admin

A conexão com o relógio biométrico (Control iD) é infraestrutura, não rotina de RH. Ela sai da tela de Ponto e Jornada e passa a viver em **API & Integrações**, no Super Admin, com seleção de empresa.

## O que muda

**Super Admin → API & Integrações** ganha uma nova aba "Relógios de ponto":
- Seletor de empresa (mesmo padrão já usado nas abas de chaves de API e integrações B2B).
- Lista dos relógios da empresa escolhida: nome, endereço, ativo, última sincronização.
- Cadastrar / editar relógio: nome, endereço (base URL), usuário, nome do segredo da senha, ativo, observações.
- Botão de sincronizar batidas por relógio e histórico das últimas sincronizações.
- Aviso de que a senha do equipamento é guardada como segredo do sistema (nunca digitada aqui).

**RH → Ponto e Jornada (`/hr/timesheet`)**:
- A aba "Relógios" deixa de permitir cadastrar/editar equipamento.
- Vira "Equipamento & Matrículas", somente leitura do status dos relógios (nome, ativo, última sincronização) com nota de que a configuração é feita pelo Super Admin.
- Permanece no RH o que é operação diária: vínculo de **matrículas** dos colaboradores, botão de **sincronizar batidas** e histórico de sincronizações.

## Permissões

Hoje só quem gerencia ponto na própria empresa consegue ler/gravar os relógios, então o Super Admin não conseguiria configurar de outra empresa. A regra de acesso da tabela de relógios passa a permitir também `super_admin` (global), mantendo RH/coordenação com leitura para acompanhar o status.

## Detalhes técnicos

- Migração: substituir a policy `timeclock_devices_manage` por duas — `super_admin` com acesso total (via `has_role`), e RH/gestão de ponto restrita à própria empresa (mantendo `hr_can_manage_time`). Sem mudança de colunas.
- `src/hooks/useHRTimesheet.ts`: expor `devices`/`saveDevice` aceitando `companyId` explícito para reuso no Super Admin, ou extrair um hook `useTimeclockDevices(companyId)` compartilhado.
- Novo componente `src/components/super-admin/TimeclockDevicesTab.tsx` consumido em `src/pages/super-admin/ApiDocs.tsx` como quarta `TabsTrigger`/`TabsContent` (`value="timeclock"`).
- `src/pages/hr/Timesheet.tsx`: remover o `Dialog` de relógio e o botão "Novo relógio"; tabela em modo leitura + link/aviso apontando para o Super Admin.
- Edge Function `hr-timeclock-sync` continua igual (já resolve o segredo pelo `password_secret_name`); apenas passa a ser chamada também da tela do Super Admin com `device_id`.
- Após aprovar, ainda faltará salvar o segredo `CONTROL_ID_PASSWORD` com a senha real do equipamento para a sincronização funcionar.
