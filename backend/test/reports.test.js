import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "../src/app.js";

function setup(t, seed = true) {
  const dir = mkdtempSync(join(tmpdir(), "gran-reports-"));
  const { app, db } = createApp({ dbPath: ":memory:", uploadDir: dir });
  t.after(() => { db.close(); rmSync(dir, { recursive: true }); });
  if (seed) {
    const insert = db.prepare("INSERT INTO products(name,description,category,quantity,price_cents,barcode) VALUES(?, 'Fictício', ?, ?, ?, ?)");
    insert.run("Papel A4", "Expediente", 10, 2599, "00123");
    insert.run("Caneta", "Expediente", 2, 150, null);
    insert.run("Lacre", "Fiscalização", 0, 75, null);
  }
  return { api: request(app), db };
}

test("resumo calcula saldos e valores por categoria sem contar zerados como baixos", async t => {
  const { api } = setup(t);
  const { body } = await api.get("/api/reports/stock-summary").expect(200);
  assert.deepEqual(body.totals, { product_count: 3, total_quantity: 12, total_value_cents: "26290", out_of_stock_count: 1, low_stock_count: 1 });
  assert.deepEqual(body.categories.map(c => [c.category, c.product_count, c.total_quantity, c.total_value_cents]), [["Expediente", 2, 12, "26290"], ["Fiscalização", 1, 0, "0"]]);
});

test("resumo e CSV compartilham filtros e busca trata curingas literalmente", async t => {
  const { api } = setup(t);
  const summary = await api.get("/api/reports/stock-summary?category=Expediente&stock=low&threshold=2").expect(200);
  assert.equal(summary.body.totals.product_count, 1);
  assert.equal(summary.body.totals.total_value_cents, "300");
  const csv = await api.get("/api/reports/stock.csv?category=Expediente&stock=low&threshold=2").expect(200);
  assert.match(csv.text, /Caneta/); assert.doesNotMatch(csv.text, /Papel A4|Lacre/);
  assert.equal((await api.get("/api/reports/stock-summary?stock=out")).body.totals.out_of_stock_count, 1);
  assert.equal((await api.get("/api/reports/stock-summary?q=00123")).body.totals.product_count, 1);
  assert.equal((await api.get("/api/reports/stock-summary?q=%25")).body.totals.product_count, 0);
  assert.equal((await api.get("/api/reports/stock-summary?threshold=0")).body.totals.low_stock_count, 0);
});

test("banco vazio produz indicadores zerados e CSV com cabeçalho", async t => {
  const { api } = setup(t, false);
  const r = await api.get("/api/reports/stock-summary").expect(200);
  assert.equal(r.body.totals.product_count, 0); assert.equal(r.body.totals.total_value_cents, "0"); assert.deepEqual(r.body.categories, []);
  const c = await api.get("/api/reports/stock.csv").expect(200);
  assert.match(c.headers["content-type"], /text\/csv; charset=utf-8/);
  assert.match(c.headers["content-disposition"], /attachment; filename="estoque.csv"/);
  assert.match(c.text, /"id";"nome";"categoria"/);
  assert.equal(c.text.trim().split("\r\n").length, 1);
});

test("filtros inválidos retornam HTTP 400 nas duas rotas", async t => {
  const { api } = setup(t);
  for (const query of ["threshold=-1", "threshold=2.5", "threshold=1000000001", "threshold=abc", "stock=invalid", "q=a&q=b", "category[x]=a", `q=${"a".repeat(101)}`]) {
    for (const path of ["stock-summary", "stock.csv"])
      await api.get(`/api/reports/${path}?${query}`).expect(400);
  }
});

test("CSV protege células de fórmula e preserva delimitadores, aspas e quebras", async t => {
  const { api, db } = setup(t, false);
  db.prepare("INSERT INTO products(name,description,category,quantity,price_cents) VALUES(?, 'Fictício', ?, 2, 1234)").run('=SUM(1;2) "teste"\nlinha', "  @categoria");
  const c = await api.get("/api/reports/stock.csv").expect(200);
  assert.match(c.text, /"'=SUM\(1;2\) ""teste""\nlinha"/);
  assert.ok(c.text.includes('"\'  @categoria"'));
  assert.match(c.text, /"12,34";"24,68"/);
});

test("valores altos mantêm cálculo exato no JSON e CSV", async t => {
  const { api, db } = setup(t, false);
  db.prepare("INSERT INTO products(name,description,category,quantity,price_cents) VALUES('Teste', 'Fictício', 'Teste', 1000000000, 99999999999)").run();
  const s = await api.get("/api/reports/stock-summary").expect(200);
  assert.equal(s.body.totals.total_value_cents, "99999999999000000000");
  const c = await api.get("/api/reports/stock.csv").expect(200);
  assert.match(c.text, /"999999999990000000,00"/);
});
