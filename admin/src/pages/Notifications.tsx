import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Notification } from '../types';

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'pro'>('all');

  const load = () => {
    api.getNotifications()
      .then(r => setNotifs(r.notifications))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.broadcast({
        title: title.trim(),
        body: body.trim(),
        filter: audience === 'pro' ? { isPro: true } : undefined,
      });
      setSuccess(`Broadcast sent (ID: ${res.notificationId})`);
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Notifications</div>
        <div className="page-subtitle">Broadcast messages to users</div>
      </div>

      <div className="card">
        <div className="card-title">Send Broadcast</div>
        {error && <div className="error-box">{error}</div>}
        {success && <div className="error-box" style={{ background: '#14532D', borderColor: 'var(--success)', color: 'var(--success)' }}>{success}</div>}
        <form onSubmit={send}>
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Notification body text…" />
          </div>
          <div className="form-group">
            <label>Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value as 'all' | 'pro')}>
              <option value="all">All users</option>
              <option value="pro">Pro users only</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Broadcast History</div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">No broadcasts sent this session.<br /><small>History resets when the server restarts.</small></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Body</th><th>Audience</th><th>Sent</th></tr></thead>
              <tbody>
                {notifs.map(n => (
                  <tr key={n.id}>
                    <td className="primary">{n.title}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</td>
                    <td>
                      <span className={`badge ${n.filter?.isPro ? 'badge-amber' : 'badge-gray'}`}>
                        {n.filter?.isPro ? 'Pro only' : 'All users'}
                      </span>
                    </td>
                    <td>{new Date(n.sentAt).toLocaleString()}</td>
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
