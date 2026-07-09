import { Navigate } from "react-router-dom";

export default function SiteLeadsRedirect() {
  return <Navigate to="/commercial/opportunities?tab=leads" replace />;
}
