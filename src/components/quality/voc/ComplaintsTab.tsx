import ComplaintsTabBase from "./ComplaintsTabBase";

export default function ComplaintsTab() {
  return (
    <ComplaintsTabBase
      kind="complaint"
      title="Reclamações de clientes"
      description="Registro, análise de causa e tratativa. Reclamações graves podem ser convertidas em NCR."
      newButtonLabel="Nova reclamação"
      emptyMessage="Nenhuma reclamação registrada."
    />
  );
}
