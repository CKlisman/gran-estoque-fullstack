import { Router } from "express";
import { HttpError, idOf } from "../validation.js";
export function associationsController(db) {
  const router = Router();
  const exists = (table, value) => {
    const id = idOf(value);
    if (!db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id))
      throw new HttpError(404, "Produto ou fornecedor não encontrado.");
    return id;
  };
  router.get("/products/:id/suppliers", (req, res) => {
    const id = exists("products", req.params.id);
    res.json(
      db
        .prepare(
          "SELECT s.* FROM suppliers s JOIN product_suppliers ps ON s.id=ps.supplier_id WHERE ps.product_id=? ORDER BY s.name",
        )
        .all(id),
    );
  });
  router.get("/suppliers/:id/products", (req, res) => {
    const id = exists("suppliers", req.params.id);
    res.json(
      db
        .prepare(
          "SELECT p.* FROM products p JOIN product_suppliers ps ON p.id=ps.product_id WHERE ps.supplier_id=? ORDER BY p.name",
        )
        .all(id),
    );
  });
  router.post("/products/:productId/suppliers/:supplierId", (req, res) => {
    const p = exists("products", req.params.productId),
      s = exists("suppliers", req.params.supplierId);
    try {
      db.prepare(
        "INSERT INTO product_suppliers(product_id,supplier_id) VALUES (?,?)",
      ).run(p, s);
    } catch (error) {
      if (String(error.message).includes("UNIQUE constraint failed"))
        throw new HttpError(
          409,
          "Fornecedor já está associado a este produto!",
        );
      throw error;
    }
    res
      .status(201)
      .json({ message: "Fornecedor associado com sucesso ao produto!" });
  });
  router.delete("/products/:productId/suppliers/:supplierId", (req, res) => {
    const p = exists("products", req.params.productId),
      s = exists("suppliers", req.params.supplierId);
    if (
      !db
        .prepare(
          "DELETE FROM product_suppliers WHERE product_id=? AND supplier_id=?",
        )
        .run(p, s).changes
    )
      throw new HttpError(404, "Associação não encontrada.");
    res.status(204).end();
  });
  return router;
}
