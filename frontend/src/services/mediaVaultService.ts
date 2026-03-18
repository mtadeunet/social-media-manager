import { EnhancementTag, MediaVault, MediaVaultListResponse, PlatformTag, StyleTag } from '../types/mediaVault';
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

  async listStyleTags(): Promise<StyleTag[]> {
    const response = await api.get('/tags/style');
    return response.data;
  },

  async createStyleTag(
    name: string,
    progression_stage: number = 1,
    description?: string,
    color?: string
  ): Promise<StyleTag> {
    const response = await api.post('/tags/style', { name, progression_stage, description, color });
    return response.data;
  },

  async updateStyleTag(
    tagId: number,
    updates: { name?: string; progression_stage?: number; description?: string; color?: string }
  ): Promise<StyleTag> {
    const response = await api.put(`/tags/style/${tagId}`, updates);
    return response.data;
  },

  async deleteStyleTag(tagId: number): Promise<{ message: string }> {
    const response = await api.delete(`/tags/style/${tagId}`);
    return response.data;
  },

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
