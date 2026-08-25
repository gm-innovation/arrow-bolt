import { ServiceCalendar as ConsolidatedServiceCalendar } from "@/components/admin/calendar/ServiceCalendar";

const ServiceCalendar = () => {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
      <ConsolidatedServiceCalendar />
    </main>
  );
};

export default ServiceCalendar;