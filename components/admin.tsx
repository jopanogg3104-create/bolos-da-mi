"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase";
import { defaultSettings } from "@/lib/types";
import {
  AgendaAdmin,
  FinanceSettings,
  Dashboard,
  OrdersAdmin,
} from "./admin-commerce";
type Row = Record<string, unknown>;
const tables = [
  "dashboard",
  "agenda",
  "finance",
  "products",
  "options",
  "creations",
  "settings",
  "orders",
] as const;
type Table = (typeof tables)[number];
const labels: Record<Table, string> = {
  dashboard: "Visão geral",
  agenda: "Agenda",
  finance: "Orçamento e Pix",
  products: "Produtos",
  options: "Personalização",
  creations: "Portfólio",
  settings: "Conteúdo",
  orders: "Solicitações",
};
const schemas: Record<string, [string, string, string][]> = {
  products: [
    ["name", "Nome", "text"],
    ["description", "Descrição", "textarea"],
    ["category", "Categoria", "text"],
    ["price", "Preço em reais (opcional)", "number"],
    ["image_url", "Fotografia (URL)", "url"],
    ["sizes", "Tamanhos (separados por vírgula)", "array"],
    ["flavors", "Sabores (separados por vírgula)", "array"],
    ["complexity_units", "Unidades de complexidade", "number"],
  ],
  options: [
    ["kind", "Tipo", "kind"],
    ["label", "Nome da opção", "text"],
    ["price", "Valor em reais (opcional)", "number"],
    ["portions", "Porções estimadas (opcional)", "number"],
    ["complexity_units", "Unidades de complexidade", "number"],
  ],
  creations: [
    ["title", "Título", "text"],
    ["description", "Descrição", "textarea"],
    ["video_url", "Vídeo original (URL)", "url"],
    ["image_url", "Capa / fotografia (URL)", "url"],
    ["sort_order", "Ordem de exibição", "number"],
  ],
  settings: [
    ["intro", "Apresentação da marca", "textarea"],
    ["about", "Sobre a confeitaria", "textarea"],
    ["max_fillings", "Máximo de recheios", "number"],
  ],
};
export function Admin() {
  const [db] = useState(browserDb),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authorized, setAuthorized] = useState(false),
    [checking, setChecking] = useState(true),
    [table, setTable] = useState<Table>("dashboard"),
    [rows, setRows] = useState<Row[]>([]),
    [editing, setEditing] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function verify() {
    if (!db) {
      setChecking(false);
      return;
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) {
      const { data, error } = await db
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setAuthorized(!error && !!data);
    } else setAuthorized(false);
    setChecking(false);
  }
  useEffect(() => {
    void verify();
    const subscription = db?.auth.onAuthStateChange(() => {
      setTimeout(() => void verify(), 0);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [db]);
  async function load() {
    if (!db || !authorized) return;
    if (["dashboard", "agenda", "finance", "orders"].includes(table)) {
      setRows([]);
      return;
    }
    setBusy(true);
    const { data, error } = await db
      .from(table)
      .select("*")
      .order(
        table === "settings"
          ? "id"
          : table === "orders"
            ? "created_at"
            : table === "creations"
              ? "sort_order"
              : table === "options"
                ? "label"
                : "name",
      );
    if (error) {
      setMessage(
        "Não foi possível carregar os dados. Confira a configuração Supabase.",
      );
      setRows([]);
    } else {
      setRows(data ?? []);
      setMessage("");
    }
    setBusy(false);
  }
  useEffect(() => {
    setEditing(null);
    void load();
  }, [table, authorized]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    const { error } = await db.auth.signInWithPassword({ email, password });
    setPassword("");
    setMessage(
      error ? "Não foi possível entrar. Verifique seu e-mail e senha." : "",
    );
    await verify();
    setBusy(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !editing) return;
    setBusy(true);
    const record = { ...editing };
    for (const [key, , kind] of schemas[table] ?? []) {
      if (kind === "number")
        record[key] =
          record[key] === "" || record[key] === undefined
            ? null
            : Number(record[key]);
      if (kind === "array" && typeof record[key] === "string")
        record[key] = String(record[key])
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      if (kind === "url" && !record[key]) record[key] = null;
    }
    if (!record.id) delete record.id;
    const { error } = await db.from(table).upsert(record);
    if (error)
      setMessage(
        "Não foi possível salvar. Confira os campos e as permissões do banco.",
      );
    else {
      setEditing(null);
      await load();
      setMessage("Alterações salvas.");
    }
    setBusy(false);
  }
  async function upload(file: File) {
    if (!db || !editing) return;
    const video = file.type === "video/mp4";
    if (
      !video &&
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setMessage("Use JPG, PNG, WebP ou vídeo MP4 original.");
      return;
    }
    if (file.size > (video ? 100 : 5) * 1024 * 1024) {
      setMessage("O arquivo excede o limite: fotos 5 MB, vídeos 100 MB.");
      return;
    }
    setBusy(true);
    const ext = video ? "mp4" : file.type.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from("media")
      .upload(path, file, { contentType: file.type });
    if (error)
      setMessage(
        "Não foi possível enviar o arquivo. Confira o bucket media e suas permissões.",
      );
    else {
      const { data } = db.storage.from("media").getPublicUrl(path);
      setEditing((r) => ({
        ...r,
        [video ? "video_url" : "image_url"]: data.publicUrl,
      }));
      setMessage(
        "Arquivo enviado sem alterações. Salve o cadastro para vinculá-lo.",
      );
    }
    setBusy(false);
  }
  if (checking)
    return (
      <main className="loading">
        <p>Verificando acesso…</p>
      </main>
    );
  if (!db)
    return (
      <main className="admin">
        <Link className="text-link" href="/">
          ← Voltar ao site
        </Link>
        <h1>Área da confeiteira</h1>
        <p>
          A administração precisa de uma conexão segura com o Supabase. Consulte
          o README para configurar o banco, a autenticação e as permissões.
          Nenhuma senha padrão foi criada.
        </p>
      </main>
    );
  if (!authorized)
    return (
      <main className="admin" style={{ maxWidth: 520 }}>
        <Link className="text-link" href="/">
          ← Voltar ao site
        </Link>
        <h1>Área da confeiteira</h1>
        <p>Acesso exclusivo para administradores autorizados.</p>
        <form onSubmit={login}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            Entrar
          </button>
        </form>
        {message && <p role="alert">{message}</p>}
      </main>
    );
  return (
    <main className="admin">
      <div className="admin-title">
        <div>
          <Link className="text-link" href="/">
            ← Ver site
          </Link>
          <h1>Seu ateliê digital</h1>
        </div>
        <button
          className="button secondary"
          onClick={() => void db.auth.signOut()}
        >
          Sair
        </button>
      </div>
      <div
        className="admin-tabs"
        role="group"
        aria-label="Áreas de administração"
      >
        {tables.map((t) => (
          <button
            aria-pressed={t === table}
            key={t}
            onClick={() => setTable(t)}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
      {table === "dashboard" && <Dashboard db={db} />}
      {table === "agenda" && <AgendaAdmin db={db} />}
      {table === "finance" && <FinanceSettings db={db} />}
      {table === "orders" && <OrdersAdmin db={db} />}
      {!editing &&
        !["dashboard", "agenda", "finance", "orders"].includes(table) && (
          <>
            {table !== "orders" && (
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  setEditing(
                    table === "settings"
                      ? (rows[0] ?? { ...defaultSettings })
                      : {
                          active: true,
                          ...(["products", "options"].includes(table)
                            ? { complexity_units: 1 }
                            : {}),
                          ...(table === "options" ? { kind: "batter" } : {}),
                          ...(table === "creations" ? { sort_order: 0 } : {}),
                        },
                  )
                }
              >
                {table === "settings" ? "Editar conteúdo" : "Novo cadastro +"}
              </button>
            )}
            <div className="admin-list">
              {rows.map((r) => (
                <article className="admin-row" key={String(r.id)}>
                  <strong>
                    {String(
                      r.name ??
                        r.title ??
                        r.label ??
                        r.customer_name ??
                        "Conteúdo do site",
                    )}
                  </strong>

                  <>
                    <span>{r.active === false ? "Inativo" : ""}</span>
                    <button
                      className="text-link"
                      onClick={() => setEditing({ ...r })}
                    >
                      Editar
                    </button>
                  </>
                </article>
              ))}
            </div>
            {!rows.length && !busy && <p>Nenhum cadastro nesta seção.</p>}
          </>
        )}
      {editing && (
        <form onSubmit={save}>
          <h2>{editing.id ? "Editar cadastro" : "Novo cadastro"}</h2>
          <div className="admin-grid">
            {(schemas[table] ?? []).map(([key, label, kind]) => (
              <label className={kind === "textarea" ? "wide" : ""} key={key}>
                {label}
                {kind === "textarea" ? (
                  <textarea
                    value={String(editing[key] ?? "")}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                ) : kind === "kind" ? (
                  <select
                    value={String(editing[key] ?? "batter")}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  >
                    {[
                      ["batter", "Massa"],
                      ["filling", "Recheio"],
                      ["size", "Tamanho"],
                      ["decoration", "Decoração"],
                      ["extra", "Adicional"],
                    ].map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={kind === "array" ? "text" : kind}
                    required={[
                      "name",
                      "category",
                      "label",
                      "title",
                      "max_fillings",
                    ].includes(key)}
                    min={
                      ["max_fillings", "complexity_units", "portions"].includes(
                        key,
                      )
                        ? 1
                        : 0
                    }
                    step={key === "price" ? "0.01" : "1"}
                    value={
                      Array.isArray(editing[key])
                        ? (editing[key] as string[]).join(", ")
                        : String(editing[key] ?? "")
                    }
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            {table !== "settings" && (
              <label>
                Disponibilidade
                <select
                  value={editing.active === false ? "false" : "true"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      active: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            )}
            {["products", "creations"].includes(table) && (
              <label>
                Enviar arquivo original
                <input
                  type="file"
                  accept={
                    table === "creations"
                      ? "image/jpeg,image/png,image/webp,video/mp4"
                      : "image/jpeg,image/png,image/webp"
                  }
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                />
              </label>
            )}
            {table === "settings" && (
              <>
                <label>
                  Oferece entrega?
                  <select
                    value={editing.delivery ? "true" : "false"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        delivery: e.target.value === "true",
                      })
                    }
                  >
                    <option value="false">Somente retirada</option>
                    <option value="true">Retirada e entrega</option>
                  </select>
                </label>
                {[
                  ["intro", "Apresentação"],
                  ["catalog", "Catálogo na home"],
                  ["builder", "Convite para personalizar"],
                  ["portfolio", "Portfólio na home"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <select
                      value={
                        (editing.sections as Record<string, boolean>)?.[key] ===
                        false
                          ? "false"
                          : "true"
                      }
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sections: {
                            ...(editing.sections as object),
                            [key]: e.target.value === "true",
                          },
                        })
                      }
                    >
                      <option value="true">Exibir</option>
                      <option value="false">Ocultar</option>
                    </select>
                  </label>
                ))}
              </>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
            <button className="button" disabled={busy}>
              Salvar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
