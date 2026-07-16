import { getHealth, getConfig, getAdminStats } from '@/lib/api';
import styles from './overview.module.css';

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

async function fetchDashboardData() {
  try {
    const [health, config, stats] = await Promise.all([
      getHealth(),
      getConfig(),
      getAdminStats(),
    ]);
    return { health, config, stats, error: null };
  } catch (e) {
    return { health: null, config: null, stats: null, error: String(e) };
  }
}

export default async function OverviewPage() {
  const { health, config, stats, error } = await fetchDashboardData();

  return (
    <div>
      <h1 className={styles.pageTitle}>Overview</h1>
      <p className={styles.pageSubtitle}>Live status from the FileTrail backend</p>

      {error && (
        <div className={styles.errorBanner}>
          <strong>Backend unreachable:</strong> {error}
        </div>
      )}

      {/* Status cards */}
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Backend status</div>
          <div className={`${styles.cardValue} ${health?.ok ? styles.success : styles.danger}`}>
            {health ? (health.ok ? '● Online' : '● Error') : '○ Offline'}
          </div>
          {health?.time && <div className={styles.cardMeta}>{new Date(health.time).toLocaleString()}</div>}
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Users</div>
          <div className={styles.cardValue}>{stats?.userCount ?? '—'}</div>
          {typeof stats?.recentActiveUsers === 'number' && (
            <div className={styles.cardMeta}>{stats.recentActiveUsers} active recently</div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Documents</div>
          <div className={styles.cardValue}>{stats?.documentCount ?? '—'}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Storage used</div>
          <div className={styles.cardValue}>{stats ? formatBytes(stats.totalStorageBytes) : '—'}</div>
          {typeof stats?.eventCount === 'number' && (
            <div className={styles.cardMeta}>{stats.eventCount} analytics events</div>
          )}
        </div>
      </div>

      {/* Integrations */}
      {config && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Integrations</h2>
          <div className={styles.badgeGrid}>
            {Object.entries(config.integrations).map(([key, enabled]) => (
              <div key={key} className={`${styles.integBadge} ${enabled ? styles.integOn : styles.integOff}`}>
                <span>{enabled ? '✓' : '○'}</span> {key}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature flags */}
      {config && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Feature flags</h2>
          <div className={styles.badgeGrid}>
            {Object.entries(config.features).map(([key, enabled]) => (
              <div key={key} className={`${styles.integBadge} ${enabled ? styles.integOn : styles.integOff}`}>
                <span>{enabled ? '✓' : '○'}</span> {key}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
