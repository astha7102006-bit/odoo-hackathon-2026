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
import { api } from '../services/api';

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashData, stockData] = await Promise.all([
          api.getDashboard(),
          api.getStock(),
        ]);
        setData({ ...dashData, stock: stockData });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading StockSense Dashboard..." />;
  }

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
          value={data?.totalProducts || 3}
          icon={Package}
          variant="navy"
          description="Tracked SKUs in warehouse"
        />
        <KpiCard
          title="Active Locations"
          value={data?.totalLocations || 3}
          icon={Warehouse}
          variant="teal"
          description="Main Warehouse & Production Racks"
        />
        <KpiCard
          title="Receipt Operations"
          value={data?.totalReceipts || 1}
          icon={ArrowDownLeft}
          variant="teal"
          description={`${data?.pendingDrafts || 0} drafts pending validation`}
        />
        <KpiCard
          title="Validated Operations"
          value={data?.validatedDone || 0}
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
              README Hackathon Flow
            </div>
            <h3 className="text-xl font-bold tracking-tight">First Demo Operation: Receive 100 kg Steel Rods</h3>
            <p className="text-sm text-slate-300 max-w-2xl">
              Execute Step 1 of the demo flow: Record receipt of 100 kg Steel Rods into Main Warehouse. Validate it to verify stock increases and move history is created.
            </p>
          </div>
          <button
            onClick={() => onNavigate('receipts')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-teal-400"
          >
            Open Receipts Form
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stock Overview Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Stock Summary</h3>
            <p className="text-xs text-slate-500">
              Stock levels across Main Warehouse and Production Rack.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">GET /api/stock</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Main Warehouse (WH-MAIN)</span>
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                {data?.stock?.find((s) => s.locationId === 'loc-1')?.quantity || 0} kg
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Target for Demo Step 1: 100 kg Steel Rods. (Expected Final: 70 kg)
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Production Rack (RACK-PROD)</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                {data?.stock?.find((s) => s.locationId === 'loc-2')?.quantity || 0} kg
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Target for Demo Step 2: Transfer 30 kg. (Expected Final: 18 kg)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
