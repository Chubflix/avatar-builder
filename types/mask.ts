export type Mask = {
  id?: string | null; // database id
  storage_path?: string | null;
  base64?: string | null; // transient, not stored in DB
  width?: number | null;
  height?: number | null;
  info_json?: Record<string, any> | null;
};
