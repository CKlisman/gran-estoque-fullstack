import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, barcode TEXT UNIQUE,
      description TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity>=0),
      price_cents INTEGER NOT NULL DEFAULT 0 CHECK(price_cents>=0), category TEXT NOT NULL,
      expiry_date TEXT, image TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, contact TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS product_suppliers (
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(product_id,supplier_id)
    ); CREATE INDEX IF NOT EXISTS links_by_supplier ON product_suppliers(supplier_id);`);
  return db;
}
