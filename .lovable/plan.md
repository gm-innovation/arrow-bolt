## Manual Passo a Passo Ilustrado — Coordenador/Gerente v1

Mesmo padrão do Manual Comercial/Marketing v3: PDF + DOCX A4, identidade Lecsor, prints via Playwright, descrições funcionais e fluxos operacionais.

### Estrutura (≈30 páginas)

1. **Capa & sumário** — Lecsor Technology, versão, data, público-alvo.
2. **Introdução** — papel do Coordenador/Gerente/Admin, escopo de acesso, boas práticas.
3. **Login & Dashboard** — KPIs (OSs, técnicos, leads novos/em contato/convertidos/descartados), atalhos.
4. **Ordens de Serviço** — criar, editar, transferir técnicos, docagem, status, anexos.
5. **Calendário Operacional** — visualização mensal/semanal, agendamento, ausências, on-call.
6. **Clientes** — cadastro unificado (multi-CNPJ/endereços/embarcações), busca por CNPJ, contatos.
7. **Kanban Unificado (Leads & Oportunidades)** — coluna "Leads do Site", conversão, aba tabela, filtros por status.
8. **Medições Finais** — abrir via linha de OS, abas (Serviços/Materiais/H-H/Despesas/Viagens), regras de propriedade.
9. **Técnicos** — reservas, localizações, documentos, ausências, histórico.
10. **Relatórios & Histórico** — history por OS, embarcação, exportações.
11. **Feed Corporativo & Solicitações** — abrir solicitação, aprovar, comentar, kudos.
12. **Universidade Corporativa** — matrículas, trilhas, certificados.
13. **Grupos** — criação, membros, discussões.
14. **Notificações & IA** — assistente Marina, ações permitidas, dupla confirmação em exclusões.
15. **Configurações & Perfil** — senha, avatar, preferências.
16. **Anexo A — Papéis e Permissões** — Coordinator = Manager = Admin; escopo vs Diretor/Super Admin.
17. **Anexo B — Solução de Problemas** — timeouts, VAPID, retry automático.

### Processo de geração
1. Autenticar Playwright como coordinator (`engenharia@googlemarine.com.br`).
2. Capturar 25–30 screenshots das rotas listadas em resolução 1280×1800.
3. Anotar prints (setas/retângulos) via PIL para destacar botões e áreas.
4. Gerar DOCX com `docx-js` (capa, sumário, headings estilizados, imagens embutidas).
5. Converter para PDF via LibreOffice.
6. QA visual: converter PDF em JPGs e revisar página a página; corrigir e reprocessar.
7. Publicar em `/mnt/documents/Manual_Coordenador_Passo_a_Passo_v1.{pdf,docx}` com `<presentation-artifact>`.

### Entregáveis
- `Manual_Coordenador_Passo_a_Passo_v1.pdf`
- `Manual_Coordenador_Passo_a_Passo_v1.docx`

Sem alterações de código no projeto — apenas geração de documentação.
