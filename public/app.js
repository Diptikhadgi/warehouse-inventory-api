const $ = id => document.getElementById(id);
let products = [];
let chart;
let stockAction = null; // { type: 'in' | 'out', id }

// ---------- Helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => (t.className = ''), 2500);
}

// ---------- Load data ----------
async function loadStats() {
  const s = await api('/api/stats');
  $('statProducts').textContent = s.total_products;
  $('statUnits').textContent = Number(s.total_units).toLocaleString();
  $('statLow').textContent = s.low_stock;
}

async function loadProducts() {
  try {
    const q = encodeURIComponent($('search').value.trim());
    products = await api(`/api/products?search=${q}&low=${$('lowOnly').checked}`);
    renderTable();
    renderChart();
  } catch (e) { toast(e.message, true); }
}

async function loadHistory() {
  const rows = await api('/api/stock/history');
  $('historyBody').innerHTML = rows.length
    ? rows.map(m => `<tr>
        <td>${esc(m.name)}</td>
        <td><span class="badge ${m.type === 'IN' ? 'in' : 'out'}">${m.type}</span></td>
        <td>${m.qty}</td>
        <td>${new Date(m.created_at).toLocaleString()}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">No movements yet</td></tr>';
}

async function refreshAll() {
  try { await Promise.all([loadStats(), loadProducts(), loadHistory()]); }
  catch (e) { toast(e.message, true); }
}

// ---------- Render ----------
function renderTable() {
  const body = $('productBody');
  if (!products.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No products found</td></tr>';
    return;
  }
  body.innerHTML = products.map(p => {
    const low = p.quantity <= p.min_stock;
    return `<tr>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${esc(p.sku)}</td>
      <td>${esc(p.rack_location || '-')}</td>
      <td>${p.quantity}</td>
      <td><span class="badge ${low ? 'low' : 'ok'}">${low ? 'Low Stock' : 'In Stock'}</span></td>
      <td><div class="actions">
        <button class="btn in" data-act="in" data-id="${p.id}">+ IN</button>
        <button class="btn out" data-act="out" data-id="${p.id}">- OUT</button>
        <button class="btn" data-act="edit" data-id="${p.id}">Edit</button>
        <button class="btn del" data-act="del" data-id="${p.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function renderChart() {
  if (chart) chart.destroy();
  chart = new Chart($('stockChart'), {
    type: 'bar',
    data: {
      labels: products.map(p => p.name),
      datasets: [{
        label: 'Quantity',
        data: products.map(p => p.quantity),
        backgroundColor: products.map(p => p.quantity <= p.min_stock ? '#dc2626' : '#2563eb'),
        borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// ---------- Table buttons (event delegation) ----------
$('productBody').addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const p = products.find(x => x.id === Number(btn.dataset.id));
  if (!p) return;

  if (btn.dataset.act === 'edit') openProductForm(p);
  if (btn.dataset.act === 'in' || btn.dataset.act === 'out') openStockForm(btn.dataset.act, p);
  if (btn.dataset.act === 'del') {
    if (!confirm(`Delete "${p.name}"? Its history will also be deleted.`)) return;
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      toast('Product deleted');
      refreshAll();
    } catch (err) { toast(err.message, true); }
  }
});

// ---------- Add / Edit product ----------
function openProductForm(p) {
  $('productForm').reset();
  $('pId').value = p ? p.id : '';
  $('productTitle').textContent = p ? 'Edit Product' : 'Add Product';
  if (p) {
    $('pName').value = p.name;
    $('pSku').value = p.sku;
    $('pQty').value = p.quantity;
    $('pMin').value = p.min_stock;
    $('pRack').value = p.rack_location || '';
  }
  $('pQty').disabled = !!p; // quantity sirf stock IN/OUT se badlegi
  $('productDialog').showModal();
}

$('addBtn').onclick = () => openProductForm();
$('cancelProduct').onclick = () => $('productDialog').close();

$('productForm').onsubmit = async e => {
  e.preventDefault();
  const id = $('pId').value;
  const body = {
    name: $('pName').value.trim(),
    sku: $('pSku').value.trim(),
    rack_location: $('pRack').value.trim(),
    min_stock: Number($('pMin').value)
  };
  if (!id) body.quantity = Number($('pQty').value);

  try {
    await api(id ? `/api/products/${id}` : '/api/products',
      { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    $('productDialog').close();
    toast(id ? 'Product updated' : 'Product added');
    refreshAll();
  } catch (err) { toast(err.message, true); }
};

// ---------- Stock IN / OUT ----------
function openStockForm(type, p) {
  stockAction = { type, id: p.id };
  $('stockTitle').textContent = `Stock ${type.toUpperCase()} - ${p.name} (current: ${p.quantity})`;
  $('sQty').value = '';
  $('stockDialog').showModal();
}

$('cancelStock').onclick = () => $('stockDialog').close();

$('stockForm').onsubmit = async e => {
  e.preventDefault();
  try {
    await api(`/api/stock/${stockAction.type}`, {
      method: 'POST',
      body: JSON.stringify({ product_id: stockAction.id, qty: Number($('sQty').value) })
    });
    $('stockDialog').close();
    toast(`Stock ${stockAction.type.toUpperCase()} successful`);
    refreshAll();
  } catch (err) { toast(err.message, true); }
};

// ---------- Search & filter ----------
let timer;
$('search').oninput = () => { clearTimeout(timer); timer = setTimeout(loadProducts, 300); };
$('lowOnly').onchange = loadProducts;

refreshAll();