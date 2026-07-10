export function getNotificationRoute(type: string, fallbackRoute?: string) {
  if (type === "support_ticket_created") return "/super-admin/support-inbox";
  if (type === "support_ticket_reply") return "/account/tickets";
  return fallbackRoute ?? null;
}