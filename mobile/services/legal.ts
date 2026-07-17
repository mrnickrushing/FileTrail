/**
 * legal.ts — Canonical links to the hosted Privacy Policy and Terms of Use.
 *
 * Required in the subscription purchase flow (App Store Review Guideline
 * 3.1.2(c)) and surfaced in Settings for general visibility.
 */

// Branded domain — the same host used for the App Store Connect metadata
// (privacy policy URL, marketing URL, support URL), so the in-app links and
// the store listing stay consistent for App Review.
const MARKETING_BASE_URL = 'https://papertrail.rushingtechnologies.com';

export const PRIVACY_POLICY_URL = `${MARKETING_BASE_URL}/privacy`;
export const TERMS_OF_USE_URL = `${MARKETING_BASE_URL}/terms`;
