const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const ROOT_DIR = __dirname;
const DEFAULT_DB_FILE = path.join(ROOT_DIR, 'db.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PRODUCT_FIELDS = new Set([
  'id',
  'name',
  'category',
  'brand',
  'price',
  'stock',
  'description',
  'createdAt',
  'updatedAt'
]);
const RESERVED_QUERY_PARAMS = new Set(['q', '_page', '_limit', '_sort', '_order']);

function validateProduct(product) {
  const errors = [];

  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    return ['Request body must be a JSON object.'];
  }

  for (const field of Object.keys(product)) {
    if (!PRODUCT_FIELDS.has(field)) {
      errors.push(`"${field}" is not a supported product field.`);
    }
  }

  for (const field of ['name', 'category', 'brand', 'description']) {
    if (typeof product[field] !== 'string' || !product[field].trim()) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) {
    errors.push('price must be a number greater than zero.');
  }

  if (!Number.isInteger(product.stock) || product.stock < 0) {
    errors.push('stock must be a non-negative integer.');
  }

  return errors;
}

function readProducts(dbFile) {
  const database = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  if (!database || !Array.isArray(database.products)) {
    throw new Error('Database file must contain a products array.');
  }
  return database;
}

function saveProducts(dbFile, database) {
  fs.writeFileSync(dbFile, `${JSON.stringify(database, null, 2)}\n`);
}

function getProductId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function filterProducts(products, query) {
  let filtered = products;

  if (typeof query.q === 'string' && query.q) {
    const search = query.q.toLowerCase();
    filtered = filtered.filter((product) =>
      Object.values(product).some((value) => String(value).toLowerCase().includes(search))
    );
  }

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_QUERY_PARAMS.has(key) || typeof value !== 'string') continue;

    const range = key.match(/^(.+)_(gte|lte)$/);
    if (range) {
      const [, field, operator] = range;
      const bound = Number(value);
      if (!Number.isFinite(bound)) continue;
      filtered = filtered.filter((product) => {
        const fieldValue = Number(product[field]);
        if (!Number.isFinite(fieldValue)) return false;
        return operator === 'gte' ? fieldValue >= bound : fieldValue <= bound;
      });
      continue;
    }

    filtered = filtered.filter((product) => String(product[key]) === value);
  }

  const sortField = query._sort;
  if (typeof sortField === 'string' && PRODUCT_FIELDS.has(sortField)) {
    const direction = query._order === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const left = a[sortField];
      const right = b[sortField];
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }

  return filtered;
}

function createApp({ dbFile = DEFAULT_DB_FILE, staticDir = PUBLIC_DIR } = {}) {
  const app = express();

  app.use(express.json({ strict: false }));
  app.use(express.static(staticDir));

  app.get('/products', (req, res) => {
    const database = readProducts(dbFile);
    const filtered = filterProducts(database.products, req.query);
    const total = filtered.length;
    const page = Number.parseInt(req.query._page, 10);
    const limit = Number.parseInt(req.query._limit, 10);

    res.set('X-Total-Count', String(total));
    if (Number.isInteger(page) && page > 0 && Number.isInteger(limit) && limit > 0) {
      const start = (page - 1) * limit;
      return res.json(filtered.slice(start, start + limit));
    }
    return res.json(filtered);
  });

  app.get('/products/:id', (req, res) => {
    const id = getProductId(req.params.id);
    const product = id === null
      ? undefined
      : readProducts(dbFile).products.find((item) => item.id === id);
    if (!product) return res.status(404).json({});
    return res.json(product);
  });

  app.post('/products', (req, res) => {
    const body = req.body;
    const errors = validateProduct(body);
    if (body && Object.hasOwn(body, 'id')) {
      errors.push('id is assigned by the server and must not be provided.');
    }
    if (errors.length) {
      return res.status(400).json({ message: 'Product validation failed.', errors });
    }

    const database = readProducts(dbFile);
    const id = database.products.reduce((maximum, product) => Math.max(maximum, product.id), 0) + 1;
    const timestamp = new Date().toISOString();
    const product = { ...body, id, createdAt: timestamp, updatedAt: timestamp };
    database.products.push(product);
    saveProducts(dbFile, database);
    return res.status(201).json(product);
  });

  app.put('/products/:id', (req, res) => {
    const id = getProductId(req.params.id);
    const database = readProducts(dbFile);
    const index = id === null ? -1 : database.products.findIndex((product) => product.id === id);
    if (index === -1) return res.status(404).json({});

    const body = req.body;
    const errors = validateProduct(body);
    if (body && Object.hasOwn(body, 'id') && Number(body.id) !== id) {
      errors.push('id in the request body must match the product URL.');
    }
    if (errors.length) {
      return res.status(400).json({ message: 'Product validation failed.', errors });
    }

    const existing = database.products[index];
    const product = {
      ...body,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    database.products[index] = product;
    saveProducts(dbFile, database);
    return res.json(product);
  });

  app.patch('/products/:id', (req, res) => {
    const id = getProductId(req.params.id);
    const database = readProducts(dbFile);
    const index = id === null ? -1 : database.products.findIndex((product) => product.id === id);
    if (index === -1) return res.status(404).json({});

    const existing = database.products[index];
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        message: 'Product validation failed.',
        errors: ['Request body must be a JSON object.']
      });
    }
    const errors = validateProduct({ ...existing, ...body });
    if (Object.hasOwn(body, 'id') && Number(body.id) !== id) {
      errors.push('id in the request body must match the product URL.');
    }
    if (errors.length) {
      return res.status(400).json({ message: 'Product validation failed.', errors });
    }

    const product = {
      ...existing,
      ...body,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    database.products[index] = product;
    saveProducts(dbFile, database);
    return res.json(product);
  });

  app.delete('/products/:id', (req, res) => {
    const id = getProductId(req.params.id);
    const database = readProducts(dbFile);
    const index = id === null ? -1 : database.products.findIndex((product) => product.id === id);
    if (index === -1) return res.status(404).json({});

    const [product] = database.products.splice(index, 1);
    saveProducts(dbFile, database);
    return res.json(product);
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  app.listen(port, () => {
    console.log(`StockPilot API is running at http://localhost:${port}`);
  });
}

module.exports = { createApp };
