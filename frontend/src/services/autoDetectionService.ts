import api from './api';

export interface AutoDetectionResult {
  post_id: number;
  message: string;
  skipped: boolean;
}

class AutoDetectionService {
  private intervals: Map<number, number> = new Map();

  startAutoDetection(postId: number, onFilesProcessed: () => void) {
    // Clear any existing interval for this post
    this.stopAutoDetection(postId);

    // Set up interval to trigger auto-detection every 5 seconds
    const interval = setInterval(async () => {
      try {
        const result = await api.post<AutoDetectionResult>(`/file-detection/posts/${postId}/auto-detect`);

        // If files were processed (not skipped), trigger the callback
        if (!result.data.skipped) {
          // Wait a bit for background processing to complete
          setTimeout(() => {
            onFilesProcessed();
          }, 1000);
        }
      } catch (error) {
        console.error('Auto-detection failed:', error);
      }
    }, 5000);

    this.intervals.set(postId, interval);
  }

  stopAutoDetection(postId: number) {
    const interval = this.intervals.get(postId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(postId);
    }
  }

  stopAllAutoDetections() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
  }
}

export const autoDetectionService = new AutoDetectionService();
