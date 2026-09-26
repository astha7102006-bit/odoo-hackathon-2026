import React, { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import PageHeading from '../components/PageHeading';
import Table from '../components/Table';
import LoadingState from '../components/LoadingState';
import { api } from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts()
      .then((data) => setProducts(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'id', title: 'Product ID' },
    { key: 'name', title: 'Product Name', cellClassName: 'font-semibold text-slate-900' },
    { key: 'sku', title: 'SKU / Code', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
    { key: 'uom', title: 'Unit of Measure', render: (item) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{item.uom}</span> },
  ];

  if (loading) return <LoadingState message="Loading Products..." />;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Products Catalog"
        description="Master inventory items registered for stock operations."
      />
      <Table
        columns={columns}
        data={products}
        emptyMessage="No products found"
        emptyDescription="Inventory items will appear here."
      />
    </div>
  );
}
