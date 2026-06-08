import { useState, useEffect } from 'react';
import { api } from '../api';
import type { AdminStats, AnalyticsEvent, Notification } from '../types';

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStats(),
      api.getAnalytics(),
      api.getNotifications(),
    ]).then(([s, e, n]) => {
      setStats(s);
      setEvents(e.events.slice(0, 15));
      setNotifs(n.notifications.slice(0, 5));
    }).catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">FileTrail system overview</div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.userCount.toLocaleString()}</div>
            <div className="stat-sub">{stats.recentActiveUsers} active last 30d</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Documents</div>
            <div className="stat-value">{stats.documentCount.toLocaleString()}</div>
            <div className="stat-sub">Synced metadata</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Storage</div>
            <div className="stat-value">{fmtBytes(stats.totalStorageBytes)}</div>
            <div className="stat-sub">Sum of reported file sizes</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Analytics Events</div>
            <div className="stat-value">{stats.eventCount.toLocaleString()}</div>
            <div className="stat-sub">All time</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">Recent Activity</div>
          {events.length === 0 ? (
            <div className="empty-state">No analytics events yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Event</th><th>Time</th></tr></thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td className="primary">{e.event}</td>
                      <td>{fmtDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Recent Broadcasts</div>
          {notifs.length === 0 ? (
            <div className="empty-state">No notifications sent yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Sent</th></tr></thead>
                <tbody>
                  {notifs.map(n => (
                    <tr key={n.id}>
                      <td className="primary">{n.title}</td>
                      <td>{fmtDate(n.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
