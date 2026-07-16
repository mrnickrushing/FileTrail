'use client';

import { useTransition } from 'react';
import styles from './users.module.css';

interface Props {
  userId: string;
  isPro: boolean;
  onToggle: (id: string, isPro: boolean) => Promise<void>;
}

export function ProToggle({ userId, isPro, onToggle }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={`${styles.proToggle} ${isPro ? styles.proToggleOn : styles.proToggleOff}`}
      disabled={isPending}
      aria-pressed={isPro}
      title={isPro ? 'Pro enabled — click to revoke' : 'Free — click to grant Pro'}
      onClick={() => startTransition(async () => { await onToggle(userId, !isPro); })}
    >
      {isPending ? '…' : isPro ? 'Pro ✓' : 'Free'}
    </button>
  );
}
