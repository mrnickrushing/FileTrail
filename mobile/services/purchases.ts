/**
 * purchases.ts — RevenueCat integration via react-native-purchases
 *
 * Initializes RevenueCat with the iOS key from EXPO_PUBLIC_REVENUECAT_IOS_KEY.
 * In development (no key set), entitlement checks return false so the paywall shows.
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

let _initialized = false;

export function initializePurchases(): void {
  if (_initialized || !IOS_KEY) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: IOS_KEY });
    _initialized = true;
  } catch (err) {
    console.warn('[Purchases] configure error:', err);
  }
}

/** Returns true if the user has the "pro" entitlement. */
export async function checkProEntitlement(): Promise<boolean> {
  if (!_initialized) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}

/** Purchases the first available package in the "pro" offering. */
export async function purchasePro(): Promise<boolean> {
  if (!_initialized) return false;
  try {
    const offerings = await Purchases.getOfferings();
    const proOffering = offerings.all['pro'] ?? offerings.current;
    if (!proOffering || proOffering.availablePackages.length === 0) return false;
    const pkg = proOffering.availablePackages[0];
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}

/** Restores purchases and returns whether the user has the "pro" entitlement. */
export async function restorePurchases(): Promise<boolean> {
  if (!_initialized) return false;
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}
