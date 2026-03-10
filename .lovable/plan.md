

## Plano: Atividades de Docagem com Accordion

Transformar os cards de atividade em `DockingTasksSection.tsx` em itens de accordion usando o componente `Accordion` já existente (`@radix-ui/react-accordion`).

### Alterações em `DockingTasksSection.tsx`

- Substituir os `Card` por `Accordion` com `type="multiple"` (permite múltiplos abertos)
- Cada atividade vira um `AccordionItem`
- O `AccordionTrigger` mostra: "Atividade #N" + resumo (nº OS se preenchido, quantidade de tarefas, quantidade de técnicos) + botão de remover
- O `AccordionContent` contém os campos atuais (Nº OS, Data/Hora, Tarefas, Equipe)
- Novas atividades adicionadas iniciam abertas (controlando o state `value` do Accordion)

