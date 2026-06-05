declare const process: { env?: Record<string, string | undefined> } | undefined;

const ADMIN_BYPASS_CODE = process?.env?.EXPO_PUBLIC_ADMIN_BYPASS_CODE?.trim() || '';

export function isAdminBypassConfigured(): boolean {
  return ADMIN_BYPASS_CODE.length > 0;
}

export function validateAdminBypassCode(input: string): boolean {
  return isAdminBypassConfigured() && input.trim() === ADMIN_BYPASS_CODE;
}
