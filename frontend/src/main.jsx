import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import { Icon } from "./components";
import Records from "./Records";
import Associations from "./Associations";
import "./style.css";
function App() {
  const [page, setPage] = useState("products"),
    [products, setProducts] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  async function reload() {
    try {
      const [p, s] = await Promise.all([api("/products"), api("/suppliers")]);
      setProducts(p);
      setSuppliers(s);
      setReady(true);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  function navigate(value) {
    setPage(value);
    setNotice("");
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Ir para conteúdo
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span>
            <Icon width="30" height="30" />
          </span>
          <div>
            Estoque<small>Gestão de produtos</small>
          </div>
        </div>
        <nav aria-label="Principal">
          {[
            ["products", "Produtos", "box"],
            ["suppliers", "Fornecedores", "truck"],
            ["links", "Associações", "link"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="academic-dot" />
          Projeto Integrador<small>Faculdade Gran</small>
          <small>Caio Klisman</small>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>Gestão de estoque</span>
          <span className="local-label">Ambiente local</span>
        </div>
        <main id="main" tabIndex="-1">
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}{" "}
              <button className="secondary small-button" onClick={reload}>
                Tentar novamente
              </button>
            </div>
          )}
          {!ready ? (
            <p className="loading">Carregando cadastros…</p>
          ) : page === "links" ? (
            <Associations
              products={products}
              suppliers={suppliers}
              onReload={reload}
              notify={setNotice}
            />
          ) : (
            <Records
              key={page}
              kind={page}
              items={page === "products" ? products : suppliers}
              onReload={reload}
              notify={setNotice}
            />
          )}
        </main>
        <footer className="workspace-footer">
          Projeto acadêmico de controle de estoque{" "}
          <span>Node.js + React + SQLite</span>
        </footer>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
