export interface ContentTypeTag {
  id: number;
  name: string;
  description: string | null;
  color: string;
  has_phases: boolean;
  phase_count: number | null;
  created_at: string;
  phases: Phase[];
}

export interface Phase {
  id: number;
  name: string;
  description: string | null;
  color: string;
  phase_number: number;
  created_at: string;
}

export interface ContentTypeTagCreate {
  name: string;
  description?: string;
  color?: string;
  has_phases?: boolean;
  phase_count?: number;
}

export interface ContentTypeTagUpdate {
  name?: string;
  description?: string;
  color?: string;
  has_phases?: boolean;
  phase_count?: number;
}

export interface PhaseUpdate {
  name?: string;
  description?: string;
  color?: string;
}

class ContentTypeService {
  private baseUrl = '/api/tags/content-type';

  async listContentTypes(): Promise<ContentTypeTag[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch content types');
    }
    return response.json();
  }

  async createContentType(data: ContentTypeTagCreate): Promise<ContentTypeTag> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create content type');
    }
    
    return response.json();
  }

  async updateContentType(id: number, data: ContentTypeTagUpdate): Promise<ContentTypeTag> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update content type');
    }
    
    return response.json();
  }

  async deleteContentType(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete content type');
    }
  }

  async getContentTypePhases(contentTypeId: number): Promise<Phase[]> {
    const response = await fetch(`${this.baseUrl}/${contentTypeId}/phases`);
    if (!response.ok) {
      throw new Error('Failed to fetch content type phases');
    }
    return response.json();
  }

  async updatePhase(contentTypeId: number, phaseId: number, data: PhaseUpdate): Promise<Phase> {
    const response = await fetch(`${this.baseUrl}/${contentTypeId}/phases/${phaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update phase');
    }
    
    return response.json();
  }
}

export const contentTypeService = new ContentTypeService();
