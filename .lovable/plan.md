# Documento Executivo: "O que é o Arrow"

Vou gerar um PDF institucional/executivo consolidando toda a visão do sistema, para uso comercial, apresentação a investidores, onboarding de novos usuários e material de referência interno.

## Formato de entrega

- **Arquivo**: `Arrow_Visao_Completa_v1.pdf` em `/mnt/documents/`
- **Identidade visual**: Lecsor Technology (mesma paleta dos manuais anteriores — azul-marinho profundo, acentos em ciano, tipografia limpa)
- **Extensão estimada**: 18–22 páginas A4
- **Idioma**: Português (Brasil)

## Estrutura do documento

**1. Capa + Sumário Executivo (1 pág)**
Pitch de 1 parágrafo: o que o Arrow é em uma frase, para quem serve, qual problema resolve.

**2. O que é o Arrow (2 págs)**
- Definição: ERP + PSA + SGQ + RH/DP + CRM operados por uma copiloto de IA (Marina)
- Origem: nascido da operação real de serviços técnicos marítimos/industriais
- Filosofia: "um sistema, uma linguagem, uma IA que conhece o negócio inteiro"

**3. Para quem é (1 pág)**
- Perfil de empresa-alvo: prestadoras de serviço técnico especializado (marítimo, industrial, laboratorial, calibração, engenharia de campo)
- Perfis de usuário: Diretor, Coordenador/Admin, Técnico, RH, Comercial, Financeiro, Qualidade, Compras, Marketing, Super Admin
- Casos de uso reais (docagens, OS técnicas, medições, homologações)

**4. Como funciona — os módulos (6–8 págs)**
Bloco por módulo, com "o que resolve" e "como se conecta com o resto":
- Ordens de Serviço + Medições + Docagens
- CRM Comercial (Leads → Oportunidades → Vendas → Recorrências)
- RH/DP (ASO, férias, documentos por cargo, onboarding público, hierarquia)
- SGQ ISO 9001 (documentos, NCRs, auditorias, riscos, SWOT, partes interessadas)
- Suprimentos (compras, homologação de fornecedores)
- Financeiro (contas a pagar/receber, reembolsos)
- Universidade Corporativa (trilhas, certificados, gamificação)
- Feed Corporativo + Solicitações + Gamificação (XP/Badges)
- Integrações (Omie ERP, Eva medições, e-mail, WhatsApp roadmap)

**5. A Marina — copiloto de IA (3 págs)**
- O que ela é: assistente operacional com escrita auditada, não um chatbot decorativo
- O que ela faz hoje: consulta dados, cria/edita registros com confirmação, sugere ações contextuais por papel, lê anexos (PDF/Word/Excel), abre chamados para o Super Admin
- Como opera com segurança: filtro por RLS + escopo configurável em `/super-admin/ai-management` + log em `ai_assistant_actions`
- Canal bidirecional Marina ↔ Super Admin: tickets com contexto técnico + prompt de correção auto-gerado
- RAG sobre manuais: responde dúvidas de uso citando o próprio manual do Arrow
- Roadmap: sugestão de OST/Roadmap de produto, refresh automático de métricas

**6. Diferenciais de mercado (2 págs)**
- Contra ERPs tradicionais (Omie, TOTVS, Sankhya): o Arrow é operacional + estratégico, não só fiscal/financeiro
- Contra PSAs genéricos: modelado para serviço técnico com medição por HH/materiais/despesas/deslocamento, docagens multi-atividade, ASO obrigatório por embarque
- Contra "IA plugada": Marina não é wrapper de ChatGPT — ela age dentro do sistema com permissões reais
- Multi-empresa nativo com RLS
- Dashboard de PM próprio: o produto se mede continuamente

**7. Governança, segurança e conformidade (1 pág)**
- RLS em todas as tabelas
- Papéis segregados (Diretor ≠ Coordenador ≠ Super Admin)
- Auditoria de ações da IA e de documentos
- LGPD: PII segregada em RPCs

**8. Roadmap resumido (1 pág)**
As ondas de RH pendentes, expansão de canais (e-mail/WhatsApp), PM Dashboard fase 2 (OST-suggest + cron), etc.

**9. Contato / próximos passos (1 pág)**

## Como será gerado

- Script Python com **reportlab** + fonte **DejaVu Sans** (acentos PT-BR)
- Paleta e diagramação alinhadas aos manuais anteriores da Lecsor
- Ícones/box de destaque via shapes (sem imagens externas para não quebrar)
- Diagrama simples da arquitetura modular (blocos ligando módulos à Marina no centro)
- Todas as páginas renderizadas em JPG e inspecionadas antes da entrega (QA obrigatório)

## Detalhes técnicos

- Skill `pdf` para geração e QA visual página a página
- Cabeçalho/rodapé fixo com "Arrow por Lecsor Technology — Visão Completa v1"
- Numeração de páginas e sumário clicável (bookmarks)
- Após render, converter para JPG (`pdftoppm -r 150`) e revisar cada página; corrigir overflow/contraste antes de entregar

Se aprovar, gero o `Arrow_Visao_Completa_v1.pdf` já com QA visual completo.
