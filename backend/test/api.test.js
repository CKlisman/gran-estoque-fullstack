import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import sharp from "sharp";
import express from "express";
import { recordsController } from "../src/controllers/records.js";
import { createApp } from "../src/app.js";

test("upload concorrente à exclusão ou outra edição não deixa imagens órfãs", async (t) => {
  const { db } = setup(t);
  const cleanups = [],
    pending = [];
  let notify;
  const entered = () =>
    new Promise((resolve) => {
      notify = resolve;
    });
  const app = express();
  app.use(express.json());
  app.use(
    "/api/products",
    recordsController(db, "products", {
      beforeSave: () =>
        new Promise((resolve) => {
          pending.push(resolve);
          notify();
        }),
      cleanup: (image) => cleanups.push(image),
    }),
  );
  app.use((error, req, res, next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  const api = request(app);
  const insert = () =>
    Number(
      db
        .prepare(
          "INSERT INTO products(name,description,category,image) VALUES('Produto','Teste','Outro','/uploads/old.webp')",
        )
        .run().lastInsertRowid,
    );
  let id = insert(),
    signal = entered();
  const updating = api
    .put(`/api/products/${id}`)
    .send(product)
    .then((r) => r);
  await signal;
  await api.delete(`/api/products/${id}`).expect(204);
  pending.shift()("/uploads/deleted-product.webp");
  assert.equal((await updating).status, 404);
  assert.ok(cleanups.includes("/uploads/deleted-product.webp"));
  id = insert();
  signal = entered();
  const first = api
    .put(`/api/products/${id}`)
    .send(product)
    .then((r) => r);
  await signal;
  signal = entered();
  const second = api
    .put(`/api/products/${id}`)
    .send(product)
    .then((r) => r);
  await signal;
  pending.shift()("/uploads/first.webp");
  assert.equal((await first).status, 200);
  pending.shift()("/uploads/second.webp");
  assert.equal((await second).status, 200);
  assert.ok(cleanups.includes("/uploads/first.webp"));
  assert.equal(
    db.prepare("SELECT image FROM products WHERE id=?").get(id).image,
    "/uploads/second.webp",
  );
});

const product = {
  name: "Teclado",
  description: "Teclado USB",
  category: "Eletrônicos",
  barcode: "789123",
  quantity: 3,
  price: "49.90",
};
const supplier = {
  name: "Fornecedor fictício",
  cnpj: "11.222.333/0001-81",
  address: "Rua Exemplo, 10",
  phone: "(85) 99999-0000",
  email: "exemplo@example.com",
  contact: "Pessoa de teste",
};
function setup(t, disk = false) {
  const dir = mkdtempSync(join(tmpdir(), "gran-estoque-"));
  const opts = {
    dbPath: disk ? join(dir, "test.db") : ":memory:",
    uploadDir: join(dir, "uploads"),
  };
  const instance = createApp(opts);
  t.after(() => {
    instance.db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { ...instance, opts, api: request(instance.app) };
}
test("CRUD produto, preço em centavos, pesquisa e código vazio opcional", async (t) => {
  const { api } = setup(t);
  const p = (await api.post("/api/products").send(product).expect(201)).body;
  assert.equal(p.price_cents, 4990);
  assert.equal(
    (await api.get("/api/products?q=Teclado").expect(200)).body.length,
    1,
  );
  await api
    .put(`/api/products/${p.id}`)
    .send({ ...product, name: "Mouse" })
    .expect(200);
  assert.equal((await api.get(`/api/products/${p.id}`)).body.name, "Mouse");
  await api
    .post("/api/products")
    .send({ ...product, barcode: "" })
    .expect(201);
  await api
    .post("/api/products")
    .send({ ...product, barcode: "" })
    .expect(201);
  await api.delete(`/api/products/${p.id}`).expect(204);
  await api.get(`/api/products/${p.id}`).expect(404);
});
test("duplicidades de barcode/CNPJ retornam 409 inclusive com normalização", async (t) => {
  const { api } = setup(t);
  await api.post("/api/products").send(product).expect(201);
  await api.post("/api/products").send(product).expect(409);
  await api.post("/api/suppliers").send(supplier).expect(201);
  const r = await api
    .post("/api/suppliers")
    .send({ ...supplier, cnpj: "11222333000181" })
    .expect(409);
  assert.match(r.body.message, /CNPJ/);
});
test("valida obrigatórios, números, datas reais, CNPJ, telefone e e-mail", async (t) => {
  const { api } = setup(t);
  const bad = await api.post("/api/products").send({}).expect(400);
  assert.ok(bad.body.fields.name);
  for (const patch of [
    { quantity: -1 },
    { quantity: 1.5 },
    { price: "1.234" },
    { price: "" },
    { quantity: "" },
    { expiry_date: "2026-02-30" },
    { barcode: "ABC" },
    { name: "  " },
  ]) {
    await api
      .post("/api/products")
      .send({ ...product, ...patch })
      .expect(400);
  }
  for (const patch of [
    { cnpj: "11111111111111" },
    { email: "invalido" },
    { phone: "12" },
    { contact: " " },
  ]) {
    await api
      .post("/api/suppliers")
      .send({ ...supplier, ...patch })
      .expect(400);
  }
  await api.post("/api/products").send(null).expect(400);
});
test("associações nos dois sentidos, duplicidade, desassociação e cascata", async (t) => {
  const { api } = setup(t);
  const p = (await api.post("/api/products").send(product)).body;
  const s = (await api.post("/api/suppliers").send(supplier)).body;
  const url = `/api/products/${p.id}/suppliers/${s.id}`;
  await api.post(url).expect(201);
  await api.post(url).expect(409);
  assert.equal(
    (await api.get(`/api/products/${p.id}/suppliers`)).body[0].id,
    s.id,
  );
  assert.equal(
    (await api.get(`/api/suppliers/${s.id}/products`)).body[0].id,
    p.id,
  );
  await api.delete(url).expect(204);
  await api.delete(url).expect(404);
  await api.post(url).expect(201);
  await api.delete(`/api/products/${p.id}`).expect(204);
  assert.equal(
    (await api.get(`/api/suppliers/${s.id}/products`)).body.length,
    0,
  );
  await api.get(`/api/suppliers/${s.id}`).expect(200);
  await api
    .put(`/api/suppliers/${s.id}`)
    .send({ ...supplier, name: "Atualizado" })
    .expect(200);
  await api.delete(`/api/suppliers/${s.id}`).expect(204);
});
test("IDs inválidos, vínculos ausentes e texto SQL não afetam banco", async (t) => {
  const { api } = setup(t);
  for (const id of ["-1", "abc", "0", "1.5"])
    await api.get(`/api/products/${id}`).expect(400);
  await api.post("/api/products/10/suppliers/20").expect(404);
  await api
    .post("/api/products")
    .send({ ...product, name: "'; DROP TABLE products;--" })
    .expect(201);
  assert.equal((await api.get("/api/products")).body.length, 1);
});
test("persistência após reabrir SQLite", async (t) => {
  const { api, db, opts } = setup(t, true);
  await api.post("/api/products").send(product).expect(201);
  // Outra conexão ao mesmo arquivo confirma persistência fora da conexão original.
  const reopened = createApp(opts);
  assert.equal(
    (await request(reopened.app).get("/api/products")).body[0].name,
    product.name,
  );
  reopened.db.close();
  assert.ok(db);
});
test("upload decodificado, rejeição de falso PNG/tamanho e limpeza após falha", async (t) => {
  const { api, opts } = setup(t);
  const png = await sharp({
    create: { width: 3, height: 3, channels: 3, background: "#235c45" },
  })
    .png()
    .toBuffer();
  const r = await api
    .post("/api/products")
    .field("data", JSON.stringify(product))
    .attach("image", png, "foto.png")
    .expect(201);
  assert.match(r.body.image, /^\/uploads\/[a-f0-9-]+\.webp$/);
  await api.get(r.body.image).expect(200);
  await api
    .post("/api/products")
    .field("data", JSON.stringify(product))
    .attach("image", png, "foto.png")
    .expect(409);
  assert.equal(readdirSync(opts.uploadDir).length, 1);
  await api
    .post("/api/products")
    .field("data", JSON.stringify(product))
    .attach("image", Buffer.from("<svg></svg>"), "fake.png")
    .expect(400);
  await api
    .post("/api/products")
    .field("data", JSON.stringify(product))
    .attach("image", Buffer.alloc(2097153), "grande.png")
    .expect(400);
  await api
    .put(`/api/products/${r.body.id}`)
    .send({ ...product, remove_image: true })
    .expect(200);
  assert.equal(readdirSync(opts.uploadDir).length, 0);
});
