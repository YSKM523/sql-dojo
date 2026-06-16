import type { D1Database } from '@cloudflare/workers-types';

export interface DbUser {
  id: string;
  email: string;
  display_name: string | null;
}

export async function upsertUserByEmail(
  db: D1Database,
  email: string,
  now: number,
): Promise<DbUser> {
  const existing = await db
    .prepare('SELECT id, email, display_name FROM users WHERE email = ?')
    .bind(email)
    .first<DbUser>();
  if (existing) return existing;
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, NULL, ?)')
    .bind(id, email, now)
    .run();
  return { id, email, display_name: null };
}

export async function insertLoginCode(
  db: D1Database,
  email: string,
  code: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO login_codes (email, code, expires_at, consumed, attempts, created_at) VALUES (?, ?, ?, 0, 0, ?)',
    )
    .bind(email, code, expiresAt, now)
    .run();
}

export interface CodeRow {
  rowid: number;
  code: string;
  expires_at: number;
  consumed: number;
  attempts: number;
}

export async function latestCode(db: D1Database, email: string): Promise<CodeRow | null> {
  return db
    .prepare(
      'SELECT rowid, code, expires_at, consumed, attempts FROM login_codes WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    )
    .bind(email)
    .first<CodeRow>();
}

export async function bumpCodeAttempts(db: D1Database, rowid: number): Promise<void> {
  await db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE rowid = ?').bind(rowid).run();
}

export async function consumeCode(db: D1Database, rowid: number): Promise<void> {
  await db.prepare('UPDATE login_codes SET consumed = 1 WHERE rowid = ?').bind(rowid).run();
}

export async function listProgress(db: D1Database, userId: string): Promise<string[]> {
  const rs = await db
    .prepare('SELECT exercise_id FROM progress WHERE user_id = ?')
    .bind(userId)
    .all<{ exercise_id: string }>();
  return (rs.results ?? []).map((r) => r.exercise_id);
}

export async function upsertProgress(
  db: D1Database,
  userId: string,
  exerciseId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING",
    )
    .bind(userId, exerciseId, now)
    .run();
}

export async function mergeProgress(
  db: D1Database,
  userId: string,
  ids: string[],
  now: number,
): Promise<string[]> {
  if (ids.length) {
    const stmt = db.prepare(
      "INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING",
    );
    await db.batch(ids.map((id) => stmt.bind(userId, id, now)));
  }
  return listProgress(db, userId);
}
