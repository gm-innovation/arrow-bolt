import {
  Palmtree,
  CalendarOff,
  Stethoscope,
  GraduationCap,
  Phone,
  CalendarClock,
  RadioTower,
  UserX,
  Ship,
} from "lucide-react";

export type CalendarCategory =
  | "vacation"
  | "day_off"
  | "sick_leave"
  | "training"
  | "on_call"
  | "reserved"
  | "unavailable"
  | "auvo"
  | "os";

export interface CategoryStyle {
  label: string;
  icon: typeof Palmtree;
  /** Badge (legenda e chips): fundo claro + borda + texto */
  badge: string;
  /** Item da agenda: fundo claro + borda esquerda colorida */
  item: string;
  /** Ponto de status */
  dot: string;
}

export const categoryStyles: Record<CalendarCategory, CategoryStyle> = {
  vacation: {
    label: "Férias",
    icon: Palmtree,
    badge: "bg-blue-100 border-blue-300 text-blue-800",
    item: "bg-blue-50 border-l-blue-500 text-blue-900",
    dot: "bg-blue-500",
  },
  day_off: {
    label: "Folga",
    icon: CalendarOff,
    badge: "bg-green-100 border-green-300 text-green-800",
    item: "bg-green-50 border-l-green-500 text-green-900",
    dot: "bg-green-500",
  },
  sick_leave: {
    label: "Atestado",
    icon: Stethoscope,
    badge: "bg-red-100 border-red-300 text-red-800",
    item: "bg-red-50 border-l-red-500 text-red-900",
    dot: "bg-red-500",
  },
  training: {
    label: "Treinamento",
    icon: GraduationCap,
    badge: "bg-purple-100 border-purple-300 text-purple-800",
    item: "bg-purple-50 border-l-purple-500 text-purple-900",
    dot: "bg-purple-500",
  },
  on_call: {
    label: "Sobreaviso",
    icon: Phone,
    badge: "bg-amber-100 border-amber-300 text-amber-800",
    item: "bg-amber-50 border-l-amber-500 text-amber-900",
    dot: "bg-amber-500",
  },
  reserved: {
    label: "Reservado",
    icon: CalendarClock,
    badge: "bg-violet-100 border-violet-300 text-violet-800",
    item: "bg-violet-50 border-l-violet-500 text-violet-900",
    dot: "bg-violet-500",
  },
  unavailable: {
    label: "Indisponível",
    icon: UserX,
    badge: "bg-slate-100 border-slate-300 text-slate-800",
    item: "bg-slate-50 border-l-slate-500 text-slate-900",
    dot: "bg-slate-500",
  },
  auvo: {
    label: "Auvo",
    icon: RadioTower,
    badge: "bg-cyan-100 border-cyan-300 text-cyan-800",
    item: "bg-cyan-50 border-l-cyan-500 text-cyan-900",
    dot: "bg-cyan-500",
  },
  os: {
    label: "OS",
    icon: Ship,
    badge: "bg-sky-100 border-sky-300 text-sky-800",
    item: "bg-sky-50 border-l-sky-500 text-sky-900",
    dot: "bg-sky-500",
  },
};

/** Ordem exibida na legenda / usada como padrão de filtro */
export const CALENDAR_CATEGORIES: CalendarCategory[] = [
  "os",
  "auvo",
  "vacation",
  "day_off",
  "sick_leave",
  "training",
  "on_call",
  "reserved",
  "unavailable",
];

const normalize = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export interface ClassifiableEvent {
  vessel_name?: string;
  task_type?: string;
  description?: string;
  status?: string;
  event_source?: "arrow" | "auvo";
}

export const classifyEvent = (event: ClassifiableEvent): CalendarCategory => {
  const text = `${normalize(event.vessel_name)} ${normalize(event.task_type)}`;

  if (/\bFERIAS?\b/.test(text)) return "vacation";
  if (/\bFOLGA/.test(text)) return "day_off";
  if (/ATESTADO|\bASO\b|EXAME MEDICO|LICENCA MEDICA/.test(text)) return "sick_leave";
  if (/TREINAMENT|\bCURSO\b|CAPACITAC/.test(text)) return "training";
  if (/SOBREAVISO|PLANTAO|ON ?CALL/.test(text)) return "on_call";
  if (/RESERVAD|BLOQUEI/.test(text)) return "reserved";
  if (/INDISPONIVEL|AFASTAD|SUSPENS/.test(text)) return "unavailable";

  return event.event_source === "auvo" ? "auvo" : "os";
};

/** Ausências internas (technician_absences) → categoria da legenda */
export const absenceCategory = (absenceType?: string): CalendarCategory => {
  switch (absenceType) {
    case "vacation":
      return "vacation";
    case "sick_leave":
    case "medical_exam":
      return "sick_leave";
    case "training":
      return "training";
    case "day_off":
    case "home_office":
    default:
      return "day_off";
  }
};

export const isCategoryActive = (
  category: CalendarCategory,
  activeCategories?: CalendarCategory[],
) => !activeCategories || activeCategories.includes(category);
