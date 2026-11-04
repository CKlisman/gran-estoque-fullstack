import { Router } from "express";
import { idOf, HttpError, validate } from "../validation.js";
// Os nomes de tabelas/colunas vêm exclusivamente desta configuração interna.
export function recordsController(db, kind, { beforeSave, cleanup } = {}) {
  const router = Router();
  const isProduct = kind === "products",
    singular = isProduct ? "Produto" : "Fornecedor";
  const columns = isProduct
    ? [
        "name",
        "barcode",
        "description",
        "quantity",
        "price_cents",
        "category",
        "expiry_date",
        "image",
      ]
    : ["name", "cnpj", "address", "phone", "email", "contact"];
  const key = isProduct ? "product_id" : "supplier_id";
  const select = `SELECT r.*, (SELECT count(*) FROM product_suppliers ps WHERE ps.${key}=r.id) AS link_count FROM ${kind} r`;
  const get = (id) => {
    const row = db.prepare(`${select} WHERE r.id=?`).get(id);
    if (!row) throw new HttpError(404, `${singular} não encontrado.`);
    return row;
  };
  router.get("/", (req, res) => {
    const q = String(req.query.q || "").trim();
    const escaped = q.replace(/[\\%_]/g, "\\$&");
    res.json(
      q
        ? db
            .prepare(
              `${select} WHERE r.name LIKE ? ESCAPE '\\' OR r.${isProduct ? "barcode" : "cnpj"} LIKE ? ESCAPE '\\' ORDER BY r.id DESC`,
            )
            .all(`%${escaped}%`, `%${escaped}%`)
        : db.prepare(`${select} ORDER BY r.id DESC`).all(),
    );
  });
  router.get("/:id", (req, res) => res.json(get(idOf(req.params.id))));
  async function save(req, res) {
    const id = req.params.id ? idOf(req.params.id) : null;
    let previous = id ? get(id) : null;
    const body =
      req.body?.data !== undefined ? parseData(req.body.data) : req.body;
    const data = validate(kind, body);
    let newImage = null;
    try {
      if (isProduct) {
        newImage = await beforeSave(req.file);
        // O produto pode ter sido editado/excluído durante a conversão assíncrona.
        // Releitura dentro do try garante limpeza do upload em caso de exclusão.
        previous = id ? get(id) : null;
        data.image =
          newImage ||
          (body.remove_image === true ? null : previous?.image || null);
      }
      if (id) {
        const result = db
          .prepare(
            `UPDATE ${kind} SET ${columns.map((c) => `${c}=?`).join(",")} WHERE id=?`,
          )
          .run(...columns.map((c) => data[c]), id);
        if (!result.changes)
          throw new HttpError(404, `${singular} não encontrado.`);
      } else {
        const result = db
          .prepare(
            `INSERT INTO ${kind} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
          )
          .run(...columns.map((c) => data[c]));
        data.id = Number(result.lastInsertRowid);
      }
    } catch (error) {
      if (newImage) cleanup(newImage);
      if (String(error.message).includes("UNIQUE constraint failed"))
        throw new HttpError(
          409,
          isProduct
            ? "Produto com este código de barras já está cadastrado!"
            : "Fornecedor com esse CNPJ já está cadastrado!",
          { [isProduct ? "barcode" : "cnpj"]: "Já cadastrado." },
        );
      throw error;
    }
    if (isProduct && previous?.image && previous.image !== data.image)
      cleanup(previous.image);
    res.status(id ? 200 : 201).json({
      ...get(id || data.id),
      message: `${singular} ${id ? "atualizado" : "cadastrado"} com sucesso!`,
    });
  }
  router.post("/", save);
  router.put("/:id", save);
  router.delete("/:id", (req, res) => {
    const id = idOf(req.params.id),
      previous = get(id);
    db.prepare(`DELETE FROM ${kind} WHERE id=?`).run(id);
    if (isProduct && previous.image) cleanup(previous.image);
    res.status(204).end();
  });
  return router;
}
function parseData(data) {
  try {
    return JSON.parse(data);
  } catch {
    throw new HttpError(400, "Dados do formulário inválidos.");
  }
}
