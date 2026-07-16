import { getAdminStats } from '@/lib/api';
import styles from './sync.module.css';

export const revalidate = 0;

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

export default async function SyncPage() {
  let data: Awaited<ReturnType<typeof getAdminStats>> | null = null;
  let error = '';
  try {
    data = await getAdminStats();
  } catch (e) {
    error = String(e);
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Backend Data</h1>
      <p className={styles.pageSubtitle}>
        Aggregate stats across all synced accounts. Individual documents are
        tied to each user&apos;s storage token and are not exposed to the admin
        panel.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {data && (
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Users</div>
            <div className={styles.statValue}>{data.userCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Documents</div>
            <div className={styles.statValue}>{data.documentCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Storage used</div>
            <div className={styles.statValue}>{formatBytes(data.totalStorageBytes)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Analytics events</div>
            <div className={styles.statValue}>{data.eventCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Active recently</div>
            <div className={styles.statValue}>{data.recentActiveUsers}</div>
          </div>
        </div>
      )}
    </div>
  );
}
