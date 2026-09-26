import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  CheckCircle2,
  PlusCircle,
  FileCheck2,
  Clock,
  Sparkles,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import PageHeading from '../components/PageHeading';
import KpiCard from '../components/KpiCard';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { api } from '../services/api';

export default function ReceiptsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, DRAFT, DONE

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    destinationLocationId: '',
    supplier: '',
    quantity: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [selectedDraftForValidate, setSelectedDraftForValidate] = useState(null);

  // Fetch initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsData, locsData, opsData] = await Promise.all([
        api.getProducts(),
        api.getLocations(),
        api.getOperations(),
      ]);

      setProducts(prodsData || []);
      setLocations(locsData || []);

      // Filter only RECEIPT type operations
      const receiptOps = (opsData || []).filter((op) => op.type === 'RECEIPT');
      setReceipts(receiptOps);
    } catch (err) {
      console.error('Failed to load receipts data:', err);
      setError(err.message || 'Unable to load operations. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Validation function
  const validateForm = () => {
    const errors = {};

    if (!formData.productId) {
      errors.productId = 'Product is required';
    }

    if (!formData.destinationLocationId) {
      errors.destinationLocationId = 'Destination location is required';
    }

    if (!formData.supplier || formData.supplier.trim() === '') {
      errors.supplier = 'Supplier name is required';
    }

    const qty = Number(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      errors.quantity = 'Quantity must be a valid number greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Demo flow quick-fill helper (Receive 100 kg Steel Rods into Main Warehouse)
  const loadDemoFlowPreset = () => {
    const steelRod = products.find((p) => p.name.toLowerCase().includes('steel')) || products[0];
    const mainWh = locations.find((l) => l.name.toLowerCase().includes('main')) || locations[0];

    setFormData({
      productId: steelRod ? steelRod.id : '',
      destinationLocationId: mainWh ? mainWh.id : '',
      supplier: 'Tata Steel Ltd / Global Metals',
      quantity: 100,
    });
    setFormErrors({});
  };

  // Create Receipt (Status: DRAFT)
  const handleCreateReceipt = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        type: 'RECEIPT',
        productId: formData.productId,
        destinationLocationId: formData.destinationLocationId,
        sourceLocationId: null,
        supplier: formData.supplier.trim(),
        quantity: Number(formData.quantity),
        countedQuantity: null,
        status: 'DRAFT',
      };

      const newOp = await api.createOperation(payload);
      setActionSuccessMessage(`Receipt created in DRAFT status (ID: ${newOp.id || 'new'}). You can validate it now.`);
      setSelectedDraftForValidate(newOp);

      // Reset form
      setFormData({
        productId: '',
        destinationLocationId: '',
        supplier: '',
        quantity: '',
      });

      // Refresh list
      const updatedOps = await api.getOperations();
      setReceipts((updatedOps || []).filter((op) => op.type === 'RECEIPT'));
    } catch (err) {
      console.error('Failed to create receipt:', err);
      alert(`Error creating receipt: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Validate Receipt (Status: DONE)
  const handleValidateReceipt = async (receiptId) => {
    try {
      setSubmitting(true);
      const validatedOp = await api.validateOperation(receiptId);
      setActionSuccessMessage(
        `Receipt ${receiptId} successfully validated! Stock has been updated and move history recorded.`
      );
      if (selectedDraftForValidate && selectedDraftForValidate.id === receiptId) {
        setSelectedDraftForValidate(null);
      }

      // Refresh list
      const updatedOps = await api.getOperations();
      setReceipts((updatedOps || []).filter((op) => op.type === 'RECEIPT'));
    } catch (err) {
      console.error('Failed to validate receipt:', err);
      alert(`Error validating receipt: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for display
  const getProductName = (id) => {
    const prod = products.find((p) => p.id === id);
    return prod ? `${prod.name} (${prod.sku || prod.uom || ''})` : id;
  };

  const getLocationName = (id) => {
    const loc = locations.find((l) => l.id === id);
    return loc ? `${loc.name} [${loc.code || ''}]` : id;
  };

  // Filtered receipts
  const filteredReceipts = receipts.filter((r) => {
    if (filter === 'DRAFT') return r.status === 'DRAFT';
    if (filter === 'DONE') return r.status === 'DONE';
    return true;
  });

  // KPI Calculations
  const totalCount = receipts.length;
  const draftCount = receipts.filter((r) => r.status === 'DRAFT').length;
  const doneCount = receipts.filter((r) => r.status === 'DONE').length;
  const totalQtyDone = receipts
    .filter((r) => r.status === 'DONE')
    .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  if (loading) {
    return <LoadingState message="Loading Receipts operation workspace..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeading
          title="Receipts"
          description="Inbound stock operations and vendor receipt validation."
        />
        <ErrorState
          title="Failed to Load Receipts"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  // Table columns definition
  const tableColumns = [
    {
      key: 'id',
      title: 'Receipt ID',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {item.id}
        </span>
      ),
    },
    {
      key: 'productId',
      title: 'Product',
      render: (item) => (
        <span className="font-medium text-slate-900">
          {getProductName(item.productId)}
        </span>
      ),
    },
    {
      key: 'destinationLocationId',
      title: 'Destination',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Warehouse className="h-3.5 w-3.5 text-teal-600" />
          {getLocationName(item.destinationLocationId)}
        </span>
      ),
    },
    {
      key: 'supplier',
      title: 'Supplier',
      render: (item) => (
        <span className="text-slate-700">{item.supplier || '—'}</span>
      ),
    },
    {
      key: 'quantity',
      title: 'Quantity',
      align: 'right',
      render: (item) => (
        <span className="font-bold text-slate-900">
          {Number(item.quantity).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (item) => {
        if (item.status === 'DRAFT') {
          return (
            <button
              onClick={() => handleValidateReceipt(item.id)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validate
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
            Stock Updated
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <PageHeading
        title="Receipts Operation"
        description="Receive incoming stock shipments into warehouse locations. Validating transitions status from Draft to Done and updates stock."
        actions={
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Refresh
          </button>
        }
      />

      {/* Action Banner / Notification */}
      {actionSuccessMessage && (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/80 dark:bg-teal-950/40 p-4 text-sm text-teal-900 dark:text-teal-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Receipts"
          value={totalCount}
          icon={ArrowDownLeft}
          variant="navy"
          description="All recorded receipt operations"
        />
        <KpiCard
          title="Draft (Pending)"
          value={draftCount}
          icon={Clock}
          variant="amber"
          description="Awaiting receipt validation"
        />
        <KpiCard
          title="Done (Validated)"
          value={doneCount}
          icon={CheckCircle2}
          variant="teal"
          description="Stock moves applied"
        />
        <KpiCard
          title="Total Units Received"
          value={totalQtyDone.toLocaleString()}
          icon={FileCheck2}
          variant="teal"
          description="Cumulative validated quantity"
        />
      </div>

      {/* Receipt Form Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              New Receipt Operation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Draft operations do not modify stock until validated.
            </p>
          </div>

          {/* Demo Preset Button */}
          <button
            type="button"
            onClick={loadDemoFlowPreset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition"
            title="Auto-fill with Demo Flow: 100 kg Steel Rods into Main Warehouse"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            Fill Demo Flow (100 kg Steel Rods)
          </button>
        </div>

        <form onSubmit={handleCreateReceipt} className="p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Product */}
            <FormSelect
              label="Product"
              id="productId"
              required
              value={formData.productId}
              onChange={(e) => handleInputChange('productId', e.target.value)}
              placeholder="Select product..."
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.sku || p.uom || ''})`,
              }))}
              error={formErrors.productId}
            />

            {/* Destination Location */}
            <FormSelect
              label="Destination Location"
              id="destinationLocationId"
              required
              value={formData.destinationLocationId}
              onChange={(e) => handleInputChange('destinationLocationId', e.target.value)}
              placeholder="Select warehouse / rack..."
              options={locations.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.code || ''})`,
              }))}
              error={formErrors.destinationLocationId}
            />

            {/* Supplier */}
            <FormInput
              label="Supplier"
              id="supplier"
              required
              type="text"
              placeholder="e.g. Apex Steel Industries"
              value={formData.supplier}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              error={formErrors.supplier}
            />

            {/* Quantity */}
            <FormInput
              label="Quantity"
              id="quantity"
              required
              type="number"
              min="0.01"
              step="any"
              placeholder="e.g. 100"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              error={formErrors.quantity}
              helperText="Must be greater than 0"
            />
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Operation Type:</span>
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                RECEIPT
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Initial Status:</span>
              <StatusBadge status="DRAFT" />
            </div>

            <div className="flex items-center gap-3">
              {/* Optional direct validate button if a draft was just created */}
              {selectedDraftForValidate && selectedDraftForValidate.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => handleValidateReceipt(selectedDraftForValidate.id)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Validate Receipt #{selectedDraftForValidate.id}
                </button>
              )}

              {/* Create Receipt Button */}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Receipts Table Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Receipts Log</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track recent inbound inventory receipts and their validation status.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm transition-colors">
            <button
              onClick={() => setFilter('ALL')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-800 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({receipts.length})
            </button>
            <button
              onClick={() => setFilter('DRAFT')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filter === 'DRAFT'
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Drafts ({draftCount})
            </button>
            <button
              onClick={() => setFilter('DONE')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filter === 'DONE'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Done ({doneCount})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <Table
          columns={tableColumns}
          data={filteredReceipts}
          keyField="id"
          emptyMessage="No receipt operations found"
          emptyDescription="Submit the form above to record your first inbound shipment."
        />
      </div>
    </div>
  );
}
