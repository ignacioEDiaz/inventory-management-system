import express from "express";
import fs from "node:fs";
import path from "node:path";
import { crearApp } from "./app";

const puerto = Number(process.env.PORT ?? 3001);
const app = crearApp();

// en produccion (npm run build && npm start) el mismo servidor entrega la interfaz de React
const web = path.join(__dirname, "..", "..", "web", "dist");
if (fs.existsSync(web)) {
  app.use(express.static(web));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(web, "index.html")));
}

app.listen(puerto, () => {
  console.log(`Listo en http://localhost:${puerto}`);
});
