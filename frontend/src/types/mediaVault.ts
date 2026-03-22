export interface MediaVault {
  id: number;
  baseFilename: string;
  fileType: 'image' | 'video';
  isUsable: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion?: MediaVersion;
  versions?: MediaVersion[];
  versionCount?: number;
  enhancementTags?: EnhancementTag[];
  contentTypes?: ContentType[];
  platformTags?: PlatformTag[];
}

export interface MediaVersion {
  id: number;
  mediaVaultId: number;
  parentVersionId?: number | null;
  sequenceOrder?: number;
  filename: string;
  filePath: string;
  thumbnailPath: string;
  fileSize: number;
  uploadDate: string;
  isActive: boolean;
  enhancementTags?: EnhancementTag[];
}

export interface EnhancementTag {
  id: number;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  notes?: string; // For invalid tags to store the actual tag name (e.g., "v1", "v2")
}

export interface ContentType {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  hasPhases: boolean;
  phaseNumber?: number;
  phaseName?: string;
  phaseColor?: string;
  isPhase: boolean;
  isParent: boolean;
  displayName: string;
  effectiveColor: string;
  parentContentTypeId?: number;
  parent?: ContentType; // Parent content type if this is a phase
  phases?: ContentType[];
  createdAt: string;
}

export interface PlatformTag {
  id: number;
  name: string;
  icon?: string;
  color: string;
  createdAt: string;
}

export interface MediaVaultFilters {
  searchTerm: string;
  enhancementTags: number[];
  contentTypeTags: number[];
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
