import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Boxes,
  Warehouse,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react';
import PageHeading from '../components/PageHeading';
import Table from '../components/Table';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { api } from '../services/api';

const defaultForm = {
  name: '',
  sku: '',
  uom: 'kg',
  reorderLevel: '20',
};

const baseUomOptions = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'g', label: 'g (Grams)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'boxes', label: 'boxes (Boxes)' },
  { value: 'sheets', label: 'sheets (Sheets)' },
  { value: 'm', label: 'm (Meters)' },
  { value: 'l', label: 'l (Liters)' },
  { value: 'ml', label: 'ml (Milliliters)' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = creating, object = editing
  const [formData, setFormData] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: string }

  // Load products and stock from real backend API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodsData, stockData] = await Promise.all([
        api.getProducts(),
        api.getStock(),
      ]);
      setProducts(prodsData || []);
      setStock(stockData || []);
    } catch (err) {
      console.error('Failed to load products/stock:', err);
      setError(err.message || 'Unable to connect to backend product service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(defaultForm);
    setFormErrors({});
    setFormFeedback(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      uom: product.uom || 'kg',
      reorderLevel: product.reorderLevel !== undefined ? String(product.reorderLevel) : '20',
    });
    setFormErrors({});
    setFormFeedback(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormData(defaultForm);
    setFormErrors({});
    setFormFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback(null);
    setFormErrors({});

    const errs = {};
    const trimmedName = formData.name.trim();
    const trimmedSku = formData.sku.trim().toUpperCase();
    const selectedUom = (formData.uom || '').trim() || 'kg';
    const reorderVal = formData.reorderLevel === '' ? 20 : Number(formData.reorderLevel);

    if (isNaN(reorderVal) || reorderVal < 0) {
      errs.reorderLevel = 'Reorder level must be a non-negative number';
    }

    if (editingProduct) {
      // Partial update - only send fields that changed
      const originalName = (editingProduct.name || '').trim();
      const originalSku = (editingProduct.sku || '').trim().toUpperCase();
      const originalUom = (editingProduct.uom || 'kg').trim();
      const originalReorder = Number(editingProduct.reorderLevel !== undefined ? editingProduct.reorderLevel : 20);

      const patchPayload = {};

      if (trimmedName !== originalName) {
        if (!trimmedName) {
          errs.name = 'Product name cannot be empty';
        } else {
          patchPayload.name = trimmedName;
        }
      }

      if (trimmedSku !== originalSku) {
        if (!trimmedSku) {
          errs.sku = 'SKU cannot be empty';
        } else {
          patchPayload.sku = trimmedSku;
        }
      }

      if (selectedUom !== originalUom) {
        patchPayload.uom = selectedUom;
      }

      if (reorderVal !== originalReorder) {
        if (!errs.reorderLevel) {
          patchPayload.reorderLevel = reorderVal;
        }
      }

      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        return;
      }

      if (Object.keys(patchPayload).length === 0) {
        setFormFeedback({
          type: 'info',
          message: 'No changes detected. Update at least one field before saving.',
        });
        return;
      }

      try {
        setSubmitting(true);
        const updated = await api.updateProduct(editingProduct.id, patchPayload);
        setFormFeedback({
          type: 'success',
          message: `Product "${updated?.name || trimmedName || editingProduct.name}" successfully updated!`,
        });
        // Refresh product list and stock after successful edit
        await loadData();
        setTimeout(() => {
          setIsFormOpen(false);
          setEditingProduct(null);
          setFormData(defaultForm);
          setFormErrors({});
          setFormFeedback(null);
        }, 1200);
      } catch (err) {
        console.error('Product update error:', err);
        setFormFeedback({
          type: 'error',
          message: err.message || 'Operation failed on the server.',
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Creation - name and sku required, uom defaults to kg, reorderLevel defaults to 20
      if (!trimmedName) {
        errs.name = 'Product name is required';
      }
      if (!trimmedSku) {
        errs.sku = 'SKU is required';
      }

      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        return;
      }

      const createPayload = {
        name: trimmedName,
        sku: trimmedSku,
        uom: selectedUom,
        reorderLevel: reorderVal,
      };

      try {
        setSubmitting(true);
        const created = await api.createProduct(createPayload);
        setFormFeedback({
          type: 'success',
          message: `Product "${created?.name || createPayload.name}" (${created?.sku || createPayload.sku}) successfully created!`,
        });
        // Refresh product list and stock after successful create
        await loadData();
        setTimeout(() => {
          setIsFormOpen(false);
          setEditingProduct(null);
          setFormData(defaultForm);
          setFormErrors({});
          setFormFeedback(null);
        }, 1200);
      } catch (err) {
        console.error('Product create error:', err);
        setFormFeedback({
          type: 'error',
          message: err.message || 'Operation failed on the server.',
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Helper to calculate total real stock for a product from GET /api/stock
  const getProductStockInfo = (productId) => {
    const productStockEntries = stock.filter((s) => s.productId === productId);
    const totalQty = productStockEntries.reduce(
      (sum, s) => sum + Number(s.quantity || 0),
      0
    );
    return {
      entries: productStockEntries,
      total: totalQty,
    };
  };

  if (loading) {
    return <LoadingState message="Loading Products and Real-Time Stock Status..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Products Catalog"
          description="Master inventory items registered for stock operations."
        />
        <ErrorState
          title="Unable to load catalog"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  const tableColumns = [
    {
      key: 'name',
      title: 'Product',
      cellClassName: 'font-semibold text-slate-900 dark:text-white',
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">ID: {item.id}</div>
        </div>
      ),
    },
    {
      key: 'sku',
      title: 'SKU / Code',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {item.sku}
        </span>
      ),
    },
    {
      key: 'uom',
      title: 'UoM',
      render: (item) => (
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.uom || 'kg'}
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      title: 'Reorder Level',
      align: 'right',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {item.reorderLevel !== undefined ? item.reorderLevel : 20} {item.uom || 'kg'}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      title: 'Real Stock Status',
      render: (item) => {
        const { total, entries } = getProductStockInfo(item.id);
        const uom = item.uom || 'kg';
        const reorder = Number(item.reorderLevel ?? 20);

        let badgeClass = 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 ring-teal-600/20 dark:ring-teal-500/30';
        let statusText = `In Stock (${total} ${uom})`;

        if (total === 0) {
          badgeClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-rose-600/20 dark:ring-rose-500/30';
          statusText = `Out of Stock (0 ${uom})`;
        } else if (total <= reorder) {
          badgeClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-500/30';
          statusText = `Low Stock (${total} / ${reorder} ${uom})`;
        }

        return (
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}
            >
              {total <= reorder && total > 0 && <ShieldAlert className="h-3 w-3" />}
              {statusText}
            </span>
            {entries.length > 0 ? (
              <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                {entries.map((e, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Warehouse className="h-2.5 w-2.5 text-teal-600 dark:text-teal-400" />
                    {e.locationName || e.locationCode || e.locationId}: {e.quantity} {uom}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">No location records</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (item) => (
        <button
          onClick={() => handleOpenEdit(item)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      ),
    },
  ];

  const activeUomOptions = baseUomOptions.some((opt) => opt.value === formData.uom)
    ? baseUomOptions
    : formData.uom
    ? [{ value: formData.uom, label: formData.uom }, ...baseUomOptions]
    : baseUomOptions;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Products & Real-Time Stock Status"
        description="Master inventory items registered for stock operations and live location balances."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Product
            </button>
          </div>
        }
      />

      {/* Product Create / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
              </h3>
              <button
                onClick={handleCloseForm}
                disabled={submitting}
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formFeedback && (
              <div
                role="alert"
                className={`mt-4 rounded-lg p-3 text-xs font-medium flex items-center gap-2 ${
                  formFeedback.type === 'success'
                    ? 'border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200'
                    : formFeedback.type === 'info'
                    ? 'border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                    : 'border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                }`}
              >
                {formFeedback.type === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                )}
                {formFeedback.type === 'info' && (
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                {formFeedback.type === 'error' && (
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{formFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <FormInput
                label="Product Name"
                id="name"
                required
                disabled={submitting}
                placeholder="e.g. Rice"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                }}
                error={formErrors.name}
              />

              <FormInput
                label="SKU / Identification Code"
                id="sku"
                required
                disabled={submitting}
                placeholder="e.g. RICE-002"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                  if (formErrors.sku) setFormErrors({ ...formErrors, sku: null });
                }}
                error={formErrors.sku}
                helperText="Unique uppercase identifier for catalog lookups."
              />

              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Unit of Measure (UoM)"
                  id="uom"
                  disabled={submitting}
                  value={formData.uom}
                  onChange={(e) => {
                    setFormData({ ...formData, uom: e.target.value });
                    if (formErrors.uom) setFormErrors({ ...formErrors, uom: null });
                  }}
                  options={activeUomOptions}
                  error={formErrors.uom}
                  helperText="Defaults to kg."
                />

                <FormInput
                  label="Reorder Level"
                  id="reorderLevel"
                  disabled={submitting}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="20"
                  value={formData.reorderLevel}
                  onChange={(e) => {
                    setFormData({ ...formData, reorderLevel: e.target.value });
                    if (formErrors.reorderLevel) setFormErrors({ ...formErrors, reorderLevel: null });
                  }}
                  error={formErrors.reorderLevel}
                  helperText="Defaults to 20."
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{editingProduct ? 'Saving to Backend...' : 'Creating Product...'}</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-time Stock Summary by Location Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Live Stock Status by Location (Real API Data)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live balances fetched directly from <code className="font-mono text-[11px] text-teal-700 dark:text-teal-400">GET /api/stock</code>.
            </p>
          </div>
          <span className="rounded bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
            {stock.length} Active Records
          </span>
        </div>

        {stock.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 italic">
            No stock balances found. Perform a Receipt operation to add inventory.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stock.map((item, idx) => (
              <div
                key={`${item.productId}-${item.locationId}-${idx}`}
                className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{item.productName || item.productId}</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.sku}</div>
                  </div>
                  <span className="font-bold text-sm text-teal-800 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-950/60 px-2 py-0.5 rounded">
                    {Number(item.quantity || 0)} {item.uom || 'kg'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                  <Warehouse className="h-3 w-3 text-slate-400" />
                  <span>{item.locationName || item.locationCode || item.locationId}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Products Table */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered Catalog</h3>
        <Table
          columns={tableColumns}
          data={products}
          keyField="id"
          emptyMessage="No products in catalog"
          emptyDescription="Click 'New Product' above to register your first product in the database."
        />
      </div>
    </div>
  );
}
