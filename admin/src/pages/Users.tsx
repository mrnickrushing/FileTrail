import { useState, useEffect } from 'react';
import { api } from '../api';
import type { User } from '../types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.listUsers()
      .then(r => { setUsers(r.users); setFiltered(r.users); })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? users.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ) : users);
  }, [search, users]);

  const togglePro = async (user: User) => {
    setActionLoading(user.id);
    try {
      const res = await api.updateUser(user.id, { isPro: !user.isPro });
      setUsers(prev => prev.map(u => u.id === user.id ? res.user : u));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(deleteConfirm.id);
    try {
      await api.deleteUser(deleteConfirm.id);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading">Loading users…</div>;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Users</div>
        <div className="page-subtitle">{users.length} registered accounts</div>
      </div>

      {error && <div className="error-box" onClick={() => setError('')}>{error} ✕</div>}

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">No users found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Provider</th>
                  <th>Pro</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id}>
                    <td className="primary">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.provider === 'apple' ? 'badge-blue' : 'badge-gray'}`}>
                        {user.provider === 'apple' ? '⊕ Apple' : '✉ Email'}
                      </span>
                    </td>
                    <td>
                      <label className="toggle" title={user.isPro ? 'Revoke Pro' : 'Grant Pro'}>
                        <input
                          type="checkbox"
                          checked={user.isPro}
                          disabled={actionLoading === user.id}
                          onChange={() => togglePro(user)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                      </label>
                    </td>
                    <td>{fmtDate(user.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteConfirm(user)}
                        disabled={actionLoading === user.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete user?</div>
            <div className="modal-body">
              This will permanently delete <strong>{deleteConfirm.fullName}</strong> ({deleteConfirm.email}).
              Their synced documents will remain in the backend. This cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={confirmDelete}
                disabled={!!actionLoading}
              >
                {actionLoading ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
