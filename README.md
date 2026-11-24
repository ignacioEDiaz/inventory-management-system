# Inventory Management System

Manage and track physical assets efficiently for warehouse operations

## Features

- List, search, create, edit and delete items.
- Server-side validation by field type (text, number, date, boolean, option) with clear error messages.
- REST API: `GET /api/items`, `GET /api/items/:id`, `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`, search with `?q=`.
- Automated tests for the API and the validation rules.
- In-memory storage with sample data, so it runs without any setup.

## Data model

| Field | Label | Type | Required |
|---|---|---|---|
| `name` | Name | text | yes |
| `quantity` | Quantity | number | yes |
| `location` | Location | text | no |
| `status` | Status | option (in stock, out of stock, damaged, reserved) | no |

## Stack

TypeScript · Node.js + Express (REST API) · React + Vite · Vitest + Supertest

## Run it

```bash
npm install
npm test            # API tests
npm run dev:server  # API on http://localhost:3001
npm run dev:web     # UI on http://localhost:5173

# production: one server for API + UI
npm run build && npm start
```

## Structure

- `server/`: REST API with validation (Express + TypeScript)
- `web/`: React UI (Vite)
- `dominio.json`: resource definition (fields, types, sample data)
