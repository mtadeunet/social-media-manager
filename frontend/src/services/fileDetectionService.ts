import api from './api';

export interface FileClassification {
    filename: string;
    base_name: string;
    stage: string | null;
    extension: string;
    action: string;
    file_path: string;
    existing_media?: {
        id: number;
        base_filename: string;
    };
}

export interface ScanResult {
    post_id: number;
    total_files: number;
    grouped_classifications: {
        new_original: FileClassification[];
        new_stage: FileClassification[];
        duplicates: FileClassification[];
        invalid: FileClassification[];
        orphan_stage: FileClassification[];
    };
    valid_stages: string[];
}

export interface ProcessResult {
    post_id: number;
    summary: {
        new_original: number;
        new_stage: number;
        duplicates: number;
        invalid: number;
        processed_files: string[];
    };
    valid_stages: string[];
}

export interface ConflictResult {
    post_id: number;
    conflicts: FileClassification[];
    conflict_count: number;
}

class FileDetectionService {
    async scanPostFiles(postId: number): Promise<ScanResult> {
        try {
            const response = await api.get(`/file-detection/posts/${postId}/scan`, {
                timeout: 35000 // 35 second timeout (longer than backend 30s)
            });
            return response.data;
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new Error('Scanning timed out. The directory may contain too many files. Try scanning smaller batches or check the server logs.');
            }
            if (error.response?.status === 408) {
                throw new Error('Scanning timed out. The directory may contain too many files.');
            }
            throw error;
        }
    }

    async processPostFiles(postId: number): Promise<ProcessResult> {
        try {
            const response = await api.post(`/file-detection/posts/${postId}/process`, {}, {
                timeout: 35000 // 35 second timeout
            });
            return response.data;
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new Error('Processing timed out. The directory may contain too many files.');
            }
            if (error.response?.status === 408) {
                throw new Error('Processing timed out. The directory may contain too many files.');
            }
            throw error;
        }
    }

    async getFileConflicts(postId: number): Promise<ConflictResult> {
        try {
            const response = await api.get(`/file-detection/posts/${postId}/conflicts`, {
                timeout: 35000 // 35 second timeout
            });
            return response.data;
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new Error('Conflict detection timed out. The directory may contain too many files.');
            }
            if (error.response?.status === 408) {
                throw new Error('Conflict detection timed out. The directory may contain too many files.');
            }
            throw error;
        }
    }
}

export const fileDetectionService = new FileDetectionService();
