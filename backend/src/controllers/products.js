import { recordsController } from "./records.js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { join, basename } from "node:path";
import { unlinkSync } from "node:fs";
import { HttpError } from "../validation.js";
export function productsController(db, uploadDir) {
  const cleanup = (image) => {
    try {
      unlinkSync(join(uploadDir, basename(image)));
    } catch (error) {
      if (error.code !== "ENOENT")
        console.error("Não foi possível remover imagem:", error.code);
    }
  };
  return recordsController(db, "products", {
    cleanup,
    beforeSave: async (file) => {
      if (!file) return null;
      let buffer;
      try {
        const image = sharp(file.buffer, {
          limitInputPixels: 20000000,
          failOn: "error",
        });
        const metadata = await image.metadata();
        if (!["png", "jpeg", "webp"].includes(metadata.format))
          throw new Error("Formato não permitido");
        buffer = await image
          .rotate()
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();
      } catch {
        throw new HttpError(400, "Envie uma imagem PNG, JPEG ou WebP válida.", {
          image: "Imagem inválida.",
        });
      }
      const name = `${randomUUID()}.webp`;
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(uploadDir, name), buffer);
      return `/uploads/${name}`;
    },
  });
}
