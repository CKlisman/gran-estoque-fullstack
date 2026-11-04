export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers:
        options.body instanceof FormData
          ? options.headers
          : { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Confira a conexão e tente novamente.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Resposta inesperada do servidor. Tente novamente.");
  }
  if (!response.ok) {
    const error = new Error(
      data.message || "Não foi possível concluir a operação.",
    );
    error.fields = data.fields;
    throw error;
  }
  return data;
}
export const money = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents || 0) / 100,
  );
export const cnpjFormat = (value) =>
  String(value).replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
