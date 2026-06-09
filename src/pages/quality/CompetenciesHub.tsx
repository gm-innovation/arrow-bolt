import { useSearchParams } from "react-router-dom";
import QualityMyCompetencies from "./MyCompetencies";
import QualityMyAcknowledgements from "./MyAcknowledgements";
import OrgChart from "./OrgChart";

const CompetenciesHub = () => {
  const [sp] = useSearchParams();
  const tab = sp.get("tab") || "org";
  if (tab === "me") return <QualityMyCompetencies />;
  if (tab === "acknowledgements") return <QualityMyAcknowledgements />;
  return <OrgChart />;
};

export default CompetenciesHub;
