export interface Post {
  id: number;
  caption?: string;
  stage: 'draft' | 'framed' | 'detailed' | 'done';
  is_posted: boolean;
  first_posted_at?: string;
  first_platform_id?: number;
  created_at: string;
  updated_at: string;
  media_files?: MediaFile[];
}

export interface PostList {
  id: number;
  caption?: string;
  stage: 'draft' | 'framed' | 'detailed' | 'done';
  is_posted: boolean;
  created_at: string;
  media_count: number;
}

export interface MediaFile {
  id: number;
  post_id: number;
  base_filename: string;
  file_extension: string;
  original_path: string;
  framed_path?: string;
  detailed_path?: string;
  original_thumbnail_path?: string;
  thumbnail_path?: string;
  framed_thumbnail_path?: string;
  detailed_thumbnail_path?: string;
  file_type: 'image' | 'video';
  order_index: number;
}

export interface StageFile {
  id: number;
  filename: string;
  path: string;
  thumbnail_path?: string;
  file_type: 'image' | 'video';
}

export interface FileValidationRequest {
  filename: string;
  target_stage: string;
}

export interface FileValidationResponse {
  valid: boolean;
  stage_files: StageFile[];
  requires_action: boolean;
}
