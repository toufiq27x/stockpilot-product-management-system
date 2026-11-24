const path = require('node:path');
const jsonServer = require('json-server');

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

function productValidation(router) {
  return (req, res, next) => {
    const isCollection = req.path === '/products' || req.path === '/products/';
    const isItem = /^\/products\/[^/]+\/?$/.test(req.path);

    if (req.method === 'POST' && isCollection) {
      const body = req.body;
      const errors = validateProduct(body);

      if (body && Object.hasOwn(body, 'id')) {
        errors.push('id is assigned by the server and must not be provided.');
      }

      if (errors.length) {
        return res.status(400).json({ message: 'Product validation failed.', errors });
      }

      const timestamp = new Date().toISOString();
      req.body = { ...body, createdAt: timestamp, updatedAt: timestamp };
      return next();
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && isItem) {
      const id = Number(req.path.split('/')[2]);
      const existing = Number.isSafeInteger(id)
        ? router.db.get('products').find({ id }).value()
        : undefined;

      if (!existing) return next();

      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
          message: 'Product validation failed.',
          errors: ['Request body must be a JSON object.']
        });
      }

      const errors = validateProduct(req.method === 'PATCH' ? { ...existing, ...body } : body);
      if (Object.hasOwn(body, 'id') && Number(body.id) !== id) {
        errors.push('id in the request body must match the product URL.');
      }

      if (errors.length) {
        return res.status(400).json({ message: 'Product validation failed.', errors });
      }

      req.body = {
        ...(req.method === 'PATCH' ? existing : {}),
        ...body,
        id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };
      return next();
    }

    return next();
  };
}

function createApp({ dbFile = DEFAULT_DB_FILE, staticDir = PUBLIC_DIR } = {}) {
  const app = jsonServer.create();
  const router = jsonServer.router(dbFile);

  app.use(jsonServer.defaults({ static: staticDir }));
  app.use(jsonServer.bodyParser);
  app.use(productValidation(router));
  app.use(router);

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
