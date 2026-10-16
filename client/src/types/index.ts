export type ScanType = 'file' | 'url' | 'hash';

export type ScanState =
  | 'uploading'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'not_found'
  | 'failed'
  | 'timeout'
  | 'cancelled';

export type Verdict = 'danger' | 'warning' | 'clean';

export type VendorCategory =
  | 'malicious'
  | 'suspicious'
  | 'harmless'
  | 'undetected'
  | 'timeout'
  | 'confirmed-timeout'
  | 'failure'
  | 'type-unsupported';

export interface VendorResult {
  engine_name: string;
  category: VendorCategory;
  result: string | null;
  method?: string;
  engine_version?: string;
  engine_update?: string;
}

export interface ScanStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  timeout: number;
  failure: number;
  unsupported: number;
}

export interface ItemMeta {
  size?: number;
  type_description?: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  names?: string[];
  first_submission_date?: number;
  last_analysis_date?: number;
  url?: string;
  final_url?: string;
  domain?: string;
  http_response_code?: number;
  title?: string;
  categories?: Record<string, string>;
  [key: string]: unknown;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  type: ScanType;
  item_label: string;
  item_sha256?: string | null;
  vt_analysis_id?: string | null;
  state: ScanState;
  verdict?: Verdict | null;
  stats?: ScanStats | null;
  vendor_results?: VendorResult[] | null;
  item_meta?: ItemMeta | null;
  raw_payload?: unknown;
  error_code?: string | null;
  last_polled_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface UserSettings {
  user_id: string;
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  language: 'id' | 'en';
  default_tab: 'file' | 'url' | 'hash' | 'history';
  danger_threshold: number;
  show_upload_warning: boolean;
  auto_open_report: boolean;
  history_retention_days: number | null;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  created_at?: string;
}
