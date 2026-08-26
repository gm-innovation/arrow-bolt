import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { ScheduleEntry } from "./ScheduleEntryDetailsDialog";
import {
  absenceCategory,
  CALENDAR_CATEGORIES,
  categoryStyles,
  classifyEvent,
  type CalendarCategory,
} from "./eventStyles";

export type GroupedPersonClick =
  | { type: "schedule"; entry: ScheduleEntry }
  | { type: "order"; orderId: string };

export interface GroupedPerson {
  key: string;
  name: string;
  click: GroupedPersonClick;
}

export type ScheduleRow =
  | { type: "order"; key: string; order: CalendarServiceOrder }
  | { type: "group"; key: string; category: CalendarCategory; people: GroupedPerson[] };

const orderTeamNames = (order: CalendarServiceOrder): string[] => {
  if (order.auvo_technician_names?.length) return [...new Set(order.auvo_technician_names)];
  const names = [
    order.lead_technician,
    ...(order.auxiliary_technicians || []),
    ...(order.lead_technician ? [] : order.technician_names || []),
  ].filter(Boolean) as string[];
  if (names.length) return [...new Set(names)];
  if (order.auvo_team_name) return [order.auvo_team_name];
  return [];
};

const ABSENCE_CATEGORIES = CALENDAR_CATEGORIES.filter((c) => c !== "os" && c !== "auvo");

/**
 * Monta as linhas de um dia: serviços externos (OS/Auvo) viram um cartão cada;
 * ausências e sobreavisos (do RH ou classificados a partir de tarefas do Auvo)
 * são agrupados em UMA linha por categoria com os nomes das pessoas.
 */
export const buildScheduleRows = (
  dayKey: string,
  orders: CalendarServiceOrder[],
  absences: CalendarAbsence[],
  onCalls: CalendarOnCall[],
): ScheduleRow[] => {
  const serviceRows: ScheduleRow[] = [];
  const groups = new Map<CalendarCategory, GroupedPerson[]>();

  const push = (category: CalendarCategory, person: GroupedPerson) => {
    const list = groups.get(category) || [];
    // Dedup por nome (mesma pessoa pode vir do RH e do Auvo)
    if (list.some((p) => p.name.trim().toLowerCase() === person.name.trim().toLowerCase())) return;
    list.push(person);
    groups.set(category, list);
  };

  orders.forEach((order) => {
    const category = classifyEvent(order);
    if (category === "os" || category === "auvo") {
      serviceRows.push({ type: "order", key: order.id, order });
      return;
    }
    const names = orderTeamNames(order);
    if (names.length === 0) {
      push(category, {
        key: order.id,
        name: order.vessel_name || categoryStyles[category].label,
        click: { type: "order", orderId: order.id },
      });
      return;
    }
    names.forEach((name, i) =>
      push(category, {
        key: `${order.id}-${i}`,
        name,
        click: { type: "order", orderId: order.id },
      }),
    );
  });

  absences.forEach((absence) =>
    push(absenceCategory(absence.absence_type), {
      key: `absence-${absence.id}-${dayKey}`,
      name: absence.technician_name,
      click: { type: "schedule", entry: { kind: "absence", absence } },
    }),
  );

  onCalls.forEach((onCall) =>
    push("on_call", {
      key: `oncall-${onCall.id}-${dayKey}`,
      name: onCall.technician_name,
      click: { type: "schedule", entry: { kind: "on_call", onCall } },
    }),
  );

  serviceRows.sort((a, b) => {
    const aTime = a.type === "order" ? a.order.scheduled_time || "" : "";
    const bTime = b.type === "order" ? b.order.scheduled_time || "" : "";
    if (aTime && bTime) return aTime.localeCompare(bTime);
    if (aTime) return -1;
    if (bTime) return 1;
    return 0;
  });

  const groupRows: ScheduleRow[] = ABSENCE_CATEGORIES.filter((c) => groups.has(c)).map(
    (category) => ({
      type: "group" as const,
      key: `group-${category}-${dayKey}`,
      category,
      people: groups.get(category)!,
    }),
  );

  return [...serviceRows, ...groupRows];
};
