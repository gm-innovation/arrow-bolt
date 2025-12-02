import { useState } from "react";
import { ManagerStats } from "@/components/manager/dashboard/ManagerStats";
import { CoordinatorFilter } from "@/components/manager/dashboard/CoordinatorFilter";
import { ManagerCharts } from "@/components/manager/dashboard/ManagerCharts";
import { ConsolidatedCalendar } from "@/components/manager/dashboard/ConsolidatedCalendar";
import { CriticalOrdersCard } from "@/components/manager/dashboard/CriticalOrdersCard";

const ManagerDashboard = () => {
  const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Gerencial</h2>
          <p className="text-muted-foreground">Visão consolidada de todas as operações</p>
        </div>
        <CoordinatorFilter 
          selectedCoordinator={selectedCoordinator}
          onCoordinatorChange={setSelectedCoordinator}
        />
      </div>

      <ManagerStats coordinatorId={selectedCoordinator} />
      
      <CriticalOrdersCard />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <ManagerCharts coordinatorId={selectedCoordinator} />
        <ConsolidatedCalendar coordinatorId={selectedCoordinator} />
      </div>
    </div>
  );
};

export default ManagerDashboard;
