const router = require('express').Router();
const db = require('../config/db');

// Transaction: stock update aur history dono saath hongi, ya dono nahi
async function moveStock(type, req, res) {
  const product_id = Number(req.body.product_id);
  const qty = Number(req.body.qty);

  if (!Number.isInteger(product_id) || !Number.isInteger(qty) || qty <= 0)
    return res.status(400).json({ error: 'product_id and a positive whole qty are required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT quantity FROM products WHERE id = ? FOR UPDATE', [product_id]);

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    if (type === 'OUT' && rows[0].quantity < qty) {
      await conn.rollback();
      return res.status(400).json({ error: `Only ${rows[0].quantity} units available` });
    }

    const change = type === 'IN' ? qty : -qty;
    await conn.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [change, product_id]);
    await conn.query('INSERT INTO stock_movements (product_id, type, qty) VALUES (?,?,?)',
      [product_id, type, qty]);

    await conn.commit();
    res.json({ message: `Stock ${type} successful` });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
}

router.post('/in', (req, res) => moveStock('IN', req, res));
router.post('/out', (req, res) => moveStock('OUT', req, res));

// Saari recent history
router.get('/history', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, p.name, p.sku, m.type, m.qty, m.created_at
      FROM stock_movements m JOIN products p ON p.id = m.product_id
      ORDER BY m.created_at DESC, m.id DESC LIMIT 20`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Ek product ki history
router.get('/history/:productId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, type, qty, created_at FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC, id DESC',
      [req.params.productId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;