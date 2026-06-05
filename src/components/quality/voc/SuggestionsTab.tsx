import ComplaintsTabBase from "./ComplaintsTabBase";

export default function SuggestionsTab() {
  return (
    <ComplaintsTabBase
      kind="suggestion"
      title="Sugestões e elogios"
      description="Entradas para melhoria contínua. Sugestões não viram NCR — alimentam o processo de oportunidades."
      newButtonLabel="Nova sugestão"
      emptyMessage="Nenhuma sugestão registrada."
    />
  );
}
