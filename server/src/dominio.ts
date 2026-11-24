import fs from "node:fs";
import path from "node:path";

export type TipoCampo = "texto" | "numero" | "fecha" | "booleano" | "opcion";

export interface Campo {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  opciones?: string[];
}

export interface Dominio {
  idioma: "es" | "en";
  titulo: string;
  descripcion: string;
  recurso: { nombre: string; plural: string; etiqueta: string; etiqueta_plural: string };
  campos: Campo[];
  datos_ejemplo: Record<string, unknown>[];
}

/** Lee la definicion del dominio (dominio.json, en la raiz del proyecto). */
export function cargarDominio(ruta = path.join(__dirname, "..", "..", "dominio.json")): Dominio {
  return JSON.parse(fs.readFileSync(ruta, "utf-8")) as Dominio;
}

export type Registro = Record<string, unknown> & { id: number };

export interface ResultadoValidacion {
  ok: boolean;
  errores: Record<string, string>;
  valor: Record<string, unknown>;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida y normaliza un registro segun los campos del dominio. */
export function validar(campos: Campo[], cuerpo: unknown, idioma: "es" | "en" = "es"): ResultadoValidacion {
  const t = idioma === "en"
    ? { req: "is required", num: "must be a number", fecha: "must be a date (YYYY-MM-DD)", bool: "must be true or false", opc: "must be one of" }
    : { req: "es obligatorio", num: "tiene que ser un número", fecha: "tiene que ser una fecha (AAAA-MM-DD)", bool: "tiene que ser verdadero o falso", opc: "tiene que ser uno de" };
  const entrada = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};
  const valor: Record<string, unknown> = {};

  for (const campo of campos) {
    const crudo = entrada[campo.nombre];
    const vacio = crudo === undefined || crudo === null || crudo === "";
    if (vacio) {
      if (campo.requerido) errores[campo.nombre] = `${campo.etiqueta} ${t.req}`;
      continue;
    }
    switch (campo.tipo) {
      case "texto":
        valor[campo.nombre] = String(crudo).trim();
        if (campo.requerido && !valor[campo.nombre]) errores[campo.nombre] = `${campo.etiqueta} ${t.req}`;
        break;
      case "numero": {
        const n = typeof crudo === "number" ? crudo : Number(crudo);
        if (Number.isFinite(n)) valor[campo.nombre] = n;
        else errores[campo.nombre] = `${campo.etiqueta} ${t.num}`;
        break;
      }
      case "fecha": {
        const s = String(crudo);
        if (FECHA.test(s) && !Number.isNaN(Date.parse(s))) valor[campo.nombre] = s;
        else errores[campo.nombre] = `${campo.etiqueta} ${t.fecha}`;
        break;
      }
      case "booleano":
        if (typeof crudo === "boolean") valor[campo.nombre] = crudo;
        else if (crudo === "true" || crudo === "false") valor[campo.nombre] = crudo === "true";
        else errores[campo.nombre] = `${campo.etiqueta} ${t.bool}`;
        break;
      case "opcion":
        if ((campo.opciones ?? []).includes(String(crudo))) valor[campo.nombre] = String(crudo);
        else errores[campo.nombre] = `${campo.etiqueta} ${t.opc}: ${(campo.opciones ?? []).join(", ")}`;
        break;
    }
  }
  return { ok: Object.keys(errores).length === 0, errores, valor };
}
