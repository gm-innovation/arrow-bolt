## Fix crash em `/hr/vacations`

Mesmo bug estrutural que ocorreu em HealthExams: o `<TabsContent>` (linha 338) está fora do `<Tabs>` (que é fechado na linha 335, dentro do `CardHeader`), causando o erro `TabsContent must be used within Tabs`.

### Correção
Em `src/pages/hr/Vacations.tsx`, remover o wrapper `<TabsContent>` (linhas 338 e 399) — a filtragem já é feita via `filteredRequests` baseada no estado `tab`, então o wrapper é desnecessário, igual ao fix aplicado em HealthExams.

### Verificação adicional
Fazer varredura nos demais arquivos recém-criados/alterados do RH (`PayrollExport.tsx`, e demais páginas HR) para garantir que não há outros `TabsContent` fora de `<Tabs>` nem outros crashes estruturais óbvios. Se encontrados, aplicar a mesma correção.