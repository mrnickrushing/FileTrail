import { useState, useEffect } from 'react';
import { api } from '../api';
import type { ShareLink } from '../types';

export default function ShareLinks() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ShareLink | null>(null);

  const load = () => {
    api.listShareLinks()
      .then(r => setLinks(r.shareLinks))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const revoke = async () => {
    if (!confirmRevoke) return;
    setRevoking(confirmRevoke.token);
    try {
      await api.deleteShareLink(confirmRevoke.token);
      setLinks(prev => prev.filter(l => l.token !== confirmRevoke.token));
      setConfirmRevoke(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return <div className="loading">Loading share links…</div>;

  const active = links.filter(l => !l.expired).length;
  const expired = links.filter(l => l.expired).length;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Share Links</div>
        <div className="page-subtitle">{active} active · {expired} expired</div>
      </div>

      {error && <div className="error-box" onClick={() => setError('')}>{error} ✕</div>}

      <div className="card">
        {links.length === 0 ? (
          <div className="empty-state">No share links created yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Document</th><th>Token</th><th>Password</th><th>Status</th><th>Expires</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {links.map(link => {
                  const exp = new Date(link.expiresAt) <= new Date();
                  return (
                    <tr key={link.token}>
                      <td className="primary" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {link.title || link.documentId.slice(0, 10) + '…'}
                      </td>
                      <td className="mono">{link.token.slice(0, 10)}…</td>
                      <td>
                        <span className={`badge ${link.passwordProtected ? 'badge-amber' : 'badge-gray'}`}>
                          {link.passwordProtected ? 'Protected' : 'Open'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${exp ? 'badge-red' : 'badge-green'}`}>
                          {exp ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td>{new Date(link.expiresAt).toLocaleDateString()}</td>
                      <td>{new Date(link.createdAt).toLocaleDateString()}</td>
                      <td>
                        {!exp && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmRevoke(link)}
                            disabled={revoking === link.token}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmRevoke && (
        <div className="modal-backdrop" onClick={() => setConfirmRevoke(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Revoke share link?</div>
            <div className="modal-body">
              This will permanently delete the share link for <strong>{confirmRevoke.title || 'this document'}</strong>.
              Anyone with the link will no longer be able to access it.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmRevoke(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={revoke}
                disabled={!!revoking}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
