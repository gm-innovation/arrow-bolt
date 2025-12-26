import { Palmtree, CalendarOff, Stethoscope, GraduationCap, Phone, CalendarClock } from "lucide-react";

export const CalendarLegend = () => {
  const items = [
    { label: "Férias", color: "bg-blue-100 border-blue-300 text-blue-800", icon: Palmtree },
    { label: "Folga", color: "bg-green-100 border-green-300 text-green-800", icon: CalendarOff },
    { label: "Atestado", color: "bg-red-100 border-red-300 text-red-800", icon: Stethoscope },
    { label: "Treinamento", color: "bg-purple-100 border-purple-300 text-purple-800", icon: GraduationCap },
    { label: "Sobreaviso", color: "bg-amber-100 border-amber-300 text-amber-800", icon: Phone },
    { label: "Reservado", color: "bg-violet-100 border-violet-300 text-violet-800", icon: CalendarClock },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-3 px-2">
      {items.map(({ label, color, icon: Icon }) => (
        <div
          key={label}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${color}`}
        >
          <Icon className="h-3 w-3" />
          {label}
        </div>
      ))}
    </div>
  );
};
