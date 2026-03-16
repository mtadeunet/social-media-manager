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
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 ${isDragging
            ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-2xl scale-105 shadow-2xl shadow-cyan-500/50'
            : 'border-purple-500/30 hover:border-purple-500/60 backdrop-blur-2xl bg-slate-900/30 hover:bg-slate-900/50'
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
          <div className="text-8xl mb-6 animate-pulse">📁</div>
          <p className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 uppercase tracking-wider">
            Drop media files here or click to browse
          </p>
          <p className="text-base text-gray-400 font-semibold uppercase tracking-widest">
            Supports images and videos
          </p>
        </div>
      </div>

      {/* Enhancement Tags Selection */}
      {enhancementTags.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-cyan-400 mb-4 uppercase tracking-widest">
            Enhancement Tags (Optional)
          </label>
          <div className="flex flex-wrap gap-3">
            {enhancementTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border-2 uppercase tracking-wider ${selectedTags.includes(tag.id)
                    ? 'text-white shadow-2xl scale-110 border-white/50'
                    : 'backdrop-blur-xl bg-slate-900/50 text-gray-300 hover:bg-slate-800/70 border-purple-500/30 hover:border-purple-500/60 hover:scale-105'
                  }`}
                style={{
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                  boxShadow: selectedTags.includes(tag.id) ? `0 0 20px ${tag.color}50` : undefined
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
        <div className="backdrop-blur-2xl bg-slate-800/50 border border-cyan-500/30 rounded-3xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-base font-black text-cyan-400 uppercase tracking-wider">
                Overall Progress
              </span>
              <span className="text-sm text-purple-400 font-bold">
                {completedCount}/{uploadingFiles.length} complete
                {errorCount > 0 && ` • ${errorCount} failed`}
              </span>
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-bold backdrop-blur-xl bg-slate-900/50 px-4 py-2 rounded-2xl hover:bg-slate-900/70 border border-cyan-500/30 hover:border-cyan-500/50 transition-all uppercase tracking-wider"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="w-full bg-slate-900/50 rounded-full h-4 overflow-hidden border border-purple-500/20">
            <div
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Individual File Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-4">
          {uploadingFiles.map((uploadFile, index) => (
            <div
              key={index}
              className="backdrop-blur-2xl bg-slate-800/40 border border-purple-500/20 rounded-3xl shadow-xl p-5 flex items-center gap-5 hover:bg-slate-800/60 hover:border-purple-500/40 transition-all duration-500"
            >
              {/* Thumbnail Preview */}
              <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 rounded-2xl overflow-hidden border-2 border-purple-500/30">
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white truncate">
                    {uploadFile.file.name}
                  </p>
                  <span className={`text-xs font-bold ml-3 px-3 py-1 rounded-xl uppercase tracking-wider ${uploadFile.status === 'uploading' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      uploadFile.status === 'processing' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        uploadFile.status === 'complete' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {uploadFile.status === 'uploading' && '⬆️ Uploading'}
                    {uploadFile.status === 'processing' && '⚙️ Processing'}
                    {uploadFile.status === 'complete' && '✓ Complete'}
                    {uploadFile.status === 'error' && '✗ Failed'}
                  </span>
                </div>

                {/* Progress Bar */}
                {uploadFile.status !== 'complete' && uploadFile.status !== 'error' && (
                  <div className="w-full bg-slate-900/50 rounded-full h-2.5 overflow-hidden border border-purple-500/20">
                    <div
                      className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300 shadow-lg shadow-purple-500/50"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {uploadFile.status === 'error' && uploadFile.error && (
                  <p className="text-xs text-red-400 mt-2 font-semibold">{uploadFile.error}</p>
                )}

                {/* File Size */}
                <p className="text-xs text-gray-500 mt-2 font-semibold">
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
