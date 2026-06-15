export const AD_AUTH_SOURCE = "ad";
export const AD_PASSWORD_HASH = "ad_synced";

export interface AdSyncResult {
  totalEntries: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  deactivated: number;
}
