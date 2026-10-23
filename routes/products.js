const router = require('express').Router();
const db = require('../config/db');

function validate(b, isNew) {
  if (!b.name || !String(b.name).trim()) return 'Name is required';
  if (!b.sku || !String(b.sku).trim()) return 'SKU is required';
  if (isNew && (!Number.isInteger(b.quantity) || b.quantity < 0))
    return 'Quantity must be a whole number (0 or more)';
  if (!Number.isInteger(b.min_stock) || b.min_stock < 0)
    return 'Min stock must be a whole number (0 or more)';
  return null;
}

function handleError(e, res) {
  if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU already exists' });
  console.error(e);
  res.status(500).json({ error: 'Server error' });
}

// GET /api/products?search=belt&low=true
router.get('/', async (req, res) => {
  try {
    const search = `%${req.query.search || ''}%`;
    let sql = 'SELECT * FROM products WHERE (name LIKE ? OR sku LIKE ?)';
    if (req.query.low === 'true') sql += ' AND quantity <= min_stock';
    sql += ' ORDER BY id DESC';
    const [rows] = await db.query(sql, [search, search]);
    res.json(rows);
  } catch (e) { handleError(e, res); }
});

// POST /api/products
router.post('/', async (req, res) => {
  const b = { ...req.body, min_stock: req.body.min_stock ?? 10 };
  const err = validate(b, true);
  if (err) return res.status(400).json({ error: err });
  try {
    const [r] = await db.query(
      'INSERT INTO products (name, sku, quantity, min_stock, rack_location) VALUES (?,?,?,?,?)',
      [b.name.trim(), b.sku.trim(), b.quantity, b.min_stock, b.rack_location || null]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { handleError(e, res); }
});

// PUT /api/products/:id  (quantity yahan se change nahi hoti, sirf stock IN/OUT se)
router.put('/:id', async (req, res) => {
  const b = { ...req.body, min_stock: req.body.min_stock ?? 10 };
  const err = validate(b, false);
  if (err) return res.status(400).json({ error: err });
  try {
    const [r] = await db.query(
      'UPDATE products SET name=?, sku=?, min_stock=?, rack_location=? WHERE id=?',
      [b.name.trim(), b.sku.trim(), b.min_stock, b.rack_location || null, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Updated' });
  } catch (e) { handleError(e, res); }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { handleError(e, res); }
});

module.exports = router;