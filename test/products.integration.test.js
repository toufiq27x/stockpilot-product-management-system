const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('../server');

const seedProduct = {
  id: 1,
  name: 'Wireless Keyboard',
  category: 'Electronics',
  brand: 'Logitech',
  price: 2500,
  stock: 25,
  description: 'Wireless keyboard with USB receiver.',
  createdAt: '2026-01-10T10:00:00.000Z',
  updatedAt: '2026-01-10T10:00:00.000Z'
};

const newProduct = {
  name: 'Desk Lamp',
  category: 'Home & Living',
  brand: 'Philips',
  price: 3200,
  stock: 8,
  description: 'Adjustable LED desk lamp.'
};

async function startTestServer(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'stockpilot-api-'));
  const dbFile = path.join(directory, 'db.json');
  await fs.writeFile(dbFile, JSON.stringify({ products: [seedProduct] }));

  const server = createApp({ dbFile, staticDir: directory }).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await fs.rm(directory, { recursive: true, force: true });
  });

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function request(baseUrl, route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null
  };
}

function jsonBody(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

test('GET /products lists products and GET /products/:id returns one product', async (t) => {
  const baseUrl = await startTestServer(t);

  const list = await request(baseUrl, '/products');
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.body, [seedProduct]);

  const item = await request(baseUrl, '/products/1');
  assert.equal(item.response.status, 200);
  assert.deepEqual(item.body, seedProduct);
});

test('POST /products creates a product and assigns its ID and timestamps', async (t) => {
  const baseUrl = await startTestServer(t);

  const created = await request(baseUrl, '/products', jsonBody('POST', newProduct));
  assert.equal(created.response.status, 201);
  assert.equal(created.body.id, 2);
  assert.deepEqual(
    { ...created.body, id: undefined, createdAt: undefined, updatedAt: undefined },
    { ...newProduct, id: undefined, createdAt: undefined, updatedAt: undefined }
  );
  assert.ok(Number.isFinite(Date.parse(created.body.createdAt)));
  assert.equal(created.body.updatedAt, created.body.createdAt);

  const fetched = await request(baseUrl, `/products/${created.body.id}`);
  assert.equal(fetched.response.status, 200);
  assert.deepEqual(fetched.body, created.body);
});

test('PUT /products/:id replaces product data and preserves server-managed fields', async (t) => {
  const baseUrl = await startTestServer(t);
  const replacement = {
    ...seedProduct,
    name: 'Updated Keyboard',
    price: 2800,
    stock: 18
  };

  const updated = await request(baseUrl, '/products/1', jsonBody('PUT', replacement));
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.name, replacement.name);
  assert.equal(updated.body.price, replacement.price);
  assert.equal(updated.body.id, seedProduct.id);
  assert.equal(updated.body.createdAt, seedProduct.createdAt);
  assert.ok(Number.isFinite(Date.parse(updated.body.updatedAt)));
});

test('PATCH /products/:id changes selected fields and keeps the remaining data', async (t) => {
  const baseUrl = await startTestServer(t);

  const updated = await request(baseUrl, '/products/1', jsonBody('PATCH', { stock: 0 }));
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.stock, 0);
  assert.equal(updated.body.name, seedProduct.name);
  assert.equal(updated.body.price, seedProduct.price);
  assert.equal(updated.body.createdAt, seedProduct.createdAt);
});

test('DELETE /products/:id removes the product', async (t) => {
  const baseUrl = await startTestServer(t);

  const deleted = await request(baseUrl, '/products/1', { method: 'DELETE' });
  assert.equal(deleted.response.status, 200);

  const fetched = await request(baseUrl, '/products/1');
  assert.equal(fetched.response.status, 404);
});

test('invalid product data returns 400 and does not create a record', async (t) => {
  const baseUrl = await startTestServer(t);
  const invalidProduct = { ...newProduct, price: -1, stock: 1.5 };

  const result = await request(baseUrl, '/products', jsonBody('POST', invalidProduct));
  assert.equal(result.response.status, 400);
  assert.equal(result.body.message, 'Product validation failed.');
  assert.ok(result.body.errors.some((error) => error.includes('price')));
  assert.ok(result.body.errors.some((error) => error.includes('stock')));

  const list = await request(baseUrl, '/products');
  assert.equal(list.body.length, 1);
});

test('updates reject invalid data and unknown product fields', async (t) => {
  const baseUrl = await startTestServer(t);

  const invalidPatch = await request(
    baseUrl,
    '/products/1',
    jsonBody('PATCH', { stock: -1 })
  );
  assert.equal(invalidPatch.response.status, 400);

  const unknownField = await request(
    baseUrl,
    '/products',
    jsonBody('POST', { ...newProduct, internalNote: 'not supported' })
  );
  assert.equal(unknownField.response.status, 400);
  assert.ok(unknownField.body.errors.some((error) => error.includes('internalNote')));
});

test('filtered and paginated product reads remain available', async (t) => {
  const baseUrl = await startTestServer(t);

  const result = await request(
    baseUrl,
    '/products?category=Electronics&_page=1&_limit=1&_sort=name&_order=asc'
  );
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('x-total-count'), '1');
  assert.deepEqual(result.body, [seedProduct]);
});
