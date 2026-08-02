import { randomBytes } from "node:crypto";
import type { CalendarStore } from "./calendar.ts";
import type { SaleStore, TicketRecord } from "./sale.ts";

export type TicketState = "waiting" | "active" | "completed" | "void" | "expired";
export type SessionEvent = { type: "admitted" | "exited" | "auto-closed" | "expired" | "charge-waived"; ticketId: string; at: number; details?: unknown };
export type PlaySession = { id: string; ticketId: string; enteredAt: number; exitedAt?: number; status: "active" | "completed" | "auto-closed"; overtimeMinutes: number; outstandingCharge: number; depositApplied: number; depositRefunded: number };
export type ScanResult = { ok: boolean; state: TicketState | "unknown"; message: string; ticket?: TicketRecord; session?: PlaySession };

function id() { return `session_${randomBytes(10).toString("hex")}`; }
function minutesBetween(start: number, end: number) { return Math.max(0, Math.floor((end - start) / 60_000)); }

export function createLifecycleStore(sales: SaleStore, calendar: CalendarStore) {
  const sessions = new Map<string, PlaySession>();
  const events: SessionEvent[] = [];
  const recoveryCodes = new Map<string, string>();

  function findTicket(codeOrToken: string) {
    const recoveredId = recoveryCodes.get(codeOrToken);
    for (const sale of sales.sales.values()) {
      const ticket = sale.tickets.find((candidate) => candidate.id === recoveredId || candidate.code === codeOrToken || candidate.qrToken === codeOrToken);
      if (ticket) return ticket;
    }
    return undefined;
  }
  function state(ticket: TicketRecord): TicketState { return ticket.status as TicketState; }
  function admit(codeOrToken: string, at = Date.now()): ScanResult {
    const ticket = findTicket(codeOrToken);
    if (!ticket) return { ok: false, state: "unknown", message: "Ticket not found" };
    const current = state(ticket);
    if (current !== "waiting") return { ok: false, state: current, message: current === "active" ? "Ticket already admitted" : "Ticket cannot be admitted", ticket, session: sessions.get(ticket.id) };
    const date = calendar.operatingDate(new Date(at));
    const operation = calendar.canOperate(date, calendar.operatingTime(new Date(at)), "admit");
    if (!operation.allowed) { ticket.status = "expired" as never; events.push({ type: "expired", ticketId: ticket.id, at, details: { reason: operation.reason } }); return { ok: false, state: "expired", message: operation.reason, ticket }; }
    const session: PlaySession = { id: id(), ticketId: ticket.id, enteredAt: at, status: "active", overtimeMinutes: 0, outstandingCharge: 0, depositApplied: 0, depositRefunded: 0 };
    ticket.status = "active" as never; sessions.set(ticket.id, session); events.push({ type: "admitted", ticketId: ticket.id, at });
    return { ok: true, state: "active", message: "Ticket admitted", ticket, session };
  }
  function calculate(ticket: TicketRecord, session: PlaySession, at: number) {
    const included = ticket.package.includedMinutes;
    const elapsed = minutesBetween(session.enteredAt, at);
    const overtimeMinutes = included === null ? 0 : Math.max(0, elapsed - included);
    const charge = overtimeMinutes * ticket.package.overtimeRate;
    const deposit = ticket.package.deposit;
    if (ticket.package.depositPolicy === "return-remainder") return { overtimeMinutes, charge, applied: Math.min(charge, deposit), refund: Math.max(0, deposit - charge), outstanding: Math.max(0, charge - deposit) };
    if (ticket.package.depositPolicy === "forfeit-overtime") return { overtimeMinutes, charge, applied: Math.min(charge, deposit), refund: 0, outstanding: Math.max(0, charge - deposit) };
    return { overtimeMinutes, charge: Math.min(charge, deposit), applied: Math.min(charge, deposit), refund: Math.max(0, deposit - charge), outstanding: 0 };
  }
  function exit(codeOrToken: string, at = Date.now()): ScanResult {
    const ticket = findTicket(codeOrToken);
    if (!ticket) return { ok: false, state: "unknown", message: "Ticket not found" };
    const current = state(ticket); const session = sessions.get(ticket.id);
    if (current === "completed" || current === "expired") return { ok: false, state: current, message: "Ticket already settled", ticket, session };
    if (current !== "active" || !session) return { ok: false, state: current, message: "Ticket has no active session", ticket };
    const result = calculate(ticket, session, at);
    Object.assign(session, { exitedAt: at, status: "completed", overtimeMinutes: result.overtimeMinutes, outstandingCharge: result.outstanding, depositApplied: result.applied, depositRefunded: result.refund }); ticket.status = "completed" as never;
    events.push({ type: "exited", ticketId: ticket.id, at, details: result });
    return { ok: true, state: "completed", message: result.outstanding > 0 ? "Exited with outstanding charge" : "Ticket settled", ticket, session };
  }
  function recover(code: string, childId: string) {
    const ticket = findTicket(code); if (!ticket || ticket.childId !== childId) throw new Error("Ticket recovery verification failed");
    const replacement = randomBytes(8).toString("hex").toUpperCase(); recoveryCodes.set(replacement, ticket.id); return { ticketId: ticket.id, code: replacement, qrToken: ticket.qrToken };
  }
  function waiveOutstanding(ticketId: string, actorRole: string, reason: string, at = Date.now()) {
    if (actorRole !== "Owner" || !reason.trim()) throw new Error("Owner reason required");
    const session = sessions.get(ticketId); if (!session || session.outstandingCharge <= 0) throw new Error("No outstanding charge");
    const amount = session.outstandingCharge; session.outstandingCharge = 0;
    events.push({ type: "charge-waived", ticketId, at, details: { amount, reason } });
    return { ticketId, amount, reason, waivedAt: at };
  }
  function close(date: string, at: number) {
    const result: ScanResult[] = [];
    const schedule = calendar.effectiveSchedule(date);
    const reason = schedule.closureReason ?? ("closed" in schedule.hours ? "Venue is closed" : "Venue closed");
    for (const sale of sales.sales.values()) if (sale.operatingDate === date) for (const ticket of sale.tickets) {
      if (state(ticket) === "active") { const session = sessions.get(ticket.id)!; const end = exit(ticket.code, at); session.status = "auto-closed"; events.push({ type: "auto-closed", ticketId: ticket.id, at, details: end.session }); result.push(end); }
      else if (state(ticket) === "waiting") { ticket.status = "expired" as never; events.push({ type: "expired", ticketId: ticket.id, at, details: { reason } }); result.push({ ok: false, state: "expired", message: `Ticket expired: ${reason}`, ticket }); }
    }
    return result;
  }
  return { sessions, events, findTicket, admit, exit, recover, waiveOutstanding, close };
}

export type LifecycleStore = ReturnType<typeof createLifecycleStore>;
