import { useEffect, useState } from "react";
import { api, cnpjFormat } from "./api";
import { Icon } from "./components";
export default function Associations({
  products,
  suppliers,
  onReload,
  notify,
}) {
  const [mode, setMode] = useState("products"),
    [productId, setProductId] = useState(""),
    [supplierId, setSupplierId] = useState(""),
    [candidate, setCandidate] = useState(""),
    [links, setLinks] = useState([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const byProduct = mode === "products",
    selected = byProduct ? productId : supplierId;
  const items = byProduct ? products : suppliers,
    record = items.find((r) => String(r.id) === selected);
  useEffect(() => {
    let active = true;
    setLinks([]);
    setError("");
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/${mode}/${selected}/${byProduct ? "suppliers" : "products"}`)
      .then((data) => {
        if (active) setLinks(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, selected, version, byProduct]);
  async function change(supplier, remove = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/products/${productId}/suppliers/${supplier}`, {
        method: remove ? "DELETE" : "POST",
      });
      notify(
        remove
          ? "Fornecedor desassociado com sucesso!"
          : "Fornecedor associado com sucesso ao produto!",
      );
      setVersion((v) => v + 1);
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
          <h1>Associações</h1>
          <p>Conecte seus produtos a quem os fornece.</p>
        </div>
        <span className="relationship-mark">
          <Icon name="box" />
          <span />
          <Icon name="truck" />
        </span>
      </header>
      <div className="tabs" aria-label="Consultar associações">
        <button
          className={byProduct ? "selected" : ""}
          aria-pressed={byProduct}
          onClick={() => setMode("products")}
          disabled={busy}
        >
          Por produto
        </button>
        <button
          className={!byProduct ? "selected" : ""}
          aria-pressed={!byProduct}
          onClick={() => setMode("suppliers")}
          disabled={busy}
        >
          Por fornecedor
        </button>
      </div>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <div className="association-layout">
        <section className="panel selection-panel">
          <h2>
            {byProduct ? "Selecione um produto" : "Selecione um fornecedor"}
          </h2>
          <p className="muted">
            {byProduct
              ? "Veja os fornecedores vinculados e adicione novas conexões."
              : "Consulte todos os produtos fornecidos por uma empresa."}
          </p>
          <label htmlFor="record-select">
            {byProduct ? "Produto" : "Fornecedor"}
          </label>
          <select
            id="record-select"
            value={selected}
            disabled={busy}
            onChange={(e) =>
              byProduct
                ? setProductId(e.target.value)
                : setSupplierId(e.target.value)
            }
          >
            <option value="">
              Selecione {byProduct ? "um produto" : "um fornecedor"}
            </option>
            {items.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {record && (
            <div className="selected-record">
              {record.image && <img src={record.image} alt={record.name} />}
              <strong>{record.name}</strong>
              <p>{byProduct ? record.description : record.address}</p>
              <small>
                {byProduct
                  ? record.barcode || "Sem código de barras"
                  : cnpjFormat(record.cnpj)}
              </small>
            </div>
          )}
          {byProduct && selected && (
            <form
              className="link-form"
              onSubmit={(e) => {
                e.preventDefault();
                change(candidate);
              }}
            >
              <label htmlFor="candidate">Fornecedor para associar</label>
              <select
                id="candidate"
                value={candidate}
                required
                disabled={busy}
                onChange={(e) => setCandidate(e.target.value)}
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button disabled={busy || !candidate || loading}>
                <Icon name="link" />
                {busy ? "Salvando…" : "Associar Fornecedor"}
              </button>
              {!suppliers.length && (
                <p className="muted">
                  Cadastre um fornecedor para criar a primeira associação.
                </p>
              )}
            </form>
          )}
        </section>
        <section className="panel">
          <div className="list-toolbar">
            <h2>
              {byProduct ? "Fornecedores associados" : "Produtos fornecidos"}
            </h2>
            <span className="count">{links.length}</span>
          </div>
          {loading ? (
            <p className="loading" role="status">
              Carregando associações…
            </p>
          ) : links.length ? (
            <ul className="links-list">
              {links.map((r) => (
                <li key={r.id}>
                  <span className="link-avatar">
                    <Icon name={byProduct ? "truck" : "box"} />
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{byProduct ? cnpjFormat(r.cnpj) : r.category}</small>
                    {byProduct && (
                      <small>
                        {r.contact} • {r.email}
                      </small>
                    )}
                  </div>
                  {byProduct && (
                    <button
                      className="secondary small-button"
                      disabled={busy}
                      onClick={() => change(r.id, true)}
                    >
                      Desassociar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <Icon name="link" width="36" height="36" />
              <h3>
                {selected
                  ? "Nenhuma associação ainda"
                  : "Sua rede de fornecimento"}
              </h3>
              <p>
                {selected
                  ? byProduct
                    ? "Selecione um fornecedor ao lado para criar um vínculo."
                    : "Este fornecedor ainda não está associado a produtos."
                  : `Selecione ${byProduct ? "um produto" : "um fornecedor"} para consultar suas conexões.`}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
