import { useState, useEffect } from 'react';
import { api } from '../api';
import type { AnalyticsEvent } from '../types';

export default function Analytics() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAnalytics()
      .then(r => setEvents(r.events))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const eventTypes = Array.from(new Set(events.map(e => e.event))).sort();
  const shown = filter ? events.filter(e => e.event === filter) : events;

  if (loading) return <div className="loading">Loading analytics…</div>;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-subtitle">{events.length} events total</div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 220 }}>
            <option value="">All event types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="toolbar-spacer" />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{shown.length} events</span>
        </div>

        {shown.length === 0 ? (
          <div className="empty-state">No events to display.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Event</th><th>User ID</th><th>Device ID</th><th>Time</th></tr>
              </thead>
              <tbody>
                {shown.map(e => (
                  <tr key={e.id}>
                    <td className="primary">{e.event}</td>
                    <td className="mono">{e.userId ? e.userId.slice(0, 12) + '…' : '—'}</td>
                    <td className="mono">{e.deviceId ? e.deviceId.slice(0, 12) + '…' : '—'}</td>
                    <td>{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
