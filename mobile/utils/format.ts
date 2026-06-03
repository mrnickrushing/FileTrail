import { formatDistanceToNow, format } from 'date-fns';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeDate(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  return formatDistanceToNow(new Date(ms), { addSuffix: true });
}

export function formatDate(ms: number): string {
  return format(new Date(ms), 'MMM d, yyyy');
}
