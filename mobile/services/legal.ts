/**
 * legal.ts — Canonical links to the hosted Privacy Policy and Terms of Use.
 *
 * Required in the subscription purchase flow (App Store Review Guideline
 * 3.1.2(c)) and surfaced in Settings for general visibility.
 */

const MARKETING_BASE_URL = 'https://marketing-production-5aa0.up.railway.app';

export const PRIVACY_POLICY_URL = `${MARKETING_BASE_URL}/privacy`;
export const TERMS_OF_USE_URL = `${MARKETING_BASE_URL}/terms`;
