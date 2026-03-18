import axios from 'axios';
import { FileValidationRequest, FileValidationResponse, Post, PostList } from '../types/post';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const postService = {
  // Get all posts
  getPosts: async (stage?: string): Promise<PostList[]> => {
    const params = stage ? { stage } : {};
    const response = await api.get('/posts', { params });
    return response.data;
  },

  // Get post by ID
  getPost: async (id: number): Promise<Post> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  // Create new post
  createPost: async (post: { caption?: string; stage: string }): Promise<Post> => {
    const response = await api.post('/posts', post);
    return response.data;
  },

  // Update post
  updatePost: async (id: number, post: { caption?: string; stage?: string }): Promise<Post> => {
    const response = await api.put(`/posts/${id}`, post);
    return response.data;
  },

  // Delete post
  deletePost: async (id: number): Promise<void> => {
    await api.delete(`/posts/${id}`);
  },
};

export const mediaService = {
  // Get files for specific stage
  getStageFiles: async (postId: number, stage: string): Promise<{ files: any[] }> => {
    const response = await api.get(`/media/posts/${postId}/files`, {
      params: { stage }
    });
    return response.data;
  },

  // Upload file to stage
  uploadToStage: async (
    postId: number,
    file: File,
    stage: string,
    action: 'replace' | 'new' | 'original',
    targetMediaId?: number
  ): Promise<{ media_id: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', stage);
    formData.append('action', action);
    if (targetMediaId) {
      formData.append('target_media_id', targetMediaId.toString());
    }

    const response = await api.post(`/media/posts/${postId}/upload-stage`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Validate upload
  validateUpload: async (postId: number, request: FileValidationRequest): Promise<FileValidationResponse> => {
    const response = await api.post(`/media/posts/${postId}/validate-upload`, request);
    return response.data;
  },

  // Promote media
  promoteMedia: async (mediaId: number, targetStage: string): Promise<void> => {
    const formData = new FormData();
    formData.append('target_stage', targetStage);

    await api.post(`/media/media/${mediaId}/promote`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete media
  deleteMedia: async (mediaId: number): Promise<void> => {
    await api.delete(`/media/media/${mediaId}`);
  },

  // Get media URL
  getMediaUrl: (postId: number, filename: string): string => {
    return `http://localhost:8000/media/media/${postId}/${filename}`;
  },
};

export default api;
