import { createApp } from "./src/app.js";
const { app, db } = createApp({
  dbPath: process.env.DB_PATH,
  uploadDir: process.env.UPLOAD_DIR,
});
const port = Number(process.env.PORT || 4316);
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(`Estoque disponível em http://${host}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
