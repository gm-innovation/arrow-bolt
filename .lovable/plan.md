Plano para corrigir o que ainda não aparece:

1. Tornar a aba de transferência visível no modal de detalhes de oportunidades de serviço/indefinidas no `/admin/opportunities`, sem afetar oportunidades de Comercial/Marketing que continuam somente leitura.

2. Ajustar o comportamento do modal para que a lista de abas não esconda a opção “Transferência” em larguras menores: usar layout responsivo/rolável para as abas em vez de uma grade fixa que pode deixar a última aba fora da área visível.

3. Corrigir a lista de destinatários da transferência para buscar coordenadores com o mesmo padrão de papéis do projeto, evitando depender de papéis antigos como `manager`/`admin` quando o fluxo esperado é entre `coordinator` e `director`.

4. Após transferência direta ou aceite, invalidar/recarregar também as queries usadas pela tela admin (`crm-opportunities`) e chamar o reload da página para refletir imediatamente o novo responsável.

5. Verificar no código que o modal renderiza a aba “Transferência” para oportunidades `service` e `unknown`, e que ela permanece oculta apenas para `product`.