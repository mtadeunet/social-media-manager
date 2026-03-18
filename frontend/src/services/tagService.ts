import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface EnhancementTag {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface TagCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  description?: string;
  color?: string;
}

class TagService {
  async listEnhancementTags(): Promise<EnhancementTag[]> {
    const response = await api.get('/tags/enhancement');
    return response.data;
  }

  async createEnhancementTag(data: TagCreate): Promise<EnhancementTag> {
    const response = await api.post('/tags/enhancement', data);
    return response.data;
  }

  async updateEnhancementTag(id: number, data: TagUpdate): Promise<EnhancementTag> {
    const response = await api.put(`/tags/enhancement/${id}`, data);
    return response.data;
  }

  async deleteEnhancementTag(id: number): Promise<void> {
    await api.delete(`/tags/enhancement/${id}`);
  }

  async initializeDefaultTags(): Promise<void> {
    await api.post('/tags/initialize-defaults');
  }
}

export const tagService = new TagService();
