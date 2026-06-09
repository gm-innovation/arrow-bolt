import { useSearchParams } from "react-router-dom";
import QualityRisks from "./Risks";
import OrgContext from "./OrgContext";
import Processes from "./Processes";
import ScenarioSwot from "./ScenarioSwot";

const RisksHub = () => {
  const [sp] = useSearchParams();
  const tab = sp.get("tab") || "risks";
  if (tab === "context") return <OrgContext />;
  if (tab === "processes") return <Processes />;
  if (tab === "scenario") return <ScenarioSwot />;
  return <QualityRisks />;
};

export default RisksHub;
