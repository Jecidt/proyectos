// SQLite persistent database for JecidtSebasBoost Pro
// Uses better-sqlite3 for synchronous, file-based persistence

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "jecidtsebasboost.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'instagram',
      ig_username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT,
      user_agent TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending_verification',
      proxy TEXT,
      follows_today INTEGER NOT NULL DEFAULT 0,
      total_follows_delivered INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      ig_user_id TEXT,
      session_cookies TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      ig_username TEXT NOT NULL,
      package_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      followers INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'demo',
      created_at TEXT NOT NULL,
      deployed_at TEXT,
      delivered_at TEXT,
      receipt_code TEXT NOT NULL UNIQUE,
      delivery_time TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS order_bots (
      order_id TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      PRIMARY KEY (order_id, bot_id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (bot_id) REFERENCES bot_accounts(id)
    );
  `);
}

// ─── Bot Account CRUD ────────────────────────────────────────────────────────

export interface DbBotAccount {
  id: string;
  platform: string;
  ig_username: string;
  email: string;
  password: string;
  phone_number: string | null;
  user_agent: string;
  verification_status: string;
  created_at: string;
  last_used_at: string | null;
  status: string;
  proxy: string | null;
  follows_today: number;
  total_follows_delivered: number;
  notes: string | null;
  ig_user_id: string | null;
  session_cookies: string | null;
}

export function insertBot(bot: DbBotAccount): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO bot_accounts (
      id, platform, ig_username, email, password, phone_number,
      user_agent, verification_status, created_at, last_used_at,
      status, proxy, follows_today, total_follows_delivered, notes,
      ig_user_id, session_cookies
    ) VALUES (
      @id, @platform, @ig_username, @email, @password, @phone_number,
      @user_agent, @verification_status, @created_at, @last_used_at,
      @status, @proxy, @follows_today, @total_follows_delivered, @notes,
      @ig_user_id, @session_cookies
    )
  `).run(bot);
}

export function getAllBots(): DbBotAccount[] {
  const db = getDb();
  return db.prepare("SELECT * FROM bot_accounts ORDER BY created_at DESC").all() as DbBotAccount[];
}

export function getBotById(id: string): DbBotAccount | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM bot_accounts WHERE id = ?").get(id) as DbBotAccount) || null;
}

export function getAvailableBots(limit?: number): DbBotAccount[] {
  const db = getDb();
  const query = limit
    ? "SELECT * FROM bot_accounts WHERE status = 'available' LIMIT ?"
    : "SELECT * FROM bot_accounts WHERE status = 'available'";
  return (limit
    ? db.prepare(query).all(limit)
    : db.prepare(query).all()) as DbBotAccount[];
}

export function updateBotStatus(id: string, status: string): void {
  const db = getDb();
  db.prepare("UPDATE bot_accounts SET status = ? WHERE id = ?").run(status, id);
}

export function updateBotLastUsed(id: string): void {
  const db = getDb();
  db.prepare("UPDATE bot_accounts SET last_used_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id
  );
}

export function updateBotFollows(id: string, followsToday: number, totalFollows: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE bot_accounts SET follows_today = ?, total_follows_delivered = ? WHERE id = ?"
  ).run(followsToday, totalFollows, id);
}

export function updateBotSessionCookies(id: string, cookies: string): void {
  const db = getDb();
  db.prepare("UPDATE bot_accounts SET session_cookies = ? WHERE id = ?").run(cookies, id);
}

export function updateBotVerification(id: string, status: string, igUserId?: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE bot_accounts SET verification_status = ?, ig_user_id = ? WHERE id = ?"
  ).run(status, igUserId || null, id);
}

export function deleteBot(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM order_bots WHERE bot_id = ?").run(id);
  db.prepare("DELETE FROM bot_accounts WHERE id = ?").run(id);
}

export function getBotStats() {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as deployed,
      SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
      SUM(CASE WHEN status = 'pending_verification' THEN 1 ELSE 0 END) as pending_verification
    FROM bot_accounts
  `).get() as { total: number; available: number; deployed: number; banned: number; pending_verification: number };
  return row;
}

// ─── Order CRUD ──────────────────────────────────────────────────────────────

export interface DbOrder {
  id: string;
  ig_username: string;
  package_id: string;
  package_name: string;
  followers: number;
  price: number;
  status: string;
  payment_method: string;
  created_at: string;
  deployed_at: string | null;
  delivered_at: string | null;
  receipt_code: string;
  delivery_time: string;
  notes: string | null;
}

export function insertOrder(order: DbOrder, botIds: string[]): void {
  const db = getDb();
  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (
      id, ig_username, package_id, package_name, followers, price,
      status, payment_method, created_at, deployed_at, delivered_at,
      receipt_code, delivery_time, notes
    ) VALUES (
      @id, @ig_username, @package_id, @package_name, @followers, @price,
      @status, @payment_method, @created_at, @deployed_at, @delivered_at,
      @receipt_code, @delivery_time, @notes
    )
  `);
  const insertBotLink = db.prepare(
    "INSERT INTO order_bots (order_id, bot_id) VALUES (?, ?)"
  );

  const transaction = db.transaction(() => {
    insertOrderStmt.run(order);
    for (const botId of botIds) {
      insertBotLink.run(order.id, botId);
    }
  });
  transaction();
}

export function getOrderById(id: string): DbOrder | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as DbOrder) || null;
}

export function getOrderByReceiptCode(receiptCode: string): DbOrder | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM orders WHERE receipt_code = ?").get(receiptCode) as DbOrder) || null
  );
}

export function getOrdersByUsername(igUsername: string): DbOrder[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM orders WHERE ig_username = ? ORDER BY created_at DESC")
    .all(igUsername) as DbOrder[];
}

export function getAllOrders(): DbOrder[] {
  const db = getDb();
  return db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as DbOrder[];
}

export function updateOrderStatus(
  id: string,
  status: string,
  extra?: { deployed_at?: string; delivered_at?: string }
): void {
  const db = getDb();
  if (extra?.deployed_at) {
    db.prepare("UPDATE orders SET status = ?, deployed_at = ? WHERE id = ?").run(
      status,
      extra.deployed_at,
      id
    );
  } else if (extra?.delivered_at) {
    db.prepare("UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?").run(
      status,
      extra.delivered_at,
      id
    );
  } else {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  }
}

export function getOrderBotIds(orderId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT bot_id FROM order_bots WHERE order_id = ?")
    .all(orderId) as { bot_id: string }[];
  return rows.map((r) => r.bot_id);
}

export function getOrderStats() {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status IN ('processing', 'deployed') THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'delivered' THEN price ELSE 0 END) as revenue,
      SUM(CASE WHEN status = 'delivered' THEN followers ELSE 0 END) as total_followers
    FROM orders
  `).get() as {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
    revenue: number;
    total_followers: number;
  };
  return row;
}
