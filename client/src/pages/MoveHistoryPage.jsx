import React, { useEffect, useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import PageHeading from '../components/PageHeading';
import Table from '../components/Table';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { api } from '../services/api';

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getMoves(), api.getLocations()])
      .then(([data, locs]) => { setMoves(data || []); setLocations(locs || []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  const locationName = (id) => locations.find((loc) => loc.id === id)?.name || '—';

  const columns = [
    { key: 'id', title: 'Move ID', render: (m) => <span className="font-mono text-xs">{m.id}</span> },
    { key: 'operationId', title: 'Operation Ref', render: (m) => <span className="font-mono text-xs text-teal-700">{m.operationId}</span> },
    { key: 'type', title: 'Move Type', render: (m) => <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">{m.type}</span> },
    { key: 'quantity', title: 'Quantity', align: 'right', render: (m) => <span className="font-bold">{m.quantity}</span> },
    { key: 'destinationLocationId', title: 'Route / Location', render: (m) => <span className="text-xs">{m.type === 'ADJUSTMENT' ? locationName(m.destinationLocationId) : `${locationName(m.sourceLocationId)} → ${m.type === 'DELIVERY' ? 'Customer' : locationName(m.destinationLocationId)}`}{m.type === 'ADJUSTMENT' ? ` (difference ${m.difference > 0 ? '+' : ''}${m.difference})` : ''}</span> },
    { key: 'timestamp', title: 'Date / Time', render: (m) => <span className="text-xs text-slate-500">{new Date(m.timestamp).toLocaleString()}</span> },
  ];

  if (loading) return <LoadingState message="Loading Move History..." />;
  if (error) return <ErrorState title="Move History unavailable" message={error} onRetry={() => window.location.reload()} />;

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
