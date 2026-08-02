import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { LocalDatabase } from "./database.ts";

export type MemberStatus = "active" | "deactivated";
export type DiscountConfig = { ticketPackages: Record<string, number>; products: Record<string, number> };
export type MemberEvent = { id: string; type: "registered" | "reissued" | "deactivated" | "reactivated" | "discount-applied"; memberId: string; childId: string; saleId?: string; lineId?: string; amount?: number; reason?: string; actorId: string; at: number };
export type ChildRecord = { id: string; name: string; phone?: string; createdAt: number; updatedAt: number };
export type MemberCard = { code: string; issuedAt: number; revokedAt?: number; reason?: string };
export type MemberRecord = { id: string; childId: string; status: MemberStatus; code: string; cards: MemberCard[]; createdAt: number; updatedAt: number };
export type MembershipState = { children: ChildRecord[]; members: MemberRecord[]; discounts: DiscountConfig; events: MemberEvent[] };
function id(prefix: string) { return `${prefix}_${randomBytes(10).toString("hex")}`; }
function code() { return `MEM-${randomBytes(4).toString("hex").toUpperCase()}`; }
function normalize(value: string) { return value.trim().toLocaleLowerCase(); }
const empty = (): MembershipState => ({ children: [], members: [], discounts: { ticketPackages: {}, products: {} }, events: [] });
export function createMembershipStore(database?: LocalDatabase) {
  let state = empty();
  if (database) { const row = database.orm.all<{ state: string }>(sql`SELECT state_json AS state FROM membership_state WHERE id = 1`)[0]; if (row) state = JSON.parse(row.state) as MembershipState; }
  const persist = () => { if (database) database.orm.run(sql`UPDATE membership_state SET state_json = ${JSON.stringify(state)}, updated_at = ${Date.now()} WHERE id = 1`); };
  const event = (input: Omit<MemberEvent, "id" | "at">) => { state.events.push({ ...input, id: id("member_event"), at: Date.now() }); };
  function register(input: { name: string; phone?: string }, actorId: string) { if (!input.name?.trim()) throw new Error("Child name is required"); const phone = input.phone?.trim(); if (state.children.some((child) => normalize(child.name) === normalize(input.name) && (!phone || child.phone === phone) && state.members.some((member) => member.childId === child.id && member.status === "active"))) throw new Error("Child already has active member"); const child: ChildRecord = { id: id("child"), name: input.name.trim(), phone, createdAt: Date.now(), updatedAt: Date.now() }; const member: MemberRecord = { id: id("member"), childId: child.id, status: "active", code: code(), cards: [], createdAt: Date.now(), updatedAt: Date.now() }; member.cards.push({ code: member.code, issuedAt: member.createdAt }); state.children.push(child); state.members.push(member); event({ type: "registered", memberId: member.id, childId: child.id, actorId }); persist(); return { member, child }; }
  function findByCode(value: string) { const member = state.members.find((item) => item.status !== "deactivated" && item.cards.some((card) => card.code === value && !card.revokedAt)); if (!member) return undefined; const child = state.children.find((item) => item.id === member.childId)!; return { member, child }; }
  function search(name: string, phone: string) { const n = normalize(name); const p = phone.trim(); return state.members.filter((member) => { const child = state.children.find((item) => item.id === member.childId); return child && normalize(child.name) === n && child.phone === p; }).map((member) => ({ member, child: state.children.find((item) => item.id === member.childId)! })); }
  function find(idValue: string) { const member = state.members.find((item) => item.id === idValue); return member ? { member, child: state.children.find((item) => item.id === member.childId)! } : undefined; }
  function reissue(memberId: string, reason: string, actorId: string) { const found = find(memberId); if (!found || !reason.trim()) throw new Error("Member unavailable"); const at = Date.now(); const prior = found.member.code; const next = code(); const card = found.member.cards.find((item) => item.code === prior); if (card) { card.revokedAt = at; card.reason = reason; } found.member.code = next; found.member.cards.push({ code: next, issuedAt: at }); found.member.updatedAt = at; event({ type: "reissued", memberId, childId: found.member.childId, reason, actorId }); persist(); return found; }
  function setStatus(memberId: string, status: MemberStatus, reason: string, actorId: string) { const found = find(memberId); if (!found || !reason.trim()) throw new Error("Member unavailable"); found.member.status = status; found.member.updatedAt = Date.now(); event({ type: status === "active" ? "reactivated" : "deactivated", memberId, childId: found.member.childId, reason, actorId }); persist(); return found; }
  function setDiscount(kind: "ticketPackages" | "products", itemId: string, amount: number) { if (!Number.isInteger(amount) || amount < 0) throw new Error("Invalid discount"); state.discounts[kind][itemId] = amount; persist(); return state.discounts; }
  function discount(memberId: string, kind: "ticketPackages" | "products", itemId: string) { const found = find(memberId); if (!found || found.member.status !== "active") throw new Error("Member inactive"); return state.discounts[kind][itemId] ?? 0; }
  return { state, persist, register, findByCode, search, find, list: () => state.members.map((member) => ({ member, child: state.children.find((child) => child.id === member.childId)! })), reissue, setStatus, setDiscount, discount, event, history: (memberId: string) => state.events.filter((item) => item.memberId === memberId) };
}
export type MembershipStore = ReturnType<typeof createMembershipStore>;
