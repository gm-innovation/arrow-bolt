## Problema
As sugestões rápidas exibidas ao abrir a Marina são fixas em `src/components/ai/AIChat.tsx` e mapeiam apenas `technician / admin / manager`. Qualquer outro papel (commercial, marketing, coordinator, director, hr, quality, supplies, finance, super_admin) cai no fallback `technician`, mostrando perguntas de campo ("sinal fraco", "ferramentas de instalação", "manutenção no radar").

## Correção
Editar `src/components/ai/AIChat.tsx`:

1. Expandir o mapa `quickSuggestions` cobrindo todos os papéis reais do Arrow, cada um com 3 perguntas coerentes:
   - **commercial / marketing**: leads do site, oportunidades em aberto, follow-ups pendentes, CNPJ.
   - **coordinator / admin**: OSs pendentes, técnicos disponíveis hoje, produtividade da semana.
   - **director / manager**: KPIs consolidados, comparativo de coordenadores, aprovações pendentes.
   - **hr**: exames ASO a vencer, férias pendentes, documentos obrigatórios em atraso.
   - **quality**: NCs em aberto, documentos para revisão, conscientizações pendentes.
   - **supplies**: solicitações de compra em aberto, homologações pendentes, provedores críticos.
   - **finance**: contas a pagar da semana, recebíveis em atraso, reembolsos pendentes.
   - **super_admin**: chamados abertos na inbox de suporte, novas empresas, saúde do sistema.
   - **technician**: manter as atuais (campo).

2. Trocar o fallback `quickSuggestions.technician` por um conjunto **neutro** ("Como abrir um chamado de suporte?", "Onde encontro o manual desta tela?", "Como criar um novo registro aqui?") para qualquer papel não mapeado.

Sem mudanças em backend, prompt ou tools — apenas a lista visual de atalhos.
