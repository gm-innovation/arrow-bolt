

## Plano: Adicionar seção Omie nas Configurações do Super Admin

### Problema
O `OmieSettingsTab` foi criado e adicionado em `src/pages/admin/Settings.tsx`, mas a página `src/pages/super-admin/Settings.tsx` (onde o usuário está) não inclui essa seção.

### Alteração

**`src/pages/super-admin/Settings.tsx`**
- Adicionar um novo `Card` para "Integração Omie" no grid existente (junto com Notificações, WhatsApp, Personalização, Auditoria)
- Reutilizar o componente `OmieSettingsTab` já criado, importando-o diretamente
- Manter o layout em grid de 2 colunas, o card do Omie será adicionado como 5º card

