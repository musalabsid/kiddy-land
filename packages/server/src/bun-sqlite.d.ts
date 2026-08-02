declare module "bun:sqlite" {
  export class Database {
    constructor(path: string, options?: { create?: boolean; strict?: boolean });
    run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number };
    query<T = Record<string, unknown>>(sql: string): { get: (...params: unknown[]) => T; all: (...params: unknown[]) => T[] };
    close(): void;
  }
}
