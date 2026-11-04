import { recordsController } from "./records.js";
export const suppliersController = (db) => recordsController(db, "suppliers");
