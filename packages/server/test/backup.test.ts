import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createBackupService } from "../src/backup.ts";
import { openLocalDatabase } from "../src/database.ts";

describe("verified backups", () => {
  test("loads manifest and stages an explicit restore", async () => {
    const dir = await mkdtemp("kiddy-backup-");
    const db = openLocalDatabase(join(dir, "main.sqlite"));
    const service = createBackupService(db, join(dir, "backups"));
    const backup = await service.backup();
    expect(backup.status).toBe("verified");
    const reopened = createBackupService(db, join(dir, "backups"));
    await reopened.load();
    expect(reopened.records()).toHaveLength(1);
    const staged = await reopened.prepareRestore(
      backup.id,
      `RESTORE ${backup.id}`,
    );
    expect(staged.safety.status).toBe("verified");
    expect(reopened.staged()?.id).toBe(backup.id);
    await db.close();
    await rm(dir, { recursive: true, force: true });
  });
  test("rejects malformed manifests", async () => {
    const dir = await mkdtemp("kiddy-backup-");
    const db = openLocalDatabase(join(dir, "main.sqlite"));
    const path = join(dir, "backups");
    await mkdir(path, { recursive: true });
    await writeFile(join(path, "manifest.json"), "{}");
    const service = createBackupService(db, path);
    await expect(service.load()).rejects.toThrow("invalid");
    await db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
