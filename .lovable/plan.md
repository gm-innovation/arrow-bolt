## Resposta direta

A correção pontual no SIPOC do Marketing **resolve o caso**, mas o mesmo padrão de bug (estado local inicializado com dados que chegam depois via query) pode existir em outros drawers/dialogs da Qualidade. Por isso o plano tem duas partes: correção do caso reportado + varredura preventiva.

## Causa raiz

Padrão anti-idiomático em vários formulários:

```tsx
const { sipoc } = useProcessSIPOC(id);          // async
const [s, setS] = useState({ suppliers: sipoc?.suppliers || "", ... });
```

`useState` só usa o valor inicial **uma vez**. Quando a query resolve depois, o estado permanece vazio e os campos aparecem em branco (mesmo com dados salvos). Também quebra ao trocar o item selecionado sem desmontar o componente.

## Correção

### 1. Fix imediato — SIPOC (`src/pages/quality/Processes.tsx`)
Adicionar `useEffect` que ressincroniza `s` sempre que `sipoc` ou `process.id` mudar. Mesma coisa para o formulário de Atividades se aplicável.

### 2. Prevenção — varredura nos formulários da Qualidade
Auditar os arquivos que usam o padrão `useState({...campo: hookData?.x || ""})`:

- `src/pages/quality/Processes.tsx` (SIPOC + Atividades)
- `src/components/quality/InterestedPartyDrawer.tsx`
- `src/components/quality/EditDocumentMetadataDialog.tsx`
- `src/components/quality/SupplierDocumentsList.tsx`
- `src/components/quality/DocumentControlledCopiesPanel.tsx`
- `src/pages/quality/Settings.tsx`
- `src/pages/quality/ManagementReview.tsx`
- `src/pages/quality/Planning.tsx`
- `src/pages/quality/OrgChart.tsx`
- `src/pages/quality/Deviations.tsx`
- `src/pages/quality/Improvements.tsx`
- `src/pages/quality/IsoStructure.tsx`
- `src/pages/quality/InterestedParties.tsx`
- `src/pages/quality/ITBackup.tsx`
- `src/components/quality/AuditAttachmentsDrawer.tsx`
- `src/components/quality/NewDocumentDialog.tsx`
- `src/components/quality/CreateImprovementFromButton.tsx`
- `src/components/quality/voc/ComplaintsTabBase.tsx`
- `src/components/quality/voc/CampaignsTab.tsx`

Em cada um: se o `useState` inicial depende de dados de query/props que podem mudar, adicionar `useEffect` de sincronização (ou trocar por `key={id}` no componente pai para forçar remount, quando fizer sentido). Diálogos de "criar novo" que não recebem dados de query ficam intocados.

## Detalhes técnicos

Padrão de correção aplicado:

```tsx
useEffect(() => {
  setS({
    suppliers: sipoc?.suppliers ?? "",
    inputs: sipoc?.inputs ?? "",
    activities: sipoc?.activities ?? "",
    outputs: sipoc?.outputs ?? "",
    customers: sipoc?.customers ?? "",
  });
}, [sipoc, process?.id]);
```

Nenhuma mudança de banco. Dados atuais do Marketing continuam íntegros.

## Validação

1. Abrir Processos → Marketing → SIPOC: campos devem exibir o conteúdo salvo.
2. Trocar para outro processo sem fechar o drawer: campos devem atualizar.
3. Editar e salvar: valor persiste e volta a aparecer ao reabrir.
4. Repetir teste rápido em 2–3 dos outros drawers auditados.
