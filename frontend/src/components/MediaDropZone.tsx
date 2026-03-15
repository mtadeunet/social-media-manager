import React, { useCallback, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag } from '../types/mediaVault';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  thumbnailUrl?: string;
  mediaId?: number;
  error?: string;
}

interface MediaDropZoneProps {
  enhancementTags: EnhancementTag[];
  onUploadComplete: () => void;
}

const MediaDropZone: React.FC<MediaDropZoneProps> = ({ enhancementTags, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFile = async (file: File, index: number) => {
    try {
      // Update status to uploading
      setUploadingFiles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'uploading', progress: 0 };
        return updated;
      });

      // Simulate upload progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => {
          const updated = [...prev];
          if (updated[index].progress < 90) {
            updated[index] = { ...updated[index], progress: updated[index].progress + 10 };
          }
          return updated;
        });
      }, 100);

      // Upload the file
      const response = await mediaVaultService.uploadMedia(file, selectedTags);

      clearInterval(progressInterval);

      // Update to processing status
      setUploadingFiles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'processing',
          progress: 95,
          mediaId: response.id
        };
        return updated;
      });

      // Wait a bit for thumbnail generation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the media details to get thumbnail
      const mediaDetails = await mediaVaultService.getMedia(response.id);
      const thumbnailPath = mediaDetails.latest_version?.thumbnail_path;

      // Update to complete status with thumbnail
      setUploadingFiles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'complete',
          progress: 100,
          thumbnailUrl: thumbnailPath ? `http://localhost:8000/${thumbnailPath}` : undefined
        };
        return updated;
      });

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingFiles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        return updated;
      });
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length === 0) {
      alert('Please drop image or video files only');
      return;
    }

    // Initialize uploading files state
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(newUploadingFiles);

    // Upload all files
    await Promise.all(
      files.map((file, index) => uploadFile(file, index))
    );

    // Notify parent to refresh media list
    onUploadComplete();
  }, [selectedTags, onUploadComplete]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length === 0) return;

    // Initialize uploading files state
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(newUploadingFiles);

    // Upload all files
    await Promise.all(
      files.map((file, index) => uploadFile(file, index))
    );

    // Notify parent to refresh media list
    onUploadComplete();

    // Reset input
    e.target.value = '';
  }, [selectedTags, onUploadComplete]);

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'complete'));
  };

  const overallProgress = uploadingFiles.length > 0
    ? Math.round(uploadingFiles.reduce((sum, f) => sum + f.progress, 0) / uploadingFiles.length)
    : 0;

  const completedCount = uploadingFiles.filter(f => f.status === 'complete').length;
  const errorCount = uploadingFiles.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isDragging
            ? 'border-purple-500 bg-gradient-to-br from-purple-100/50 to-pink-100/50 backdrop-blur-xl scale-105'
            : 'border-purple-300/50 hover:border-purple-400/70 backdrop-blur-xl bg-white/30'
          }`}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="pointer-events-none">
          <div className="text-7xl mb-4 animate-bounce">📁</div>
          <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Drop media files here or click to browse
          </p>
          <p className="text-sm text-gray-600 font-medium">
            Supports images and videos
          </p>
        </div>
      </div>

      {/* Enhancement Tags Selection */}
      {enhancementTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Enhancement Tags (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {enhancementTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border ${selectedTags.includes(tag.id)
                    ? 'text-white shadow-lg scale-105 border-white/50'
                    : 'backdrop-blur-xl bg-white/60 text-gray-700 hover:bg-white/80 border-white/50 hover:scale-105'
                  }`}
                style={{
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overall Progress */}
      {uploadingFiles.length > 0 && (
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-800">
                Overall Progress
              </span>
              <span className="text-sm text-gray-600 font-medium">
                {completedCount}/{uploadingFiles.length} complete
                {errorCount > 0 && ` • ${errorCount} failed`}
              </span>
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold backdrop-blur-xl bg-white/60 px-3 py-1.5 rounded-lg hover:bg-white/80 transition-all"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="w-full bg-gradient-to-r from-purple-200/50 to-pink-200/50 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Individual File Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadFile, index) => (
            <div
              key={index}
              className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-lg p-4 flex items-center gap-4 hover:bg-white/60 transition-all duration-300"
            >
              {/* Thumbnail Preview */}
              <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-xl overflow-hidden border border-white/50">
                {uploadFile.thumbnailUrl ? (
                  <img
                    src={uploadFile.thumbnailUrl}
                    alt={uploadFile.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : uploadFile.status === 'complete' ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-2xl">✓</span>
                  </div>
                ) : uploadFile.status === 'error' ? (
                  <div className="w-full h-full flex items-center justify-center text-red-400">
                    <span className="text-2xl">✗</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* File Info and Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <span className="text-sm text-gray-500 ml-2">
                    {uploadFile.status === 'uploading' && 'Uploading...'}
                    {uploadFile.status === 'processing' && 'Processing...'}
                    {uploadFile.status === 'complete' && '✓ Complete'}
                    {uploadFile.status === 'error' && '✗ Failed'}
                  </span>
                </div>

                {/* Progress Bar */}
                {uploadFile.status !== 'complete' && uploadFile.status !== 'error' && (
                  <div className="w-full bg-gradient-to-r from-purple-200/50 to-pink-200/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {uploadFile.status === 'error' && uploadFile.error && (
                  <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                )}

                {/* File Size */}
                <p className="text-xs text-gray-500 mt-1">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaDropZone;
