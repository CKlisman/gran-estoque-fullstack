import { Router } from "express";
import { HttpError } from "../validation.js";

function filtersOf(query) {
  const allowed = new Set(["q", "category", "stock", "threshold"]);
  if (Object.entries(query).some(([key, value]) => !allowed.has(key) || typeof value !== "string"))
    throw new HttpError(400, "Use somente filtros simples: q, category, stock e threshold.");
  const q = (query.q || "").trim();
  const category = (query.category || "").trim();
  const stock = query.stock ?? "all";
  const rawThreshold = query.threshold ?? "5";
  if (q.length > 100 || category.length > 100)
    throw new HttpError(400, "Pesquisa e categoria devem ter no máximo 100 caracteres.");
  if (!["all", "low", "out"].includes(stock))
    throw new HttpError(400, "stock deve ser all, low ou out.");
  if (!/^\d{1,10}$/.test(rawThreshold) || Number(rawThreshold) > 1_000_000_000)
    throw new HttpError(400, "threshold deve ser um inteiro de 0 a 1 bilhão.");
  return { q, category, stock, threshold: Number(rawThreshold) };
}

function stockRows(db, filters) {
  const where = [], params = [];
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
    where.push("(name LIKE ? ESCAPE '\\' OR barcode LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }
  if (filters.category) { where.push("category = ?"); params.push(filters.category); }
  if (filters.stock === "out") where.push("quantity = 0");
  if (filters.stock === "low") { where.push("quantity > 0 AND quantity <= ?"); params.push(filters.threshold); }
  return db.prepare(`SELECT id, name, category, barcode, quantity, price_cents, expiry_date, created_at
    FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY category, name COLLATE NOCASE, id`).all(...params);
}

const emptyTotals = () => ({ product_count: 0, total_quantity: 0, total_value_cents: "0", out_of_stock_count: 0, low_stock_count: 0 });
function accumulate(totals, row, threshold) {
  totals.product_count++;
  totals.total_quantity += row.quantity;
  totals.total_value_cents = String(BigInt(totals.total_value_cents) + BigInt(row.quantity) * BigInt(row.price_cents));
  if (row.quantity === 0) totals.out_of_stock_count++;
  else if (row.quantity <= threshold) totals.low_stock_count++;
}

function csvText(value) {
  let text = String(value ?? "");
  // Aspas de CSV não impedem a execução de fórmulas em aplicativos de planilha.
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function reais(cents) {
  const amount = BigInt(cents);
  return `${amount / 100n},${String(amount % 100n).padStart(2, "0")}`;
}

export function reportsController(db) {
  const router = Router();
  router.get("/stock-summary", (req, res) => {
    const filters = filtersOf(req.query), rows = stockRows(db, filters);
    const totals = emptyTotals(), categories = new Map();
    for (const row of rows) {
      accumulate(totals, row, filters.threshold);
      if (!categories.has(row.category)) categories.set(row.category, { category: row.category, ...emptyTotals() });
      accumulate(categories.get(row.category), row, filters.threshold);
    }
    res.set("Cache-Control", "no-store").json({ filters, totals, categories: [...categories.values()] });
  });
  router.get("/stock.csv", (req, res) => {
    const rows = stockRows(db, filtersOf(req.query));
    const header = ["id", "nome", "categoria", "codigo_barras", "quantidade", "valor_unitario_reais", "valor_total_reais", "validade", "cadastrado_em"];
    const records = rows.map(row => [row.id, row.name, row.category, row.barcode, row.quantity, reais(row.price_cents), reais(BigInt(row.quantity) * BigInt(row.price_cents)), row.expiry_date, row.created_at]);
    const csv = [header, ...records].map(record => record.map(csvText).join(";")).join("\r\n") + "\r\n";
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="estoque.csv"', "Cache-Control": "no-store" }).send(`\uFEFF${csv}`);
  });
  return router;
}
