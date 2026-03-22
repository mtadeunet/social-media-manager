import { EnhancementTag, MediaVault, MediaVaultListResponse, PlatformTag } from '../types/mediaVault';
import api from './api';

export const mediaVaultService = {
  // Media Vault operations
  async uploadMedia(file: File, enhancementTags?: number[]): Promise<MediaVault> {
    const formData = new FormData();
    formData.append('file', file);
    if (enhancementTags && enhancementTags.length > 0) {
      formData.append('enhancement_tags', enhancementTags.join(','));
    }
    const response = await api.post('/media-vault/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async listMedia(
    skip: number = 0,
    limit: number = 50,
    search?: string,
    usableOnly?: boolean
  ): Promise<MediaVaultListResponse> {
    const params: any = { skip, limit };
    if (search) params.search = search;
    if (usableOnly) params.usable_only = usableOnly;
    const response = await api.get('/media-vault/', { params });
    return response.data;
  },

  async getMedia(mediaId: number): Promise<MediaVault> {
    const response = await api.get(`/media-vault/${mediaId}`);
    return response.data;
  },

  async toggleUsability(mediaId: number): Promise<{ id: number; is_usable: boolean; message: string }> {
    const response = await api.put(`/media-vault/${mediaId}/usable`);
    return response.data;
  },

  async deleteMedia(mediaId: number): Promise<{ message: string }> {
    const response = await api.delete(`/media-vault/${mediaId}`);
    return response.data;
  },

  async updateMediaContentTypes(mediaId: number, data: { contentTypes: number[] }): Promise<{ message: string }> {
    const response = await api.put(`/media-vault/${mediaId}/content-types`, data);
    return response.data;
  },

  // Batch update content types for multiple media
  async batchUpdateContentTypes(mediaIds: number[], contentTypes: number[]): Promise<{ message: string }> {
    const response = await api.post('/media-vault/batch-update-content-types', { mediaIds, contentTypes });
    return response.data;
  },

  // Version operations
  async addVersion(mediaId: number, file: File, enhancementTags?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (enhancementTags) {
      formData.append('enhancement_tags', enhancementTags);
    }
    const response = await api.post(`/media-vault/${mediaId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteVersion(mediaId: number, versionId: number): Promise<{ message: string }> {
    const response = await api.delete(`/media-vault/${mediaId}/versions/${versionId}`);
    return response.data;
  },

  async getMediaVersions(mediaId: number): Promise<{ versions: any[] }> {
    const response = await api.get(`/media-vault/${mediaId}`);
    // The response contains a media item with versions array
    return { versions: response.data.versions || [] };
  },

  async updateVersionTags(
    versionId: number,
    options: {
      tagsToAdd?: number[];
      tagsToRemove?: number[];
      invalidTagsToRemove?: string[];
    }
  ): Promise<void> {
    const payload: any = {};

    if (options.tagsToAdd) {
      payload.tags_to_add = options.tagsToAdd;
    }
    if (options.tagsToRemove) {
      payload.tags_to_remove = options.tagsToRemove;
    }
    if (options.invalidTagsToRemove) {
      payload.invalid_tags_to_remove = options.invalidTagsToRemove;
    }

    await api.put(`/media-vault/versions/${versionId}/tags`, payload);
  },

  async moveVersion(
    mediaId: number,
    versionId: number,
    newParentId?: number
  ): Promise<void> {
    const payload = newParentId !== undefined ? { new_parent_id: newParentId } : {};
    console.log('moveVersion API call:', {
      url: `/media-vault/${mediaId}/versions/${versionId}/move`,
      payload: JSON.stringify(payload),
      newParentId,
      typeofNewParentId: typeof newParentId
    });
    await api.put(`/media-vault/${mediaId}/versions/${versionId}/move`, payload);
  },

  async reorderVersions(mediaId: number, versionIds: number[]): Promise<void> {
    await api.put(`/media-vault/${mediaId}/versions/reorder`, versionIds);
  },

  async updateFilename(
    mediaId: number,
    newBaseFilename: string
  ): Promise<{ message: string; old_filename: string; new_filename: string }> {
    const response = await api.put(`/media-vault/${mediaId}/filename`, { new_base_filename: newBaseFilename });
    return response.data;
  },

  // Tag operations
  async listEnhancementTags(): Promise<EnhancementTag[]> {
    const response = await api.get('/tags/enhancement');
    return response.data;
  },

  async createEnhancementTag(name: string, description?: string, color?: string): Promise<EnhancementTag> {
    const response = await api.post('/tags/enhancement', { name, description, color });
    return response.data;
  },

  async updateEnhancementTag(
    tagId: number,
    updates: { name?: string; description?: string; color?: string }
  ): Promise<EnhancementTag> {
    const response = await api.put(`/tags/enhancement/${tagId}`, updates);
    return response.data;
  },

  async deleteEnhancementTag(tagId: number): Promise<{ message: string }> {
    const response = await api.delete(`/tags/enhancement/${tagId}`);
    return response.data;
  },

  // Style tag methods removed - replaced by ContentTypeTag system
  // Use contentTypeService instead for content type management

  async listPlatformTags(): Promise<PlatformTag[]> {
    const response = await api.get('/tags/platform');
    return response.data;
  },

  async createPlatformTag(name: string, icon?: string, color?: string): Promise<PlatformTag> {
    const response = await api.post('/tags/platform', { name, icon, color });
    return response.data;
  },

  async updatePlatformTag(
    tagId: number,
    updates: { name?: string; icon?: string; color?: string }
  ): Promise<PlatformTag> {
    const response = await api.put(`/tags/platform/${tagId}`, updates);
    return response.data;
  },

  async deletePlatformTag(tagId: number): Promise<{ message: string }> {
    const response = await api.delete(`/tags/platform/${tagId}`);
    return response.data;
  },

  async initializeDefaultTags(): Promise<{ message: string }> {
    const response = await api.post('/tags/initialize-defaults');
    return response.data;
  }
};
