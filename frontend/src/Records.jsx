import { useState } from "react";
import { api, money, cnpjFormat } from "./api";
import { Dialog, Icon, RecordForm } from "./components";
export default function Records({ kind, items, onReload, notify }) {
  const product = kind === "products",
    noun = product ? "produto" : "fornecedor";
  const [query, setQuery] = useState(""),
    [form, setForm] = useState(undefined),
    [deleting, setDeleting] = useState(null),
    [details, setDetails] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const matches = items.filter((r) =>
    [r.name, r.barcode, r.cnpj].some((v) =>
      String(v || "")
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ),
  );
  async function save(body, file) {
    let payload = JSON.stringify(body);
    if (product && file?.size) {
      if (file.size > 2097152) {
        const e = new Error("A imagem deve ter até 2 MB.");
        e.fields = { image: "Arquivo muito grande." };
        throw e;
      }
      payload = new FormData();
      payload.append("data", JSON.stringify(body));
      payload.append("image", file);
    }
    const result = await api(`/${kind}${form?.id ? `/${form.id}` : ""}`, {
      method: form?.id ? "PUT" : "POST",
      body: payload,
    });
    setForm(undefined);
    notify(result.message);
    await onReload();
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/${kind}/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      notify(`${product ? "Produto" : "Fornecedor"} excluído com sucesso!`);
      await onReload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <h1>{product ? "Produtos" : "Fornecedores"}</h1>
          <p>
            {product
              ? "Seu catálogo, organizado e sempre à mão."
              : "Quem fornece o que sua operação precisa."}
          </p>
        </div>
        <button onClick={() => setForm(null)}>
          <Icon name="plus" /> Novo {noun}
        </button>
      </header>
      <div className="summary">
        <strong>{items.length}</strong>
        <span>
          {product ? "produtos cadastrados" : "fornecedores cadastrados"}
        </span>
        <span className="summary-divider" />
        {product ? (
          <>
            <strong>{items.reduce((n, r) => n + r.quantity, 0)}</strong>
            <span>unidades em estoque</span>
          </>
        ) : (
          <>
            <strong>{items.reduce((n, r) => n + r.link_count, 0)}</strong>
            <span>vínculos com produtos</span>
          </>
        )}
      </div>
      <section
        className="panel"
        aria-label={`Lista de ${product ? "produtos" : "fornecedores"}`}
      >
        <div className="list-toolbar">
          <h2>{product ? "Catálogo de produtos" : "Seus fornecedores"}</h2>
          <div className="search">
            <Icon name="search" />
            <input
              aria-label={`Pesquisar ${product ? "produtos" : "fornecedores"}`}
              placeholder={
                product ? "Nome ou código de barras" : "Nome ou CNPJ"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {matches.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{product ? "Produto" : "Empresa"}</th>
                  <th>{product ? "Categoria" : "Contato"}</th>
                  <th>{product ? "Estoque" : "Telefone"}</th>
                  <th>{product ? "Preço" : "Produtos"}</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="record-name"
                        onClick={() => setDetails(r)}
                      >
                        {product && (
                          <span className="thumb">
                            {r.image ? <img src={r.image} alt="" /> : <Icon />}
                          </span>
                        )}
                        <span>
                          <strong>{r.name}</strong>
                          <small>
                            {product
                              ? r.barcode || "Sem código de barras"
                              : cnpjFormat(r.cnpj)}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {product ? (
                        <span className="tag">{r.category}</span>
                      ) : (
                        <>
                          <span>{r.contact}</span>
                          <small>{r.email}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {product ? (
                        <span
                          className={
                            r.quantity === 0 ? "stock empty-stock" : "stock"
                          }
                        >
                          {r.quantity} un.
                        </span>
                      ) : (
                        r.phone
                      )}
                    </td>
                    <td>
                      {product
                        ? money(r.price_cents)
                        : `${r.link_count} produtos`}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Editar ${r.name}`}
                          onClick={() => setForm(r)}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="icon-button danger-text"
                          aria-label={`Excluir ${r.name}`}
                          onClick={() => {
                            setDeleting(r);
                            setError("");
                          }}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <Icon name={product ? "box" : "truck"} width="40" height="40" />
            <h3>
              {query
                ? "Nenhum resultado encontrado"
                : `Cadastre seu primeiro ${noun}`}
            </h3>
            <p>
              {query
                ? "Tente pesquisar por outro nome ou número."
                : `Use o botão Novo ${noun} para começar.`}
            </p>
          </div>
        )}
        <div className="list-footer">
          {matches.length} {matches.length === 1 ? "registro" : "registros"}
          {query ? " encontrados" : " no total"}
        </div>
      </section>
      {form !== undefined && (
        <RecordForm
          kind={kind}
          record={form}
          onClose={() => setForm(undefined)}
          onSave={save}
        />
      )}
      {deleting && (
        <Dialog
          title={`Excluir ${noun}?`}
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <p>
            <strong>{deleting.name}</strong> será excluído. Essa ação remove
            também {deleting.link_count} vínculo(s), preservando os outros
            cadastros.
          </p>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          <footer className="dialog-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button className="danger" disabled={busy} onClick={remove}>
              {busy ? "Excluindo…" : "Confirmar exclusão"}
            </button>
          </footer>
        </Dialog>
      )}
      {details && (
        <Dialog title={details.name} onClose={() => setDetails(null)}>
          {product && details.image && (
            <img
              className="detail-image"
              src={details.image}
              alt={details.name}
            />
          )}
          <dl className="detail-list">
            {(product
              ? [
                  ["Descrição", details.description],
                  ["Código", details.barcode || "Não informado"],
                  ["Categoria", details.category],
                  ["Quantidade", details.quantity],
                  ["Preço", money(details.price_cents)],
                  [
                    "Validade",
                    details.expiry_date
                      ? details.expiry_date.split("-").reverse().join("/")
                      : "Não informada",
                  ],
                ]
              : [
                  ["CNPJ", cnpjFormat(details.cnpj)],
                  ["Endereço", details.address],
                  ["Contato", details.contact],
                  ["Telefone", details.phone],
                  ["E-mail", details.email],
                ]
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <footer className="dialog-actions">
            <button onClick={() => setDetails(null)}>Fechar</button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
