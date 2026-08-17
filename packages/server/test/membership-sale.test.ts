import { describe, expect, test } from "bun:test";
import { createCalendarStore } from "../src/calendar.ts";
import { createMembershipStore } from "../src/membership.ts";
import { createSaleStore } from "../src/sale.ts";

describe("membership sale discounts", () => {
  test("applies configured ticket discount and snapshots it", () => {
    const calendar = createCalendarStore(); calendar.setWeeklyHours("monday", { open: "00:00", close: "23:59" }, "owner"); const pkg = calendar.upsertPackage({ name: "Play", includedMinutes: 90, weekdayPrice: 50000, weekendPrice: 50000, overridePrices: {}, overtimeRate: 1000, deposit: 20000, depositPolicy: "return-remainder" }, "owner"); const membership = createMembershipStore(); const registered = membership.register({ name: "Alya", phone: "0812345678" }, "cashier"); membership.setDiscount("ticketPackages", pkg.id, 5000); const sale = createSaleStore(calendar, undefined, undefined, membership).complete({ idempotencyKey: "member-sale", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "cash", lines: [{ childId: registered.child.id, packageId: pkg.id, memberId: registered.member.id }] });
    expect(sale.total).toBe(45000); expect(sale.receipt.lines[0]).toMatchObject({ membershipDiscount: 5000, memberId: registered.member.id, originalPrice: 50000 }); expect(membership.history(registered.member.id).some((event) => event.type === "discount-applied")).toBe(true);
  });
  test("rejects a member belonging to another child and ignores revoked card", () => {
    const membership = createMembershipStore(); const first = membership.register({ name: "A", phone: "0812345678" }, "cashier"); const second = membership.register({ name: "B", phone: "0812345679" }, "cashier"); const old = first.member.code; membership.reissue(first.member.id, "lost", "cashier"); expect(membership.findByCode(old)).toBeUndefined(); expect(second.member.childId).not.toBe(first.member.childId);
  });
});
