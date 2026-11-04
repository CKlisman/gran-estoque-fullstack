import express from "express";
import multer from "multer";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db/index.js";
import { HttpError } from "./validation.js";
import { productsController } from "./controllers/products.js";
import { suppliersController } from "./controllers/suppliers.js";
import { associationsController } from "./controllers/associations.js";
const base = fileURLToPath(new URL("../../", import.meta.url));
export function createApp({
  dbPath = resolve(base, "backend/data/estoque.db"),
  uploadDir = resolve(base, "backend/uploads"),
} = {}) {
  mkdirSync(uploadDir, { recursive: true });
  const db = openDatabase(dbPath),
    app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    // Aplicação local sem autenticação: bloqueia gravações originadas em outros sites.
    const origin = req.get("origin");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && origin) {
      let originHost;
      try {
        originHost = new URL(origin).hostname;
      } catch {}
      if (!["localhost", "127.0.0.1", "[::1]"].includes(originHost))
        return next(new HttpError(403, "Origem não permitida."));
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use(
    "/uploads",
    express.static(uploadDir, { dotfiles: "deny", index: false }),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: 1,
      fields: 1,
      fieldSize: 64 * 1024,
    },
  });
  app.use("/api", associationsController(db));
  app.use(
    "/api/products",
    upload.single("image"),
    productsController(db, uploadDir),
  );
  app.use("/api/suppliers", suppliersController(db));
  app.use("/api", (req, res, next) =>
    next(new HttpError(404, "Rota não encontrada.")),
  );
  const dist = resolve(base, "frontend/dist");
  if (existsSync(resolve(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get("/", (req, res) => res.sendFile(resolve(dist, "index.html")));
  }
  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError)
      return res
        .status(400)
        .json({
          message: "Envie somente uma imagem de até 2 MB.",
          fields: { image: "Arquivo inválido ou muito grande." },
        });
    if (
      error.type === "entity.parse.failed" ||
      error.type === "entity.too.large"
    )
      return res
        .status(400)
        .json({ message: "Corpo da requisição inválido ou muito grande." });
    if (!(error instanceof HttpError)) console.error(error);
    res
      .status(error.status || 500)
      .json({
        message:
          error instanceof HttpError
            ? error.message
            : "Erro interno. Tente novamente.",
        ...(error.fields ? { fields: error.fields } : {}),
      });
  });
  return { app, db };
}
