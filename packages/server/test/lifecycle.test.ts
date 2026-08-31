import { describe, expect, test } from "bun:test";

import { createCalendarStore } from "../src/calendar.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createSaleStore } from "../src/sale.ts";

describe("ticket and play session lifecycle", () => {
  function fixture(
    includedMinutes = 60,
    depositPolicy:
      | "return-remainder"
      | "forfeit-overtime"
      | "unlimited-cap" = "return-remainder",
  ) {
    const calendar = createCalendarStore();
    calendar.setWeeklyHours(
      "monday",
      { open: "10:00", close: "20:00" },
      "owner",
    );
    const pkg = calendar.upsertPackage(
      {
        name: "Play",
        includedMinutes,
        weekdayPrice: 50000,
        weekendPrice: 70000,
        overridePrices: {},
        overtimeRate: 1000,
        overtimeThreshold: 0,
        overtimePercentage: 10,
        deposit: 20000,
        depositPolicy,
      },
      "owner",
    );
    const sales = createSaleStore(calendar);
    const sale = sales.complete({
      idempotencyKey: crypto.randomUUID(),
      cashierId: "cashier",
      operatingDate: "2024-01-01",
      paymentMethod: "cash",
      lines: [{ childId: "child-1", packageId: pkg.id }],
    });
    return {
      lifecycle: createLifecycleStore(sales, calendar),
      ticket: sale.tickets[0]!,
    };
  }

  test("admits once and duplicate entry is state-aware", () => {
    const { lifecycle, ticket } = fixture();
    const entered = lifecycle.admit(
      ticket.code,
      Date.parse("2024-01-01T10:00:00Z"),
    );
    expect(entered.ok).toBe(true);
    expect(lifecycle.admit(ticket.code).message).toBe(
      "Ticket already admitted",
    );
    expect(lifecycle.sessions.size).toBe(1);
  });

  test("finite session settles overtime and deposit remainder", () => {
    const { lifecycle, ticket } = fixture();
    lifecycle.admit(ticket.code, Date.parse("2024-01-01T10:00:00Z"));
    const result = lifecycle.exit(
      ticket.code,
      Date.parse("2024-01-01T11:30:00Z"),
    );
    expect(result.session?.overtimeMinutes).toBe(30);
    expect(result.session?.depositRefunded).toBe(0);
    expect(result.session?.outstandingCharge).toBe(10000);
    expect(lifecycle.exit(ticket.code).message).toBe("Ticket already settled");
  });

  test("collects the exact outstanding charge once", () => {
    const { lifecycle, ticket } = fixture();
    lifecycle.admit(ticket.code, Date.parse("2024-01-01T10:00:00Z"));
    const exited = lifecycle.exit(
      ticket.code,
      Date.parse("2024-01-01T11:30:00Z"),
    );
    const collected = lifecycle.collectOutstanding(
      ticket.id,
      exited.session!.outstandingCharge,
      "cash",
    );
    expect(collected.amount).toBe(10000);
    expect(collected.session.outstandingCharge).toBe(0);
    expect(() => lifecycle.collectOutstanding(ticket.id, 1, "cash")).toThrow(
      "No outstanding charge",
    );
  });

  test("unlimited package has no overtime during play", () => {
    const { lifecycle, ticket } = fixture(null, "unlimited-cap");
    lifecycle.admit(ticket.code, Date.parse("2024-01-01T10:00:00Z"));
    const result = lifecycle.exit(
      ticket.code,
      Date.parse("2024-01-01T19:00:00Z"),
    );
    expect(result.session?.overtimeMinutes).toBe(0);
    expect(result.session?.outstandingCharge).toBe(0);
  });

  test("closing auto-settles active sessions with an auto-closed status", () => {
    const { lifecycle, ticket } = fixture();
    lifecycle.admit(ticket.code, Date.parse("2024-01-01T10:00:00Z"));
    const closed = lifecycle.close(
      "2024-01-01",
      Date.parse("2024-01-01T11:00:00Z"),
    );
    expect(closed[0]?.session?.status).toBe("auto-closed");
    expect(lifecycle.events.at(-1)?.type).toBe("auto-closed");
  });

  test("recovery keeps ticket identity and closing expires waiting tickets", () => {
    const first = fixture();
    const recovered = first.lifecycle.recover(first.ticket.code, "child-1");
    expect(recovered.ticketId).toBe(first.ticket.id);
    const second = fixture();
    const closed = second.lifecycle.close(
      "2024-01-01",
      Date.parse("2024-01-01T20:00:00Z"),
    );
    expect(closed[0]?.state).toBe("expired");
  });
});
