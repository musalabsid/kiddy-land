import { describe, expect, test } from "bun:test";
import { createMembershipStore } from "../src/membership.ts";

describe("membership", () => {
  test("registers, reissues, deactivates, and preserves history", () => {
    const store = createMembershipStore();
    const first = store.register({ name: "Alya", phone: "0812345678" }, "owner");
    expect(first.member.code).toMatch(/^MEM-/);
    const second = store.reissue(first.member.id, "Lost card", "cashier");
    expect(second.member.id).toBe(first.member.id);
    expect(second.member.cards).toHaveLength(2);
    store.setStatus(first.member.id, "deactivated", "Requested", "owner");
    expect(() => store.discount(first.member.id, "products", "p")).toThrow();
    expect(store.history(first.member.id).map((event) => event.type)).toEqual(["registered", "reissued", "deactivated"]);
    store.reissue(first.member.id, "Lost card", "cashier");
    store.reissue(first.member.id, "Lost card", "cashier");
    expect(() => store.reissue(first.member.id, "Lost card", "cashier")).toThrow("reissue limit");
  });
});
