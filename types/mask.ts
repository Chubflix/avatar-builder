type MaskTransientFields = {
    base64?: string | null;
}

export type Mask = {
  id?: string | null; // database id
  storage_path?: string | null;
  width?: number | null;
  height?: number | null;
  info_json?: Record<string, any> | null;
} & MaskTransientFields;
