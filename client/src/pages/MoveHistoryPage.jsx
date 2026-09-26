import React, { useEffect, useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import PageHeading from '../components/PageHeading';
import Table from '../components/Table';
import LoadingState from '../components/LoadingState';
import { api } from '../services/api';

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMoves()
      .then((data) => setMoves(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'id', title: 'Move ID', render: (m) => <span className="font-mono text-xs">{m.id}</span> },
    { key: 'operationId', title: 'Operation Ref', render: (m) => <span className="font-mono text-xs text-teal-700">{m.operationId}</span> },
    { key: 'type', title: 'Move Type', render: (m) => <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">{m.type}</span> },
    { key: 'quantity', title: 'Quantity', align: 'right', render: (m) => <span className="font-bold">{m.quantity}</span> },
    { key: 'destinationLocationId', title: 'Destination', render: (m) => <span className="text-xs">{m.destinationLocationId || '—'}</span> },
    { key: 'timestamp', title: 'Date / Time', render: (m) => <span className="text-xs text-slate-500">{new Date(m.timestamp).toLocaleString()}</span> },
  ];

  if (loading) return <LoadingState message="Loading Move History..." />;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Move History"
        description="Audit log generated whenever an operation transitions to Done."
      />
      <Table
        columns={columns}
        data={moves}
        emptyMessage="No move history entries yet"
        emptyDescription="Validating an operation changes stock once and creates one move-history entry."
      />
    </div>
  );
}
