/**
 * analytics.ts — Event tracking stub (Phase 10)
 *
 * All events are no-ops in the free local-first build. The interface is
 * defined here so screen code can call track() freely; when a real provider
 * (Amplitude, PostHog, etc.) is wired in for the Pro tier the calls below
 * become live without any screen-level changes.
 *
 * Events follow the noun_verb convention: document_added, search_performed…
 */

export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'document_added'
  | 'document_deleted'
  | 'document_shared'
  | 'document_viewed'
  | 'bulk_delete'
  | 'bulk_move'
  | 'bulk_tag'
  | 'search_performed'
  | 'ocr_retried'
  | 'backup_created'
  | 'backup_restored'
  | 'zip_exported'
  | 'biometric_enabled'
  | 'biometric_disabled'
  | 'folder_created'
  | 'tag_added';

export type AnalyticsProperties = Record<string, string | number | boolean>;

let _enabled = false;

/** Call once on app start after user consent is confirmed. */
export function enableAnalytics(): void {
  _enabled = true;
}

export function disableAnalytics(): void {
  _enabled = false;
}

/** Fire an event. No-op when disabled or in dev. */
export function track(event: AnalyticsEvent, props?: AnalyticsProperties): void {
  if (!_enabled) return;
  // In production: AnalyticsProvider.track(event, props);
  // For now: intentional no-op stub
}

/** Identify user (Pro tier). No-op in free build. */
export function identify(_userId: string, _traits?: AnalyticsProperties): void {
  // Pro tier: AnalyticsProvider.identify(userId, traits);
}

/** Screen view tracking. */
export function screen(name: string, props?: AnalyticsProperties): void {
  track(`app_opened` as AnalyticsEvent, { screen: name, ...props });
}
