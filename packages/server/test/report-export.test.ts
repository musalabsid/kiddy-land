import { describe, expect, test } from "bun:test";

import { reportCsv, reportPdf } from "../src/report-export.ts";

describe("report exports", () => {
  const report = {
    kind: "financial",
    filters: { from: "2024-01-01", to: "2024-01-01" },
    timezone: "Asia/Jakarta",
    generatedAt: "2024-01-01T00:00:00.000Z",
    data: { rows: [{ value: "a,b" }], totals: { total: 1 } },
  };
  test("includes period and generation metadata in CSV and PDF", () => {
    expect(reportCsv(report)).toContain("2024-01-01");
    expect(reportCsv(report)).toContain("generatedAt");
    expect(reportPdf(report)).toContain("%PDF-1.4");
  });
});
