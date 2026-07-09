# Auditoria do Módulo de RH

## ✅ Já implementado e funcional
| Requisito | Onde | Status |
|---|---|---|
| Cadastro e gestão de colaboradores | `/hr/employees`, hierarquia, cargos | OK |
| Documentos digitais + alertas de vencimento | `/hr/documents`, `/hr/document-compliance`, `/hr/document-reviews`, catálogo por cargo | OK |
| Afastamentos (atestado, licença, home office, treinamento) | `/hr/absences` (`useAbsences`) | OK |
| Controle de ponto | `/hr/time-control` (`useHRTimeEntries`, ajustes, relatório PDF/XLSX) | OK |
| EPI (estoque, entregas, fichas) | `/hr/epi` | OK |
| Treinamentos e certificados | Universidade Corporativa (`/corp/university`, trilhas, certificados PDF) | OK |
| Comunicação interna / endomarketing | Feed, Grupos, Aniversariantes, Kudos, Badges | OK |
| Dashboards e relatórios | `/hr/dashboard`, `/hr/reports`, conformidade documental | OK |
| Notificações automáticas | `notifications` + triggers de documentos, revisões, RH | OK |
| Controle de acesso por perfil | RBAC (`user_roles`, `has_role`, RLS) | OK |
| Autoatendimento do colaborador | `/corp/my-documents`, `/corp/requests`, perfil, alterar senha | OK |
| Fluxos eletrônicos de aprovação | `corp_requests` (Folga/Férias, Documento, Reembolso, etc.) com aprovação de gestor/diretor | OK |
| Recrutamento & Onboarding | `/hr/recruitment`, `/hr/onboarding` (link público, docs admissionais) | OK |

## ⚠️ Lacunas identificadas
1. **Exames ocupacionais (ASO) / SST clínica** — não há entidade dedicada. Hoje ASO entra como documento genérico, sem tipo (admissional/periódico/mudança de função/retorno/demissional), sem clínica, sem médico responsável, sem agendamento e sem alerta baseado em periodicidade legal (NR-7 / PCMSO).
2. **Contratos de trabalho e aditivos** — não existe registro estruturado de contrato (tipo CLT/PJ/estágio, data de admissão/desligamento, salário, jornada, aditivos, rescisão). Hoje só há documentos soltos.
3. **Fluxo dedicado de Férias** — hoje férias entram na fila genérica "Folga/Férias" em `corp_requests`, sem período aquisitivo, saldo de dias, abono pecuniário, 13º ou espelho para o gestor.
4. **Integração com folha de pagamento** — não existe exportação (CSV/SEFIP/eSocial) nem conector. Precisa de export mínimo mensal (ponto + absenteísmo + horas extras + adicionais).
5. **LGPD** — falta trilha de consentimento do colaborador, registro de acesso a dados pessoais (`data_access_log`) e página de política/direitos do titular no portal do colaborador.

---

# Plano de implementação (5 mini-ondas)

## Onda 1 — SST clínica (ASO e PCMSO)
- Tabela `hr_health_exams` (colaborador, tipo, data realização, próxima data, clínica, médico CRM, resultado apto/inapto/apto com restrição, anexo).
- Regras automáticas de "próxima data" por tipo (admissional na admissão, periódico anual/bienal por faixa etária/risco, demissional na saída).
- Página `/hr/health-exams` com Kanban Válido / A vencer 60 dias / Vencido.
- Alerta in-app + e-mail para RH e colaborador conforme política.
- Ação rápida a partir da ficha do colaborador ("Registrar ASO").

## Onda 2 — Contratos e vínculo
- Tabela `hr_contracts` (tipo, data admissão, data desligamento, salário base, jornada, centro de custo, motivo rescisão) + `hr_contract_amendments` (aditivos).
- Aba "Contrato" na ficha do colaborador com histórico e geração de PDF a partir de template.
- Bloqueio: colaborador só fica "Ativo" com contrato vigente.

## Onda 3 — Fluxo de férias completo
- Tabela `hr_vacation_balances` (período aquisitivo, dias devidos, dias gozados, dias vendidos, dias restantes) atualizada por trigger a partir da admissão.
- Novo tipo dedicado de solicitação "Férias" em `corp_requests` com campos: início, fim, dias, abono pecuniário (sim/não, dias), adiantamento 13º.
- Aprovação em 2 etapas (gestor direto → RH), com validação de saldo e antecedência mínima (30 dias).
- Aviso de férias em PDF e recibo assinável.

## Onda 4 — Exportação para folha
- Edge function `export-payroll` gerando CSV/XLSX mensal por colaborador com: horas trabalhadas, faltas, atestados, horas extras 50/100%, adicional noturno, DSR, férias no mês, afastamentos.
- Layouts pré-configuráveis (Domínio/Contmatic/eSocial simplificado) em `payroll_export_layouts`.
- Página `/hr/payroll-export` com seleção de mês + preview + download.

## Onda 5 — LGPD e autoatendimento reforçado
- Tabela `lgpd_consents` (colaborador, finalidade, versão do termo, aceite em, IP) + banner de aceite no primeiro login.
- Trigger `data_access_log` para toda leitura de dados sensíveis (ASO, contrato, documentos pessoais) via função `SECURITY DEFINER` chamada nos hooks.
- Página `/corp/my-privacy`: exportar meus dados (JSON/PDF), solicitar correção, solicitar anonimização (vira `corp_request` roteado ao Encarregado).
- Configuração de "Encarregado LGPD" (DPO) em `hr_settings`.

---

## Detalhes técnicos
- Todas as tabelas novas em `public.*` com `GRANT` para `authenticated` e `service_role`, RLS via `has_role('hr'|'director'|'super_admin')` + self.
- Notificações reutilizam a fila `notifications` + template Resend já em uso.
- Alertas de ASO/documentos consolidados em uma única edge function `check-hr-compliance` (cron diário) que hoje já roda para documentos — apenas estender.
- Sem alterar `auth`, `storage.buckets` via SQL, ou o cliente Supabase gerado.

## Ordem sugerida de execução
1. Onda 1 (SST) — maior risco legal aberto.
2. Onda 3 (Férias) — pedido antigo do RH.
3. Onda 2 (Contratos) — destrava Onda 4.
4. Onda 4 (Folha).
5. Onda 5 (LGPD).

Confirma essa ordem, ou prefere priorizar Férias ou LGPD primeiro?
