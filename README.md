# STOCKPILOT - Product Management System

## Project Overview

This project includes a product inventory dashboard and a REST API backend. The product API supports the complete CRUD lifecycle using GET, POST, PUT, PATCH, and DELETE. Integration tests exercise the HTTP endpoints automatically.

The application allows users to:

- View the product inventory
- Add new products
- Edit product records
- Update stock quantity with PATCH
- Delete products
- Filter and search products
- Sort data on the server
- Navigate paginated results
- View live API activity logs
- Read dashboard statistics from actual server data

## Backend

The backend uses JSON Server to persist product data in `db.json`, with server-side validation for product create and update requests.

In this project, the data is stored in `db.json`, and JSON Server exposes it as a REST API at `http://localhost:3000`.

JSON Server provides the REST routes and JSON-file persistence. `server.js` starts it, serves the dashboard, and validates product create and update requests before they reach the data store.

## What is REST API?

REST (Representational State Transfer) is a software architecture style used for web services. A REST API allows a client such as a browser or frontend app to request and manipulate resources using standard HTTP methods.

In this project, the resource is a product.

Examples:

- GET /products -> retrieve all products
- GET /products/1 -> retrieve one product
- POST /products -> create a product
- PUT /products/1 -> replace an entire product
- PATCH /products/1 -> update part of a product
- DELETE /products/1 -> delete a product

## How the frontend communicates with the backend

The browser uses JavaScript's `fetch()` function to send HTTP requests to the JSON Server API.

Example:

```js
fetch('/products')
  .then(response => response.json())
  .then(data => console.log(data));
```

This demonstrates how the frontend communicates with the backend over HTTP. The app does not use local arrays or `localStorage` as the source of truth for product data.

## What `fetch()` does

`fetch()` sends an HTTP request to a URL and returns a Promise that resolves to the response. The app uses `fetch()` to:

- Read records with GET
- Create records with POST
- Replace records with PUT
- Update selected fields with PATCH
- Remove records with DELETE

The response can be converted to JSON with `response.json()`.

## Project Structure

```text
Product-Management-System/
├── package.json
├── server.js
├── db.json
├── README.md
├── test/
│   └── products.integration.test.js
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Installation

Open a terminal in the project folder and run:

```bash
npm install
```

## Start the project

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Run the integration tests

Run the complete HTTP integration test suite with:

```bash
npm test
```

The tests start the API against a temporary database, so they do not modify `db.json`. They cover listing and retrieving products, creating, replacing, partial updates, deleting, validation failures, and filtered/paginated reads.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /products | Retrieve all products |
| GET | /products/:id | Retrieve a specific product |
| POST | /products | Create a new product (201) |
| PUT | /products/:id | Replace a product entirely |
| PATCH | /products/:id | Update selected fields |
| DELETE | /products/:id | Delete a product |

Product requests require non-empty `name`, `category`, `brand`, and `description` strings, a `price` greater than zero, and a non-negative integer `stock`. Invalid requests return HTTP 400 with a JSON error message and details.

## Example API Calls

### GET all products

```bash
curl http://localhost:3000/products
```

### GET one product

```bash
curl http://localhost:3000/products/1
```

### POST new product

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart Desk Lamp",
    "category": "Home & Living",
    "brand": "Philips",
    "price": 3200,
    "stock": 25,
    "description": "Minimal desk lamp with adjustable brightness",
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }'
```

### PUT full update

```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "name": "Wireless Keyboard",
    "category": "Electronics",
    "brand": "Logitech",
    "price": 2600,
    "stock": 18,
    "description": "Updated wireless keyboard with USB receiver.",
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }'
```

### PATCH partial update

```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 15,
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }'
```

### DELETE a product

```bash
curl -X DELETE http://localhost:3000/products/1
```

## Filtering Examples

JSON Server supports query parameters for filtering.

```text
/products?category=Electronics
/products?price_gte=500&price_lte=5000
/products?stock=0
/products?stock_gte=1&stock_lte=10
/products?q=keyboard
```

## Sorting Examples

```text
/products?_sort=price&_order=asc
/products?_sort=price&_order=desc
/products?_sort=name&_order=asc
/products?_sort=stock&_order=desc
/products?_sort=createdAt&_order=asc
```

## Pagination Examples

```text
/products?_page=1&_limit=5
/products?_page=2&_limit=10
```

Pagination uses the `X-Total-Count` header to know how many records match the request.

## Automated and manual API testing

The integration tests automatically exercise the HTTP requests and assertions that would otherwise be entered manually in Postman:

```bash
npm test
```

To manually explore requests in Postman:

1. Start the API with `npm run dev`.
2. Open Postman.
3. Set the request URL to `http://localhost:3000/products`.
4. Choose the appropriate HTTP method.
5. Add JSON data in the request body for POST, PUT, or PATCH requests.
6. Click Send.
7. Check the response code and body.

The browser dashboard and automated tests both use this backend.

## Difference Between PUT and PATCH

### PUT

PUT replaces the entire resource. If the request body does not include all fields, the missing fields are lost, so you must send a complete object.

### PATCH

PATCH updates only selected attributes. It is useful for changing one property such as stock quantity without replacing the entire record.

## How the data is stored

All product data is saved in `db.json`.

This file acts as the database for the lab project. JSON Server reads and writes to it automatically whenever you create, update, or delete a product.

## Notes for Students

This project was built to help explain how a frontend app uses fetch() to communicate with a JSON Server API. The interface demonstrates the same fundamental operations that are usually tested in Postman, but in a real browser-based dashboard.
