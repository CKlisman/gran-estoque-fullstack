import { useEffect, useRef, useState } from "react";
export function Icon({ name = "box", ...props }) {
  const paths = {
    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4Z" />
        <path d="m3 7 9 4 9-4M12 11v10M7 5l10 4" />
      </>
    ),
    truck: (
      <>
        <path d="M2 5h12v12H2zM14 9h4l4 4v4h-8" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    link: (
      <>
        <path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5-11 11H4v-5Z M13 6l5 5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
export function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current,
      opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, name, error, children, ...props }) {
  const id = `field-${name}`;
  return (
    <div
      className={`field ${name === "description" || name === "address" ? "wide" : ""}`}
    >
      <label htmlFor={id}>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children ? (
        children(id, error ? `${id}-error` : undefined)
      ) : (
        <input
          id={id}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
      )}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
const categories = [
  "Eletrônicos",
  "Alimentos",
  "Vestuário",
  "Escritório",
  "Outro",
];
export function RecordForm({ kind, record, onClose, onSave }) {
  const product = kind === "products";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const initialCategory = record?.category || "";
  const [category, setCategory] = useState(
    categories.includes(initialCategory)
      ? initialCategory
      : initialCategory
        ? "Outro"
        : "",
  );
  const fields = error?.fields || {};
  const defaults = {
    ...record,
    price: record ? (record.price_cents / 100).toFixed(2) : "0.00",
    quantity: record?.quantity ?? 0,
  };
  const input = (name, label, props = {}) => (
    <Field
      key={name}
      name={name}
      label={label}
      defaultValue={defaults[name] ?? ""}
      error={fields[name]}
      {...props}
    />
  );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget),
      body = Object.fromEntries(form);
    if (product) {
      body.category = category === "Outro" ? body.other_category : category;
      body.remove_image = form.get("remove_image") === "on";
    }
    try {
      await onSave(body, form.get("image"));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${record ? "Editar" : "Cadastrar"} ${product ? "produto" : "fornecedor"}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <p className="muted">Os campos com * são obrigatórios.</p>
        {error && (
          <div className="notice error" role="alert">
            {error.message}
          </div>
        )}
        <fieldset disabled={busy} className="form-grid">
          {input("name", product ? "Nome do produto" : "Nome da empresa", {
            required: true,
            maxLength: 150,
          })}
          {product ? (
            <>
              {input("barcode", "Código de barras", {
                inputMode: "numeric",
                pattern: "[0-9]*",
                maxLength: 60,
              })}
              <Field
                name="description"
                label="Descrição"
                required
                error={fields.description}
              >
                {(id, described) => (
                  <textarea
                    id={id}
                    name="description"
                    required
                    maxLength={2000}
                    defaultValue={record?.description || ""}
                    aria-invalid={!!fields.description}
                    aria-describedby={described}
                  />
                )}
              </Field>
              <Field
                name="category"
                label="Categoria"
                required
                error={fields.category}
              >
                {(id, described) => (
                  <select
                    id={id}
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    aria-invalid={!!fields.category}
                    aria-describedby={described}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </Field>
              {category === "Outro" &&
                input("other_category", "Outra categoria", {
                  required: true,
                  maxLength: 100,
                  defaultValue:
                    initialCategory === "Outro" ? "" : initialCategory,
                })}
              {input("quantity", "Quantidade", {
                type: "number",
                min: 0,
                max: 1e9,
                step: 1,
                required: true,
              })}
              {input("price", "Preço (R$)", {
                type: "number",
                min: 0,
                max: 1e9,
                step: "0.01",
                required: true,
              })}
              {input("expiry_date", "Data de validade", { type: "date" })}
              <Field
                name="image"
                label="Imagem do produto"
                error={fields.image}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                defaultValue={undefined}
              />
              <p className="muted small">PNG, JPEG ou WebP. Máximo de 2 MB.</p>
              {record?.image && (
                <label className="checkbox wide">
                  <input type="checkbox" name="remove_image" /> Remover imagem
                  atual
                </label>
              )}
            </>
          ) : (
            <>
              {input("cnpj", "CNPJ", {
                required: true,
                maxLength: 18,
                placeholder: "00.000.000/0000-00",
              })}
              {input("address", "Endereço", { required: true, maxLength: 500 })}
              {input("phone", "Telefone", {
                required: true,
                type: "tel",
                maxLength: 25,
              })}
              {input("email", "E-mail", {
                required: true,
                type: "email",
                maxLength: 250,
              })}
              {input("contact", "Contato principal", {
                required: true,
                maxLength: 150,
              })}
            </>
          )}
        </fieldset>
        <footer className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button type="submit" disabled={busy}>
            {busy ? "Salvando…" : record ? "Salvar alterações" : "Cadastrar"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
