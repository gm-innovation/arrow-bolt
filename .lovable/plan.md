## Diagnóstico

Hoje o RH tem 4 áreas de documentação, cada uma escrevendo em uma tabela diferente e mostrando um pedaço da história:

| Área | Fonte | O que faz |
|---|---|---|
| Colaboradores → ficha → **Docs** | `technician_documents` (122 docs) | Upload livre, é o que o RH já usa de fato |
| **Gestão de Documentos** (`/hr/documents`) | `corp_documents` (6) | Duplica a aba Docs, sem ganho |
| **Conformidade Documental** | `hr_employee_documents` (0) | Painel agregado por catálogo |
| **Revisão de Documentos** | `hr_employee_documents` (0) | Fila de aprovação |
| **Compartilhamento com Coordenadores** | `hr_document_catalog` (0) + grants | Configura o que o Coordenador vê |

Concordo com o diagnóstico: fica bagunçado e a tela de Compartilhamento nem lista nada porque o catálogo está vazio.

## Objetivo

Uma única porta de entrada: **Colaboradores → ficha → aba Docs**. Tudo o que hoje está espalhado (upload, tipo, validade, revisão, toggle de compartilhamento) acontece ali. Painéis agregados (Conformidade, Revisão, Histórico de acessos) permanecem, mas como *visões* do mesmo dado, não como locais para gerir documentos individuais.

## Nova estrutura da sidebar do RH — Documentação

```text
Documentação
  ├─ Colaboradores            (ficha > Docs = fonte única)
  ├─ Conformidade Documental  (dashboard por cargo/vencimento)
  └─ Revisão de Documentos    (fila de aprovação)
```

Removidos do menu:
- **Gestão de Documentos** (`/hr/documents`) — funcionalidade absorvida pela aba Docs.
- **Compartilhamento com Coordenadores** (`/hr/document-sharing`) — toggles migram para dentro da ficha.

## Aba "Docs" reformulada (na ficha do colaborador)

Cada linha de documento passa a mostrar/editar num só lugar:

- Arquivo + nome
- **Tipo do catálogo** (dropdown; se ainda não existe, o RH cria inline)
- Data de emissão, validade
- Status de revisão (aprovado / pendente / rejeitado) + botão de aprovar/rejeitar para RH
- **Toggle "Compartilhar com Coordenadores"** por documento (ou por linha do catálogo daquele colaborador, ver "Detalhes técnicos")
- Botão baixar / substituir / excluir

Cabeçalho da aba ganha 2 atalhos discretos:
- "Ver todos os acessos deste colaborador" → abre drawer com o log de compartilhamento (o que hoje é a aba "Histórico de acessos").
- "Configurar tipos" → drawer que edita o catálogo (o que hoje é `/hr/settings` → Catálogo). Fica no mesmo lugar de sempre também.

## Migração de dados

Unificar tudo em `hr_employee_documents` (a tabela que já tem catálogo, revisão, validade, current/histórico):

1. **Seed do catálogo** por empresa: ASO, NR 06/10/11/12/33/34/35, RG, CPF, CNH, PIS, CTPS, Comprovante de residência, Escolaridade, Outros. `coordinator_shareable` inicial: ASO, NR*, RG, CPF, CNH = true; demais = false.
2. **Backfill `technician_documents` (122) → `hr_employee_documents`**, mapeando `certificate_name` por regex ao catálogo; sobra vai para "Outros". `review_status = approved`, `is_current = true`, `notes` guarda o id de origem.
3. **`corp_documents` de RH (6)** — os que têm `owner_user_id` idem; os sem dono ficam intocados (são de outros fluxos, não HR docs).
4. `technician_documents` e `corp_documents` **não são apagados**; apenas as escritas do RH deixam de mirar neles.

## Aba Docs = fonte única de leitura/escrita

- **Leitura**: consulta `hr_employee_documents` (novo). Se por algum motivo houver docs órfãos em `technician_documents` de um colaborador, mostrar num bloco "Legado" com botão "Vincular ao catálogo".
- **Escrita**: todos os uploads passam a criar linha em `hr_employee_documents` com `catalog_id`.
- Componente `EmployeeDocumentsTab` recebe: seletor de tipo (catálogo), toggle de compartilhamento, aprovar/rejeitar.

## Conformidade e Revisão

Permanecem como *páginas de visão agregada* — mas ambas passam a linkar para a ficha do colaborador em vez de terem seus próprios uploads:
- **Conformidade**: cada linha vermelha ("faltando") tem botão "Abrir ficha".
- **Revisão**: cada pendência abre a ficha já na aba Docs, com o item destacado para aprovar/rejeitar inline.

Isso mantém o valor gerencial (visão macro) sem duplicar o local onde se opera.

## Coordenador (`/admin/employee-documents`)

Continua existindo — é a tela *dele*, não do RH. Passa a listar exatamente o que o RH marcou como compartilhável na ficha de cada colaborador. Nada muda aqui além de a fonte agora estar preenchida.

## Detalhes técnicos

- Toggle de compartilhamento: mais simples é gravar em `hr_coordinator_document_grants` no par (colaborador × catalog_id) — assim vale para todas as versões atuais/futuras daquele tipo de documento e não obriga o RH a re-marcar a cada substituição. O catálogo continua com `coordinator_shareable` como *default global* (ex.: ASO já vem compartilhável se o RH mantiver esse padrão).
- `/hr/document-sharing` e `/hr/documents`: rotas removidas do menu. Os arquivos das páginas podem ser deletados após a migração validar.
- `EmployeeDocumentsTab` (hoje escreve em `technician_documents`) é o único componente que muda de escrita — passa a usar os hooks de `useHRDocumentCompliance` / `useHRDocumentSharing`.
- Backfill em migração idempotente (upsert por `notes = 'legacy:{origem}'`).

## Fora de escopo

- Reformular Conformidade e Revisão visualmente — só passam a linkar de volta para a ficha.
- Mexer no fluxo do Coordenador além de ele finalmente ver documentos reais.
- Apagar `technician_documents`/`corp_documents` — só congelar escritas.

## Perguntas / decisões que preciso confirmar

1. **Toggle de compartilhamento**: por **tipo** do colaborador (ex.: "RG do João é sempre compartilhável"), ou por **documento individual** (ex.: só o RG de 2024, não o antigo)? Recomendo por tipo — mais simples e mais fiel ao uso real.
2. **Conformidade e Revisão**: mantenho as duas páginas ou funde tudo em uma só ("Documentação — visão gerencial") com abas Conformidade / Fila de revisão / Histórico de acessos? Recomendo fundir.
