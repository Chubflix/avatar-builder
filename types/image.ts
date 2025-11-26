type ImageTransientFields = {
    url?: string | null;
    base64?: string | null;
    filename?: string | null;
}

export type Image = {
  id?: string | null; // optional when used as transient input
  storage_path?: string | null; // S3 key if persisted
  width?: number | null;
  height?: number | null;
  info_json?: Record<string, any> | null;
} & ImageTransientFields;
