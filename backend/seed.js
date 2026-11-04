import { openDatabase } from "./src/db/index.js";
import { validate } from "./src/validation.js";
import { demoProducts, demoSuppliers } from "./demo-data.js";
import { fileURLToPath } from "node:url";
const db = openDatabase(
  process.env.DB_PATH ||
    fileURLToPath(new URL("./data/estoque.db", import.meta.url)),
);
try {
  if (
    db.prepare("SELECT count(*) n FROM products").get().n ||
    db.prepare("SELECT count(*) n FROM suppliers").get().n
  ) {
    console.log(
      "Banco já contém cadastros. Dados preservados; demonstração não inserida.",
    );
  } else {
    db.exec("BEGIN");
    try {
      const ids = demoProducts.map((p) => {
        const v = validate("products", p);
        return Number(
          db
            .prepare(
              "INSERT INTO products(name,barcode,description,category,quantity,price_cents,expiry_date) VALUES(?,?,?,?,?,?,?)",
            )
            .run(
              v.name,
              v.barcode,
              v.description,
              v.category,
              v.quantity,
              v.price_cents,
              v.expiry_date,
            ).lastInsertRowid,
        );
      });
      const s = validate("suppliers", demoSuppliers[0]);
      const supplier = Number(
        db
          .prepare(
            "INSERT INTO suppliers(name,cnpj,address,phone,email,contact) VALUES(?,?,?,?,?,?)",
          )
          .run(s.name, s.cnpj, s.address, s.phone, s.email, s.contact)
          .lastInsertRowid,
      );
      for (const product of ids.slice(0, 3))
        db.prepare(
          "INSERT INTO product_suppliers VALUES(?,?,CURRENT_TIMESTAMP)",
        ).run(product, supplier);
      db.exec("COMMIT");
      console.log("Demonstração inserida: 4 produtos e 1 fornecedor fictício.");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
} finally {
  db.close();
}
