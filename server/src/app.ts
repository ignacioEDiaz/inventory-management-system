import express, { Request, Response } from "express";
import { cargarDominio, Dominio, Registro, validar } from "./dominio";

/** Arma la API REST del recurso definido en dominio.json (datos en memoria). */
export function crearApp(dominio: Dominio = cargarDominio()) {
  const app = express();
  app.use(express.json());

  const registros = new Map<number, Registro>();
  let siguienteId = 1;
  for (const fila of dominio.datos_ejemplo) {
    const { valor } = validar(dominio.campos, fila, dominio.idioma);
    const id = siguienteId++;
    registros.set(id, { id, ...valor });
  }

  const base = `/api/${dominio.recurso.plural}`;
  const noExiste = dominio.idioma === "en" ? "Not found" : "No existe";
  const buscarId = (req: Request) => Number.parseInt(String(req.params.id), 10);

  app.get("/api/salud", (_req, res) => res.json({ ok: true }));

  // la interfaz arma la tabla y el formulario a partir de esto
  app.get("/api/dominio", (_req, res) => {
    const { datos_ejemplo: _ejemplos, ...publico } = dominio;
    res.json(publico);
  });

  app.get(base, (req: Request, res: Response) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    let lista = [...registros.values()];
    if (q) {
      lista = lista.filter((r) =>
        dominio.campos.some((c) => String(r[c.nombre] ?? "").toLowerCase().includes(q)),
      );
    }
    res.json(lista);
  });

  app.get(`${base}/:id`, (req, res) => {
    const r = registros.get(buscarId(req));
    if (!r) return res.status(404).json({ error: noExiste });
    res.json(r);
  });

  app.post(base, (req, res) => {
    const v = validar(dominio.campos, req.body, dominio.idioma);
    if (!v.ok) return res.status(400).json({ errores: v.errores });
    const id = siguienteId++;
    const nuevo: Registro = { id, ...v.valor };
    registros.set(id, nuevo);
    res.status(201).json(nuevo);
  });

  app.put(`${base}/:id`, (req, res) => {
    const id = buscarId(req);
    if (!registros.has(id)) return res.status(404).json({ error: noExiste });
    const v = validar(dominio.campos, req.body, dominio.idioma);
    if (!v.ok) return res.status(400).json({ errores: v.errores });
    const actualizado: Registro = { id, ...v.valor };
    registros.set(id, actualizado);
    res.json(actualizado);
  });

  app.delete(`${base}/:id`, (req, res) => {
    if (!registros.delete(buscarId(req))) return res.status(404).json({ error: noExiste });
    res.status(204).end();
  });

  return app;
}
