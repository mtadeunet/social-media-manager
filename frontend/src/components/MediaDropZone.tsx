import React, { useRef, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import type { EnhancementTag } from '../types/mediaVault';

interface MediaDropZoneProps {
  enhancementTags: EnhancementTag[];
  onUploadComplete: () => void;
  onUploadSessionComplete?: (sessionData: { timestamp: number; fileIds: number[] }) => void;
}

interface MediaSlot {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
  thumbnail?: string;
  error?: string;
}

const MediaDropZone: React.FC<MediaDropZoneProps> = ({ enhancementTags, onUploadComplete, onUploadSessionComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mediaSlots, setMediaSlots] = useState<MediaSlot[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/') || file.type.startsWith('video/')
      );

      if (files.length > 0) {
        await processFiles(files);
      }
    }
  };

  const checkFileExists = async (fileName: string): Promise<boolean> => {
    try {
      // Get base filename without extension
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const response = await mediaVaultService.listMedia(0, 1000, baseName);
      return response.media.some(media =>
        media.base_filename.toLowerCase() === baseName.toLowerCase()
      );
    } catch {
      return false;
    }
  };

  const processFiles = async (files: File[]) => {
    const newSlots: MediaSlot[] = [];

    for (const file of files) {
      // Step 2: Check if file already exists
      const fileExists = await checkFileExists(file.name);

      if (fileExists) {
        // Step 2b: Fail the file if it already exists
        newSlots.push({
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          status: 'failed',
          progress: 0,
          error: 'File already exists'
        });
      } else {
        // Step 3: Create media slot with progress bar
        const slot: MediaSlot = {
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          status: 'pending',
          progress: 0
        };
        newSlots.push(slot);
      }
    }

    setMediaSlots(prev => [...prev, ...newSlots]);

    // Process uploads for non-failed files
    for (let i = 0; i < newSlots.length; i++) {
      const slot = newSlots[i];
      if (slot.status === 'failed') continue;

      const file = files.find(f => f.name === slot.fileName);
      if (!file) continue;

      // Step 4: Start upload
      setMediaSlots(prev => prev.map(s =>
        s.id === slot.id ? { ...s, status: 'uploading', progress: 0 } : s
      ));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setMediaSlots(prev => prev.map(s => {
          if (s.id === slot.id && s.progress < 90) {
            return { ...s, progress: Math.min(s.progress + 10, 90) };
          }
          return s;
        }));
      }, 200) as any;

      try {
        const response = await mediaVaultService.uploadMedia(file, selectedTags.length > 0 ? selectedTags : undefined);

        clearInterval(progressInterval);

        if (response) {
          // Step 4b: Mark as uploaded
          setMediaSlots(prev => prev.map(s =>
            s.id === slot.id ? {
              ...s,
              status: 'uploaded',
              progress: 100,
              thumbnail: response.latest_version?.thumbnail_path
            } : s
          ));

          // Step 5: Refresh media list to show thumbnail
          await onUploadComplete();
        } else {
          throw new Error('Upload failed');
        }
      } catch (error: any) {
        clearInterval(progressInterval);

        let errorMessage = 'Upload failed';
        if (error.response?.status === 409) {
          errorMessage = 'Duplicate file: A file with identical content already exists';
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setMediaSlots(prev => prev.map(s =>
          s.id === slot.id ? {
            ...s,
            status: 'failed',
            progress: 0,
            error: errorMessage
          } : s
        ));
      }
    }

    // Emit upload session data if callback provided
    if (onUploadSessionComplete) {
      const uploadedSlots = newSlots.filter(slot => slot.status === 'uploaded');
      if (uploadedSlots.length > 0) {
        onUploadSessionComplete({
          timestamp: Date.now(),
          fileIds: [] // Will be populated by parent component
        });
      }
    }
  };

  const removeSlot = (slotId: string) => {
    setMediaSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#4b5563'}`,
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#1e293b' : '#1f2937',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
        <p style={{ fontSize: '16px', color: '#f3f4f6', marginBottom: '8px', fontWeight: '500' }}>
          Drop files here
        </p>
        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }}>
          or
        </p>
        <button
          type="button"
          className="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Browse Files
        </button>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
          Supports images and videos
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Enhancement Tags Selection */}
      {enhancementTags.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#f3f4f6' }}>
            Enhancement Tags (Optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {enhancementTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: selectedTags.includes(tag.id) ? '2px solid' : '1px solid #4b5563',
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#374151',
                  color: selectedTags.includes(tag.id) ? 'white' : '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  borderColor: selectedTags.includes(tag.id) ? tag.color : '#4b5563'
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Slots */}
      {mediaSlots.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#f3f4f6' }}>
            Upload Progress
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {mediaSlots.map((slot) => (
              <div
                key={slot.id}
                style={{
                  padding: '12px',
                  backgroundColor: '#374151',
                  borderRadius: '6px',
                  border: slot.status === 'failed' ? '1px solid #ef4444' : '1px solid #4b5563'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {/* Thumbnail or Icon */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#4b5563' }}>
                      {slot.thumbnail ? (
                        <img
                          src={`http://localhost:8000/${slot.thumbnail}`}
                          alt={slot.fileName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '20px' }}>
                            {slot.status === 'uploaded' ? '✅' :
                              slot.status === 'uploading' ? '⏳' :
                                slot.status === 'failed' ? '❌' :
                                  slot.fileType === 'image' ? '🖼️' : '🎬'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#f3f4f6' }}>
                        {slot.fileName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {formatFileSize(slot.fileSize)}
                        {slot.status === 'uploaded' && (
                          <span style={{ marginLeft: '8px', fontWeight: '500', color: '#10b981' }}>
                            ✓ Uploaded
                          </span>
                        )}
                        {slot.status === 'failed' && slot.error && (
                          <span style={{ marginLeft: '8px', fontWeight: '500', color: '#ef4444' }}>
                            {slot.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {slot.status !== 'uploaded' && (
                    <button
                      onClick={() => removeSlot(slot.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {slot.status === 'uploading' && (
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#4b5563',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${slot.progress}%`,
                      height: '100%',
                      backgroundColor: '#667eea',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}

                {/* Uploaded Status */}
                {slot.status === 'uploaded' && (
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#10b981'
                    }} />
                  </div>
                )}

                {/* Failed Status */}
                {slot.status === 'failed' && (
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#ef4444'
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDropZone;
