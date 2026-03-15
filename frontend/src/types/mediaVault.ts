export interface MediaVault {
  id: number;
  base_filename: string;
  file_type: 'image' | 'video';
  is_usable: boolean;
  created_at: string;
  updated_at: string;
  latest_version?: MediaVersion;
  versions?: MediaVersion[];
  version_count?: number;
  enhancement_tags?: EnhancementTag[];
  style_tags?: StyleTag[];
  platform_tags?: PlatformTag[];
}

export interface MediaVersion {
  id: number;
  media_vault_id: number;
  filename: string;
  file_path: string;
  thumbnail_path: string;
  file_size: number;
  upload_date: string;
  is_active: boolean;
  enhancement_tags?: EnhancementTag[];
}

export interface EnhancementTag {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface StyleTag {
  id: number;
  name: string;
  progression_stage: number;
  description?: string;
  color: string;
  created_at: string;
}

export interface PlatformTag {
  id: number;
  name: string;
  icon?: string;
  color: string;
  created_at: string;
}

export interface MediaVaultFilters {
  searchTerm: string;
  enhancementTags: number[];
  styleTags: number[];
  platformTags: number[];
  dateRange: [Date, Date] | null;
  showUsableOnly: boolean;
}

export interface MediaVaultListResponse {
  media: MediaVault[];
  total: number;
  skip: number;
  limit: number;
}
