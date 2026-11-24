import { FormEvent, useEffect, useMemo, useState } from "react";

type TipoCampo = "texto" | "numero" | "fecha" | "booleano" | "opcion";
interface Campo { nombre: string; etiqueta: string; tipo: TipoCampo; requerido: boolean; opciones?: string[] }
interface Dominio {
  idioma: "es" | "en";
  titulo: string;
  descripcion: string;
  recurso: { nombre: string; plural: string; etiqueta: string; etiqueta_plural: string };
  campos: Campo[];
}
type Registro = Record<string, unknown> & { id: number };

const TEXTOS = {
  es: { nuevo: "Nuevo", editar: "Editar", guardar: "Guardar", cancelar: "Cancelar", borrar: "Borrar", buscar: "Buscar…",
        vacio: "No hay registros.", cargando: "Cargando…", error: "No se pudo conectar con la API.", si: "Sí", no: "No",
        confirmar: "¿Borrar este registro?" },
  en: { nuevo: "New", editar: "Edit", guardar: "Save", cancelar: "Cancel", borrar: "Delete", buscar: "Search…",
        vacio: "No records yet.", cargando: "Loading…", error: "Could not reach the API.", si: "Yes", no: "No",
        confirmar: "Delete this record?" },
};

function valorInicial(campos: Campo[]) {
  return Object.fromEntries(campos.map((c) => [c.nombre, c.tipo === "booleano" ? false : ""]));
}

export default function App() {
  const [dominio, setDominio] = useState<Dominio | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [falla, setFalla] = useState(false);

  const t = TEXTOS[dominio?.idioma ?? "es"];
  const base = dominio ? `/api/${dominio.recurso.plural}` : "";

  useEffect(() => {
    fetch("/api/dominio")
      .then((r) => r.json())
      .then((d: Dominio) => { setDominio(d); document.title = d.titulo; })
      .catch(() => setFalla(true));
  }, []);

  useEffect(() => {
    if (!base) return;
    const control = new AbortController();
    fetch(`${base}?q=${encodeURIComponent(busqueda)}`, { signal: control.signal })
      .then((r) => r.json())
      .then(setRegistros)
      .catch((e) => { if (e.name !== "AbortError") setFalla(true); });
    return () => control.abort();
  }, [base, busqueda]);

  const columnas = useMemo(() => dominio?.campos ?? [], [dominio]);

  async function recargar() {
    const r = await fetch(`${base}?q=${encodeURIComponent(busqueda)}`);
    setRegistros(await r.json());
  }

  function abrir(registro?: Registro) {
    if (!dominio) return;
    setErrores({});
    setEditando(registro?.id ?? null);
    setForm(registro ? { ...valorInicial(dominio.campos), ...registro } : valorInicial(dominio.campos));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form || !dominio) return;
    const cuerpo = Object.fromEntries(dominio.campos.map((c) => [c.nombre, form[c.nombre]]));
    const r = await fetch(editando ? `${base}/${editando}` : base, {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (r.status === 400) { setErrores((await r.json()).errores ?? {}); return; }
    setForm(null);
    await recargar();
  }

  async function borrar(id: number) {
    if (!confirm(t.confirmar)) return;
    await fetch(`${base}/${id}`, { method: "DELETE" });
    await recargar();
  }

  function mostrar(c: Campo, v: unknown) {
    if (v === undefined || v === null || v === "") return "–";
    if (c.tipo === "booleano") return v ? t.si : t.no;
    return String(v);
  }

  if (falla) return <main className="contenedor"><p className="aviso">{t.error}</p></main>;
  if (!dominio) return <main className="contenedor"><p>{t.cargando}</p></main>;

  return (
    <main className="contenedor">
      <header className="cabecera">
        <div>
          <h1>{dominio.titulo}</h1>
          <p>{dominio.descripcion}</p>
        </div>
        <button className="boton primario" onClick={() => abrir()}>+ {t.nuevo}</button>
      </header>

      <input className="buscador" type="search" placeholder={t.buscar} value={busqueda}
             onChange={(e) => setBusqueda(e.target.value)} aria-label={t.buscar} />

      <div className="tabla-envoltorio">
        <table>
          <thead>
            <tr>{columnas.map((c) => <th key={c.nombre}>{c.etiqueta}</th>)}<th /></tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr><td colSpan={columnas.length + 1} className="vacio">{t.vacio}</td></tr>
            )}
            {registros.map((r) => (
              <tr key={r.id}>
                {columnas.map((c) => <td key={c.nombre}>{mostrar(c, r[c.nombre])}</td>)}
                <td className="acciones">
                  <button className="boton" onClick={() => abrir(r)}>{t.editar}</button>
                  <button className="boton peligro" onClick={() => borrar(r.id)}>{t.borrar}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fondo" role="dialog" aria-modal="true">
          <form className="modal" onSubmit={guardar}>
            <h2>{editando ? t.editar : t.nuevo}: {dominio.recurso.etiqueta}</h2>
            {dominio.campos.map((c) => (
              <label key={c.nombre} className="campo">
                <span>{c.etiqueta}{c.requerido && " *"}</span>
                {c.tipo === "opcion" ? (
                  <select value={String(form[c.nombre] ?? "")}
                          onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })}>
                    <option value="">–</option>
                    {(c.opciones ?? []).map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : c.tipo === "booleano" ? (
                  <input type="checkbox" checked={Boolean(form[c.nombre])}
                         onChange={(e) => setForm({ ...form, [c.nombre]: e.target.checked })} />
                ) : (
                  <input type={c.tipo === "numero" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                         value={String(form[c.nombre] ?? "")}
                         onChange={(e) => setForm({
                           ...form,
                           [c.nombre]: c.tipo === "numero" && e.target.value !== "" ? Number(e.target.value) : e.target.value,
                         })} />
                )}
                {errores[c.nombre] && <small className="error">{errores[c.nombre]}</small>}
              </label>
            ))}
            <div className="pie">
              <button type="button" className="boton" onClick={() => setForm(null)}>{t.cancelar}</button>
              <button type="submit" className="boton primario">{t.guardar}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
