import React, { useState, useRef } from 'react';

interface MediaUploadProps {
  postId: number;
  onUploadComplete: () => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

const MediaUpload: React.FC<MediaUploadProps> = ({ postId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
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
      setSelectedFiles(files);
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/') || file.type.startsWith('video/')
      );
      
      if (files.length > 0) {
        setSelectedFiles(files);
        await uploadFiles(files);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    
    // Initialize progress tracking
    const initialProgress: UploadProgress[] = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));
    setUploadProgress(initialProgress);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        
        // Update status to uploading
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'uploading' as const, progress: 50 } : p
        ));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('stage', 'original');
        formData.append('action', 'original');

        const response = await fetch(`/api/media/posts/${postId}/upload-stage`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error' as const, progress: 0 } : p
          ));
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        // Mark as complete
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'complete' as const, progress: 100 } : p
        ));
        
        // Refresh media list after each file and wait for it
        await onUploadComplete();
      }
      
      // Clear after brief delay to show completion
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadProgress([]);
        setUploading(false);
      }, 800);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
        <p style={{ fontSize: '16px', color: '#374151', marginBottom: '8px', fontWeight: '500' }}>
          Drag and drop files here
        </p>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
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

      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
            {uploading ? 'Uploading Files...' : `Selected Files (${selectedFiles.length})`}
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {selectedFiles.map((file, index) => {
              const progress = uploadProgress.find(p => p.file === file);
              return (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: progress ? '8px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ fontSize: '24px' }}>
                        {progress?.status === 'complete' ? '✅' : 
                         progress?.status === 'uploading' ? '⏳' :
                         progress?.status === 'error' ? '❌' :
                         file.type.startsWith('image/') ? '🖼️' : '🎬'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                          {progress && (
                            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                              {progress.status === 'complete' ? '✓ Complete' :
                               progress.status === 'uploading' ? 'Uploading...' :
                               progress.status === 'error' ? 'Failed' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
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
                  {progress && (
                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: '#e5e7eb', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progress.progress}%`,
                        height: '100%',
                        backgroundColor: progress.status === 'complete' ? '#10b981' : 
                                       progress.status === 'error' ? '#ef4444' : '#667eea',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
