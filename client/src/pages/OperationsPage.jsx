import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const kinds = ['TRANSFER', 'DELIVERY', 'ADJUSTMENT'];
const blank = { productId: '', sourceLocationId: '', destinationLocationId: '', quantity: '', countedQuantity: '' };

export default function OperationsPage() {
  const [type, setType] = useState('TRANSFER');
  const [form, setForm] = useState(blank);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [operations, setOperations] = useState([]);
  const [stock, setStock] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [p, l, o, s] = await Promise.all([api.getProducts(), api.getLocations(), api.getOperations(), api.getStock()]);
    setProducts(p); setLocations(l); setOperations(o); setStock(s);
  }

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  async function create(e) {
    e.preventDefault();
    setError(''); setMessage('');
    const amount = type === 'ADJUSTMENT' ? form.countedQuantity : form.quantity;
    if (amount === '' || !Number.isFinite(Number(amount)) || Number(amount) < 0 || (type !== 'ADJUSTMENT' && Number(amount) === 0)) {
      setError(type === 'ADJUSTMENT' ? 'Enter a valid physical count of zero or more.' : 'Enter a quantity greater than zero.');
      return;
    }
    if (type === 'TRANSFER' && form.sourceLocationId === form.destinationLocationId) {
      setError('Choose two different locations.'); return;
    }
    const payload = { type, productId: form.productId };
    if (type === 'TRANSFER' || type === 'DELIVERY') payload.sourceLocationId = form.sourceLocationId;
    if (type === 'TRANSFER' || type === 'ADJUSTMENT') payload.destinationLocationId = form.destinationLocationId;
    if (type === 'ADJUSTMENT') payload.countedQuantity = Number(amount);
    else payload.quantity = Number(amount);
    try {
      setBusy(true);
      const created = await api.createOperation(payload);
      await reload();
      setMessage(`${created.type} draft created. Validate it below to update stock.`);
      setForm(blank);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function validate(id) {
    setError(''); setMessage('');
    try {
      setBusy(true);
      await api.validateOperation(id);
      await reload();
      setMessage('Operation validated. Stock and move history updated.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const selectClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 transition-colors';
  const label = 'mb-2 block text-sm font-semibold text-slate-600 dark:text-slate-300';
  const name = (id, values) => values.find((v) => v.id === id)?.name || id || '—';
  const available = stock.find((s) => s.productId === form.productId && s.locationId === (type === 'ADJUSTMENT' ? form.destinationLocationId : form.sourceLocationId))?.quantity || 0;

  return <div className="space-y-7 p-4 md:p-8">
    <div className="rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 p-7 text-white shadow-lg">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">StockSense · Live operations</p>
      <h1 className="mt-2 text-3xl font-bold">Move stock with confidence</h1>
      <p className="mt-2 text-slate-300">Create a draft, review it, then validate to change inventory and record a move.</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-700 dark:text-rose-300">{error} <button className="ml-3 underline" onClick={() => reload().then(() => setError('')).catch((e) => setError(e.message))}>Retry</button></div>}
    {message && <div role="status" className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 p-4 text-teal-800 dark:text-teal-300">{message}</div>}
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={create} className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">New operation</h2>
        <div className="flex flex-wrap gap-2">{kinds.map((k) => <button type="button" key={k} onClick={() => { setType(k); setForm(blank); setError(''); }} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${type === k ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{k === 'ADJUSTMENT' ? 'Stock adjustment' : k === 'TRANSFER' ? 'Internal transfer' : 'Delivery'}</button>)}</div>
        <div><label className={label} htmlFor="op-product">Product</label><select id="op-product" required className={selectClass} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></div>
        {type !== 'ADJUSTMENT' && <div><label className={label} htmlFor="op-source">Source location</label><select id="op-source" required className={selectClass} value={form.sourceLocationId} onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}><option value="">Select source</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
        {type !== 'DELIVERY' && <div><label className={label} htmlFor="op-dest">{type === 'ADJUSTMENT' ? 'Counted location' : 'Destination location'}</label><select id="op-dest" required className={selectClass} value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}><option value="">Select location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
        <div><label className={label} htmlFor="op-quantity">{type === 'ADJUSTMENT' ? 'Physical count' : 'Quantity'}</label><input id="op-quantity" required min={type === 'ADJUSTMENT' ? '0' : '0.001'} step="any" type="number" className={selectClass} value={type === 'ADJUSTMENT' ? form.countedQuantity : form.quantity} onChange={(e) => setForm({ ...form, [type === 'ADJUSTMENT' ? 'countedQuantity' : 'quantity']: e.target.value })}/></div>
        {form.productId && (form.sourceLocationId || form.destinationLocationId) && <p className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Current stock at {type === 'ADJUSTMENT' ? 'counted' : 'source'} location: <strong>{available}</strong></p>}
        <button disabled={busy} className="w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">Create draft</button>
      </form>
      <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent operations</h2>
        {operations.filter((op) => kinds.includes(op.type)).length === 0 && <p className="text-slate-500 dark:text-slate-400">No operations yet. Create a draft to start.</p>}
        {operations.filter((op) => kinds.includes(op.type)).map((op) => <div key={op.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-slate-900 dark:text-white">{op.type} · {name(op.productId, products)}</strong><span className={`rounded-full px-3 py-1 text-xs font-bold ${op.status === 'DONE' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>{op.status}</span></div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{op.type === 'ADJUSTMENT' ? `Count ${op.countedQuantity} at ${name(op.destinationLocationId, locations)}` : `${op.quantity} · ${name(op.sourceLocationId, locations)} ${op.type === 'TRANSFER' ? `→ ${name(op.destinationLocationId, locations)}` : '→ Customer'}`}</p>
          {op.status === 'DRAFT' && <button disabled={busy} onClick={() => validate(op.id)} className="mt-3 rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50">Validate operation</button>}
        </div>)}
      </div>
    </div>
  </div>;
}
