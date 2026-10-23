require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));

// Dashboard cards ke liye numbers
app.get('/api/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS total_products,
             COALESCE(SUM(quantity), 0) AS total_units,
             COALESCE(SUM(quantity <= min_stock), 0) AS low_stock
      FROM products`);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));