import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import { openLocalDatabase } from "../src/database.ts";
import { createMembershipStore } from "../src/membership.ts";

const paths: string[] = [];
afterEach(async () => { for (const path of paths.splice(0)) await rm(path, { recursive: true, force: true }); });

describe("membership persistence", () => {
  test("restores member identity, card history, status, discounts, and events", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kiddy-membership-")); paths.push(dir);
    const firstDb = openLocalDatabase(join(dir, "kiddy-land.sqlite")); const first = createMembershipStore(firstDb); const registered = first.register({ name: "Alya", phone: "0812345678" }, "owner"); first.setDiscount("ticketPackages", "package-1", 5000); first.reissue(registered.member.id, "Lost card", "cashier"); first.setStatus(registered.member.id, "deactivated", "Requested", "owner"); firstDb.close();
    const secondDb = openLocalDatabase(join(dir, "kiddy-land.sqlite")); const second = createMembershipStore(secondDb); const restored = second.find(registered.member.id)!;
    expect(restored.child.name).toBe("Alya"); expect(restored.member.cards).toHaveLength(2); expect(restored.member.status).toBe("deactivated"); expect(second.state.discounts.ticketPackages["package-1"]).toBe(5000); expect(second.history(registered.member.id)).toHaveLength(3); secondDb.close();
  });
});
