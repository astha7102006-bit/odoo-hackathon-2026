import React, { useEffect, useState } from 'react';
import {
  Package,
  Warehouse,
  ArrowDownLeft,
  History,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import PageHeading from '../components/PageHeading';
import KpiCard from '../components/KpiCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { api } from '../services/api';

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashData, stockData, locations, operations, products] = await Promise.all([
          api.getDashboard(),
          api.getStock(),
          api.getLocations(),
          api.getOperations(),
          api.getProducts(),
        ]);
        setData({ ...dashData, stock: stockData, locations, operations, products });
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err.message || 'Dashboard could not connect to the backend.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading StockSense Dashboard..." />;
  }

  if (error) return <ErrorState title="Dashboard unavailable" message={error} onRetry={() => window.location.reload()} />;

  const locationItems = (name) => {
    const location = (data?.locations || []).find((item) => item.name?.toLowerCase() === name.toLowerCase());
    return (data?.stock || []).filter((item) => item.locationId === location?.id && Number(item.quantity) > 0);
  };
  const recommendations = (data?.products || []).map((product) => {
    const total = (data?.stock || []).filter((row) => row.productId === product.id)
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const threshold = Number(product.reorderLevel || 0);
    return { ...product, total, threshold, suggested: Math.max(0, Math.max(threshold * 2, 1) - total) };
  }).filter((product) => product.total <= product.threshold)
    .sort((a, b) => a.total - b.total);
  const completed = new Set((data?.operations || []).filter((op) => op.status === 'DONE').map((op) => op.type));
  const nextStep = !completed.has('RECEIPT')
    ? { title: 'Receive 100 kg Steel Rods', description: 'Receive stock into Main Warehouse and validate the receipt.', nav: 'receipts', button: 'Open Receipts' }
    : !completed.has('TRANSFER')
      ? { title: 'Transfer 30 kg to Production Rack', description: 'Move stock from Main Warehouse and validate the transfer.', nav: 'operations', button: 'Open Operations' }
      : !completed.has('DELIVERY')
        ? { title: 'Deliver 10 kg from Production Rack', description: 'Create and validate the customer delivery.', nav: 'operations', button: 'Open Operations' }
        : !completed.has('ADJUSTMENT')
          ? { title: 'Count 18 kg at Production Rack', description: 'Record the physical count and validate the adjustment.', nav: 'operations', button: 'Open Operations' }
          : { title: 'Demo flow complete', description: 'Review current stock and all four audit records in Move History.', nav: 'moves', button: 'View Move History' };

  return (
    <div className="space-y-6">
      <PageHeading
        title="StockSense Dashboard"
        description="Real-time inventory intelligence, demo flow milestones, and operations overview."
        actions={
          <button
            onClick={() => onNavigate('receipts')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <ArrowDownLeft className="h-4 w-4" />
            New Receipt Operation
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Catalog Products"
          value={data?.totalProducts ?? 0}
          icon={Package}
          variant="navy"
          description="Tracked SKUs in warehouse"
        />
        <KpiCard
          title="Active Locations"
          value={data?.totalLocations ?? 0}
          icon={Warehouse}
          variant="teal"
          description="Main Warehouse & Production Racks"
        />
        <KpiCard
          title="Receipt Operations"
          value={data?.totalReceipts ?? 0}
          icon={ArrowDownLeft}
          variant="teal"
          description={`${data?.pendingDrafts ?? 0} drafts pending validation`}
        />
        <KpiCard
          title="Validated Operations"
          value={data?.validatedDone ?? 0}
          icon={CheckCircle2}
          variant="amber"
          description="Stock moves committed"
        />
      </div>

      {/* Demo Flow Tracker Banner */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-900 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-semibold text-teal-300 ring-1 ring-inset ring-teal-500/30">
              <TrendingUp className="h-3.5 w-3.5" />
              StockSense Demo Flow
            </div>
            <h3 className="text-xl font-bold tracking-tight">{nextStep.title}</h3>
            <p className="text-sm text-slate-300 max-w-2xl">
              {nextStep.description}
            </p>
          </div>
          <button
            onClick={() => onNavigate(nextStep.nav)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-teal-400"
          >
            {nextStep.button}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rule-based restock guidance based on live catalog and balances */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Smart Restock Plan</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">Live rule: when total stock reaches the reorder level, suggest enough to reach twice that level.</p>
          </div>
          <span className="rounded-full bg-amber-200/70 px-3 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-900/50 dark:text-amber-100">{recommendations.length} items to review</span>
        </div>
        {recommendations.length === 0 ? <p className="text-sm text-emerald-700 dark:text-emerald-300">Stock is above all configured reorder levels.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.slice(0, 4).map((product) => (
              <div key={product.id} className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-900 dark:text-white">{product.name}</strong><span className="text-xs font-bold text-amber-800 dark:text-amber-300">Suggested: +{product.suggested} {product.uom}</span></div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">On hand: {product.total} {product.uom} · Reorder level: {product.threshold} {product.uom}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stock Overview Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Current Stock Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stock levels across Main Warehouse and Production Rack.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Main Warehouse (WH-MAIN)</span>
              <span className="rounded bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-300">{locationItems('Main Warehouse').length} stocked products</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {locationItems('Main Warehouse').map((item) => <span key={item.productId} className="mr-3 inline-block">{item.productName}: {item.quantity} {item.uom}</span>)}
              {locationItems('Main Warehouse').length === 0 && 'No stock at this location yet.'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Production Rack (RACK-PROD)</span>
              <span className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">{locationItems('Production Rack').length} stocked products</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {locationItems('Production Rack').map((item) => <span key={item.productId} className="mr-3 inline-block">{item.productName}: {item.quantity} {item.uom}</span>)}
              {locationItems('Production Rack').length === 0 && 'No stock at this location yet.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
