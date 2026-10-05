import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Supabase migrations - RLS coverage', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');

  it('has a migrations folder with at least one .sql file', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('every CREATE TABLE has a matching ENABLE ROW LEVEL SECURITY', () => {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'));

    const createdTables: string[] = [];
    const rlsEnabledTables: string[] = [];

    // Detects created tables:
    // e.g. "create table if not exists public.profiles (" or "create table projects ("
    const createTableRegex =
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(/gi;

    // Detects RLS being enabled:
    // e.g. "alter table public.profiles enable row level security;"
    const enableRlsRegex =
      /alter\s+table\s+(?:public\.)?([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security\s*;/gi;

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      let match: RegExpExecArray | null;

      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1]?.toLowerCase();
        if (tableName) {
          createdTables.push(tableName);
        }
      }

      while ((match = enableRlsRegex.exec(content)) !== null) {
        const tableName = match[1]?.toLowerCase();
        if (tableName) {
          rlsEnabledTables.push(tableName);
        }
      }
    }

    // Some tables must be detected
    expect(createdTables.length).toBeGreaterThan(0);

    // Every created table must have RLS enabled
    for (const table of createdTables) {
      expect(
        rlsEnabledTables,
        `La tabla '${table}' fue creada pero no tiene activada Row Level Security (RLS)`,
      ).toContain(table);
    }
  });
});
