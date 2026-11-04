import { test, expect } from "@playwright/test";
import { demoProducts, demoSuppliers } from "../backend/demo-data.js";
test("fluxo completo de cadastros, edição, vínculos, exclusão e celular", async ({
  page,
  request,
}) => {
  // O servidor desta suíte usa um banco exclusivo. Limpa somente dados desse servidor.
  for (const entity of ["products", "suppliers"])
    for (const item of await (await request.get(`/api/${entity}`)).json())
      await request.delete(`/api/${entity}/${item.id}`);
  await page.goto("/");
  await page.getByRole("button", { name: "Novo produto", exact: true }).click();
  await page.getByLabel("Nome do produto").fill("Teclado de teste");
  await page.getByLabel("Descrição").fill("Produto fictício para verificação");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("Eletrônicos");
  await page.getByLabel("Código de barras").fill("7891234");
  await page.getByLabel("Quantidade").fill("7");
  await page.getByLabel("Preço (R$)").fill("80.50");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Produto cadastrado com sucesso!",
  );
  await page.getByRole("button", { name: "Editar Teclado de teste" }).click();
  await page.getByLabel("Quantidade").fill("9");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("table")).toContainText("9 un.");
  await page.getByRole("button", { name: "Fornecedores", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo fornecedor", exact: true })
    .click();
  for (const [label, value] of Object.entries({
    "Nome da empresa": "Fornecedor de teste",
    CNPJ: "11222333000181",
    Endereço: "Rua Fictícia, 10",
    Telefone: "85999990000",
    "E-mail": "teste@example.com",
    "Contato principal": "Pessoa fictícia",
  }))
    await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Fornecedor cadastrado com sucesso!",
  );
  await page.getByRole("button", { name: "Associações", exact: true }).click();
  await page
    .getByLabel("Produto", { exact: true })
    .selectOption({ label: "Teclado de teste" });
  await page
    .getByLabel("Fornecedor para associar")
    .selectOption({ label: "Fornecedor de teste" });
  await page
    .getByRole("button", { name: "Associar Fornecedor", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Fornecedor associado com sucesso ao produto!",
  );
  await page
    .getByRole("button", { name: "Associar Fornecedor", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Fornecedor já está associado",
  );
  await page.getByRole("button", { name: "Por fornecedor" }).click();
  await page
    .getByLabel("Fornecedor", { exact: true })
    .selectOption({ label: "Fornecedor de teste" });
  await expect(page.locator("main")).toContainText("Teclado de teste");
  await page.getByRole("button", { name: "Por produto" }).click();
  await page.getByRole("button", { name: "Desassociar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Fornecedor desassociado com sucesso!",
  );
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Excluir Teclado de teste" }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByRole("status")).toContainText("Produto excluído");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Novo produto", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("falha de rede preserva formulário; teclado fecha diálogo e devolve foco", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", {
    name: "Novo produto",
    exact: true,
  });
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByLabel("Nome do produto").fill("Produto com falha de rede");
  await page.getByLabel("Descrição").fill("Teste de preservação");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("Escritório");
  await page.route("**/api/products", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível conectar",
  );
  await expect(page.getByLabel("Nome do produto")).toHaveValue(
    "Produto com falha de rede",
  );
  await page.unroute("**/api/products");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Produto cadastrado com sucesso!",
  );
});
test("capturas reais das três telas com dados fictícios", async ({
  page,
  request,
}) => {
  for (const entity of ["products", "suppliers"])
    for (const item of await (await request.get(`/api/${entity}`)).json())
      await request.delete(`/api/${entity}/${item.id}`);
  const products = [];
  for (const p of demoProducts)
    products.push(
      await (await request.post("/api/products", { data: p })).json(),
    );
  const supplier = await (
    await request.post("/api/suppliers", { data: demoSuppliers[0] })
  ).json();
  for (const p of products.slice(0, 3))
    await request.post(`/api/products/${p.id}/suppliers/${supplier.id}`);
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({ path: "docs/images/produtos.png", fullPage: true });
  await page.getByRole("button", { name: "Fornecedores", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({
    path: "docs/images/fornecedores.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Associações", exact: true }).click();
  await page
    .getByLabel("Produto", { exact: true })
    .selectOption(String(products[0].id));
  await expect(
    page.getByText(supplier.name, { exact: true }).last(),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/images/associacoes.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/images/celular.png", fullPage: true });
});
