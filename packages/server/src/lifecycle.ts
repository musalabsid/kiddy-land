import { randomBytes } from "node:crypto";
import type { CalendarStore } from "./calendar.ts";
import type { SaleStore, TicketRecord } from "./sale.ts";
import type { LocalDatabase } from "./database.ts";
import { sql } from "drizzle-orm";

export type TicketState = "waiting" | "active" | "completed" | "void" | "expired";
export type SessionEvent = { type: "admitted" | "exited" | "auto-closed" | "expired" | "charge-waived" | "charge-collected"; ticketId: string; at: number; actorId?: string; details?: unknown };
export type RecoveryResult = { ticketId: string; code: string; qrToken: string };
export type PlaySession = { id: string; ticketId: string; enteredAt: number; exitedAt?: number; status: "active" | "completed" | "auto-closed"; overtimeMinutes: number; outstandingCharge: number; depositApplied: number; depositRefunded: number };
export type ScanResult = { ok: boolean; state: TicketState | "unknown"; message: string; ticket?: TicketRecord; session?: PlaySession };

function id() { return `session_${randomBytes(10).toString("hex")}`; }
function minutesBetween(start: number, end: number) { return Math.max(0, Math.floor((end - start) / 60_000)); }

export function createLifecycleStore(sales: SaleStore, calendar: CalendarStore, database?: LocalDatabase) {
  const sessions = new Map<string, PlaySession>();
  const events: SessionEvent[] = [];
  const recoveryCodes = new Map<string, string>();
  if (database) {
    const row = database.orm.all<{ sessions: string; events: string; recovery: string }>(sql`SELECT sessions_json AS sessions, events_json AS events, recovery_json AS recovery FROM lifecycle_state WHERE id = 1`)[0];
    if (row) { for (const [key, value] of Object.entries(JSON.parse(row.sessions) as Record<string, PlaySession>)) sessions.set(key, value); events.push(...JSON.parse(row.events) as SessionEvent[]); for (const [key, value] of Object.entries(JSON.parse(row.recovery) as Record<string, string>)) recoveryCodes.set(key, value); }
  }
  const persist = () => { sales.persist(); if (!database) return; database.orm.run(sql`UPDATE lifecycle_state SET sessions_json = ${JSON.stringify(Object.fromEntries(sessions))}, events_json = ${JSON.stringify(events)}, recovery_json = ${JSON.stringify(Object.fromEntries(recoveryCodes))}, updated_at = ${Date.now()} WHERE id = 1`); };

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
    if (!operation.allowed) { ticket.status = "expired" as never; events.push({ type: "expired", ticketId: ticket.id, at, details: { reason: operation.reason } }); persist(); return { ok: false, state: "expired", message: operation.reason, ticket }; }
    const session: PlaySession = { id: id(), ticketId: ticket.id, enteredAt: at, status: "active", overtimeMinutes: 0, outstandingCharge: 0, depositApplied: 0, depositRefunded: 0 };
    ticket.status = "active" as never; sessions.set(ticket.id, session); events.push({ type: "admitted", ticketId: ticket.id, at }); persist();
    return { ok: true, state: "active", message: "Ticket admitted", ticket, session };
  }
  function calculate(ticket: TicketRecord, session: PlaySession, at: number) {
    const included = ticket.package.includedMinutes;
    const elapsed = minutesBetween(session.enteredAt, at);
    const threshold = (ticket.package as unknown as { overtimeThreshold?: number }).overtimeThreshold ?? 5;
    const overtimeMinutes = included === null ? 0 : Math.max(0, elapsed - included - threshold);
    const basePrice = ticket.package.weekdayPrice;
    const percent = (ticket.package as unknown as { overtimePercentage?: number }).overtimePercentage ?? 10;
    const ratePerMin = Math.round((basePrice * percent) / 100);
    const charge = overtimeMinutes * (ticket.package.depositPolicy === "unlimited-cap" ? ratePerMin : ticket.package.overtimeRate);
    const deposit = ticket.package.deposit;
    if (ticket.package.depositPolicy === "forfeit-overtime") {
      if (overtimeMinutes === 0) return { overtimeMinutes, charge: 0, applied: 0, refund: deposit, outstanding: 0 };
      return { overtimeMinutes, charge, applied: deposit, refund: 0, outstanding: 0 };
    }
    if (ticket.package.depositPolicy === "unlimited-cap") {
      const gradCharge = overtimeMinutes * ratePerMin;
      return { overtimeMinutes, charge: gradCharge, applied: Math.min(gradCharge, deposit), refund: Math.max(0, deposit - Math.min(gradCharge, deposit)), outstanding: 0 };
    }
    return { overtimeMinutes, charge, applied: Math.min(charge, deposit), refund: Math.max(0, deposit - charge), outstanding: Math.max(0, charge - deposit) };
  }
  function settle(ticket: TicketRecord, session: PlaySession, at: number, status: PlaySession["status"], eventType: "exited" | "auto-closed") {
    const result = calculate(ticket, session, at);
    Object.assign(session, { exitedAt: at, status, overtimeMinutes: result.overtimeMinutes, outstandingCharge: result.outstanding, depositApplied: result.applied, depositRefunded: 0 });
    const sale = [...sales.sales.values()].find((item) => item.tickets.some((candidate) => candidate.id === ticket.id));
    const depositRecord = sale?.deposits.find((item) => item.ticketId === ticket.id);
    if (depositRecord) { depositRecord.appliedAmount = result.applied; depositRecord.refundedAmount = 0; depositRecord.status = ticket.package.depositPolicy === "forfeit-overtime" && result.charge > 0 ? "forfeited" : result.applied >= ticket.package.deposit ? "applied" : "held"; }
    ticket.status = "completed" as never;
    events.push({ type: eventType, ticketId: ticket.id, at, details: result }); persist();
    return result;
  }
  function exit(codeOrToken: string, at = Date.now()): ScanResult {
    const ticket = findTicket(codeOrToken);
    if (!ticket) return { ok: false, state: "unknown", message: "Ticket not found" };
    const current = state(ticket); const session = sessions.get(ticket.id);
    if (current === "completed" || current === "expired") return { ok: false, state: current, message: "Ticket already settled", ticket, session };
    if (current !== "active" || !session) return { ok: false, state: current, message: "Ticket has no active session", ticket };
    const result = settle(ticket, session, at, "completed", "exited");
    return { ok: true, state: "completed", message: result.outstanding > 0 ? "Exited with outstanding charge" : "Ticket settled", ticket, session };
  }
  function recover(code: string, childId: string) {
    const ticket = findTicket(code); if (!ticket || ticket.childId !== childId) throw new Error("Ticket recovery verification failed");
    const replacement = randomBytes(8).toString("hex").toUpperCase(); recoveryCodes.set(replacement, ticket.id); persist(); return { ticketId: ticket.id, code: replacement, qrToken: ticket.qrToken };
  }
  function collectOutstanding(ticketId: string, amount: number, paymentMethod: "cash" | "QRIS" | "bank-transfer", actorId = "cashier", at = Date.now()) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("Charge amount must be a positive IDR integer");
    const session = sessions.get(ticketId); if (!session || session.outstandingCharge <= 0) throw new Error("No outstanding charge");
    if (amount !== session.outstandingCharge) throw new Error("Charge amount must match outstanding charge");
    const collected = session.outstandingCharge; session.outstandingCharge = 0;
    events.push({ type: "charge-collected", ticketId, at, actorId, details: { amount: collected, paymentMethod } }); persist();
    return { ticketId, amount: collected, paymentMethod, collectedAt: at, session };
  }
  function refundDeposit(ticketId: string, actorRole: string, at = Date.now()) {
    if (actorRole !== "Cashier" && actorRole !== "Owner") throw new Error("Cashier authorization required");
    const session = sessions.get(ticketId); if (!session || session.status === "active") throw new Error("Ticket must be settled before refund");
    const sale = [...sales.sales.values()].find((item) => item.tickets.some((candidate) => candidate.id === ticketId));
    const deposit = sale?.deposits.find((item) => item.ticketId === ticketId);
    if (!deposit || deposit.status !== "held") throw new Error("Deposit is not refundable");
    const amount = Math.max(0, deposit.amount - (deposit.appliedAmount ?? 0));
    if (amount <= 0) throw new Error("No deposit remainder to refund");
    deposit.status = "refunded"; deposit.refundedAmount = amount; session.depositRefunded += amount; persist();
    return { ticketId, amount, refundedAt: at };
  }
  function waiveOutstanding(ticketId: string, actorRole: string, reason: string, at = Date.now()) {
    if (actorRole !== "Owner" || !reason.trim()) throw new Error("Owner reason required");
    const session = sessions.get(ticketId); if (!session || session.outstandingCharge <= 0) throw new Error("No outstanding charge");
    const sale = [...sales.sales.values()].find((item) => item.tickets.some((candidate) => candidate.id === ticketId));
    const deposit = sale?.deposits.find((item) => item.ticketId === ticketId);
    if (deposit && deposit.status !== "refunded") deposit.status = "forfeited";
    const amount = session.outstandingCharge; session.outstandingCharge = 0;
    events.push({ type: "charge-waived", ticketId, at, details: { amount, reason, depositForfeited: deposit?.amount ?? 0 } }); persist();
    return { ticketId, amount, reason, waivedAt: at, depositForfeited: deposit?.amount ?? 0 };
  }
  function publicTicket(codeOrToken: string, at = Date.now()) {
    const ticket = findTicket(codeOrToken);
    if (!ticket) return { ok: false, state: "unknown" as const, message: "Ticket not found", remainingMinutes: 0 };
    const session = sessions.get(ticket.id);
    const active = session?.status === "active";
    const date = calendar.operatingDate(new Date(at));
    const operation = calendar.canOperate(date, calendar.operatingTime(new Date(at)), "admit");
    const validWaiting = ticket.status === "waiting" && operation.allowed;
    const remainingMinutes = active && ticket.package.includedMinutes !== null
      ? Math.max(0, ticket.package.includedMinutes - minutesBetween(session.enteredAt, at))
      : validWaiting ? ticket.package.includedMinutes ?? 0 : 0;
    return { ok: active || validWaiting, state: active ? "active" as const : state(ticket), message: active ? "Ticket is active" : validWaiting ? "Ticket is valid" : ticket.status === "waiting" ? "Ticket is not valid now" : "Ticket is no longer valid", remainingMinutes };
  }

  function close(date: string, at: number) {
    const result: ScanResult[] = [];
    const schedule = calendar.effectiveSchedule(date);
    const reason = schedule.closureReason ?? ("closed" in schedule.hours ? "Venue is closed" : "Venue closed");
    for (const sale of sales.sales.values()) if (sale.operatingDate === date) for (const ticket of sale.tickets) {
      if (state(ticket) === "active") { const session = sessions.get(ticket.id)!; const settlement = settle(ticket, session, at, "auto-closed", "auto-closed"); result.push({ ok: true, state: "completed", message: settlement.outstanding > 0 ? "Session auto-closed with outstanding charge" : "Session auto-closed", ticket, session }); }
      else if (state(ticket) === "waiting") { ticket.status = "expired" as never; events.push({ type: "expired", ticketId: ticket.id, at, details: { reason } }); result.push({ ok: false, state: "expired", message: `Ticket expired: ${reason}`, ticket }); persist(); }
    }
    return result;
  }
  return { sessions, events, findTicket, admit, exit, recover, collectOutstanding, refundDeposit, waiveOutstanding, publicTicket, close };
}

export type LifecycleStore = ReturnType<typeof createLifecycleStore>;
