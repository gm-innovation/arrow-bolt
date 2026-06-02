Entendi — é um problema global de UX, não só da página de carreiras. Toda vez que você sai e volta para uma página com abas, o componente remonta e cai na aba padrão, perdendo contexto (e, no caso do editor, o que você estava digitando).

## Plano

### 1. Componente `Tabs` com memória (solução global)
Criar um wrapper simples sobre o Radix Tabs que persiste a aba ativa automaticamente:

- Novo componente `PersistentTabs` em `src/components/ui/tabs.tsx` (ou arquivo irmão).
- Aceita uma prop `storageKey` (ex.: `"hr-recruitment"`, `"hr-university"`).
- Salva a aba ativa em `sessionStorage` (vida da aba do navegador) — opção `persist="local"` para usar `localStorage` quando fizer sentido.
- Se `storageKey` não for passado, comporta-se igual ao Tabs atual (zero quebra).

Assim qualquer página do sistema com abas passa a lembrar onde você estava com **uma linha de mudança**:
```tsx
<Tabs defaultValue="candidates" storageKey="hr-recruitment">
```

### 2. Aplicar nas páginas com abas que sofrem mais com retrabalho
Vou habilitar `storageKey` nas páginas onde a perda de aba causa retrabalho real (formulários, filtros, listas longas):

- `src/pages/hr/Recruitment.tsx` (Candidatos / Vagas / Admissões / Link / Página de carreiras)
- `src/pages/hr/University.tsx`
- `src/pages/manager/Dashboard.tsx`
- `src/pages/manager/Reports.tsx`
- `src/pages/tech/Settings.tsx`
- `src/pages/tech/TaskDetails.tsx`
- `src/components/hr/EmployeeDetailSheet.tsx`

(e demais ocorrências de `<Tabs defaultValue=...>` que aparecerem na varredura — aplico em todas que forem nível de página.)

### 3. Preservar rascunho do editor de Carreiras
Independente da aba, o `CareersPageEditor` perde texto não salvo ao desmontar. Vou:

- Salvar automaticamente em `sessionStorage` os campos (Título, Sobre/Cultura, Missão, Valores) enquanto você digita.
- Restaurar o rascunho ao remontar, sem sobrescrever o que vem do banco se não houver rascunho.
- Limpar o rascunho após `Salvar` com sucesso.
- Mostrar um aviso discreto "Alterações não salvas" quando houver rascunho diferente do salvo.

### 4. Fora do escopo
- Não vou mexer em backend, tabelas, edge functions ou na página pública de carreiras.
- Não vou trocar a biblioteca de abas nem mudar o visual.

## Arquivos previstos
- `src/components/ui/tabs.tsx` (estender com suporte a `storageKey`)
- `src/components/hr/CareersPageEditor.tsx` (rascunho local)
- Páginas listadas no item 2 (adicionar `storageKey`)