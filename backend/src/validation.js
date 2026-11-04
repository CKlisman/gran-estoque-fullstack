export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export function idOf(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw new HttpError(400, "Identificador inválido.");
  return Number(value);
}
function validCnpj(value) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (base) => {
    let weight = base.length - 7,
      sum = 0;
    for (const c of base) {
      sum += Number(c) * weight--;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    digit(value.slice(0, 12)) === Number(value[12]) &&
    digit(value.slice(0, 13)) === Number(value[13])
  );
}
export function validate(kind, input) {
  const body =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const fields = {},
    out = {};
  const text = (key, required = true, max = 250) => {
    const v = typeof body[key] === "string" ? body[key].trim() : "";
    if ((required && !v) || v.length > max)
      fields[key] =
        required && !v ? "Preencha este campo." : `Use até ${max} caracteres.`;
    out[key] = v;
    return v;
  };
  text("name", true, 150);
  if (kind === "products") {
    text("description", true, 2000);
    text("category", true, 100);
    const barcode = text("barcode", false, 60);
    if (barcode && !/^\d+$/.test(barcode))
      fields.barcode = "Use apenas números.";
    out.barcode = barcode || null;
    const quantity = body.quantity === undefined ? 0 : body.quantity;
    if (
      !/^\d+$/.test(String(quantity)) ||
      !Number.isSafeInteger(Number(quantity)) ||
      Number(quantity) > 1e9
    )
      fields.quantity = "Informe um inteiro de 0 a 1 bilhão.";
    out.quantity = Number(quantity);
    const price = body.price === undefined ? "0" : String(body.price);
    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) > 1e9)
      fields.price =
        "Informe um preço de 0 a 1 bilhão, com até duas casas decimais.";
    out.price_cents = Math.round(Number(price) * 100);
    const date = text("expiry_date", false, 10);
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      fields.expiry_date = "Informe uma data válida.";
    out.expiry_date = date || null;
  } else {
    const rawCnpj = text("cnpj");
    out.cnpj = rawCnpj.replace(/[.\/-]/g, "");
    if (!validCnpj(out.cnpj))
      fields.cnpj = "Informe um CNPJ numérico válido, com 14 dígitos.";
    text("address", true, 500);
    const phone = text("phone");
    out.phone = phone.replace(/[()\s+-]/g, "");
    if (!/^\d{10,11}$/.test(out.phone))
      fields.phone = "Informe telefone com DDD (10 ou 11 dígitos).";
    const email = text("email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fields.email = "Informe um e-mail válido.";
    text("contact", true, 150);
  }
  if (Object.keys(fields).length)
    throw new HttpError(400, "Revise os campos destacados.", fields);
  return out;
}
