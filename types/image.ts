export type Image = {
  id?: string | null; // optional when used as transient input
  storage_path?: string | null; // S3 key if persisted
  base64?: string | null; // transient client-side data URL/base64 (not stored in DB)
  width?: number | null;
  height?: number | null;
  info_json?: Record<string, any> | null;
  url?: string | null; // transient, not stored in DB
};
