import request from "supertest";
import { describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { cargarDominio, validar } from "../src/dominio";

const dominio = cargarDominio();
const base = `/api/${dominio.recurso.plural}`;
const ejemplo = dominio.datos_ejemplo[0];

describe(`API de ${dominio.recurso.etiqueta_plural}`, () => {
  it("expone la definición del dominio sin los datos de ejemplo", async () => {
    const res = await request(crearApp()).get("/api/dominio");
    expect(res.status).toBe(200);
    expect(res.body.recurso.plural).toBe(dominio.recurso.plural);
    expect(res.body.datos_ejemplo).toBeUndefined();
  });

  it("lista los registros de ejemplo", async () => {
    const res = await request(crearApp()).get(base);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(dominio.datos_ejemplo.length);
  });

  it("crea un registro válido", async () => {
    const app = crearApp();
    const res = await request(app).post(base).send(ejemplo);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf("number");
    const lista = await request(app).get(base);
    expect(lista.body).toHaveLength(dominio.datos_ejemplo.length + 1);
  });

  it("rechaza un registro sin los campos obligatorios", async () => {
    const obligatorios = dominio.campos.filter((c) => c.requerido);
    const res = await request(crearApp()).post(base).send({});
    if (obligatorios.length === 0) {
      expect(res.status).toBe(201);
      return;
    }
    expect(res.status).toBe(400);
    for (const c of obligatorios) expect(res.body.errores[c.nombre]).toBeDefined();
  });

  it("actualiza y borra un registro", async () => {
    const app = crearApp();
    const put = await request(app).put(`${base}/1`).send(ejemplo);
    expect(put.status).toBe(200);
    expect(put.body.id).toBe(1);
    expect((await request(app).delete(`${base}/1`)).status).toBe(204);
    expect((await request(app).get(`${base}/1`)).status).toBe(404);
  });

  it("busca por texto", async () => {
    const campoTexto = dominio.campos.find((c) => c.tipo === "texto" && ejemplo[c.nombre]);
    if (!campoTexto) return;
    const termino = String(ejemplo[campoTexto.nombre]).slice(0, 4);
    const res = await request(crearApp()).get(base).query({ q: termino });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("validación", () => {
  it("todos los datos de ejemplo son válidos", () => {
    for (const fila of dominio.datos_ejemplo) {
      expect(validar(dominio.campos, fila, dominio.idioma).errores).toEqual({});
    }
  });

  it("detecta tipos incorrectos", () => {
    const numero = dominio.campos.find((c) => c.tipo === "numero");
    if (!numero) return;
    const r = validar(dominio.campos, { ...ejemplo, [numero.nombre]: "no es un número" }, dominio.idioma);
    expect(r.ok).toBe(false);
    expect(r.errores[numero.nombre]).toBeDefined();
  });
});
