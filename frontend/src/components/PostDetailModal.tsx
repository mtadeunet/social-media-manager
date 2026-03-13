import React, { useEffect, useState } from 'react';
import { usePost } from '../hooks/useApi';
import { autoDetectionService, mediaService, postService } from '../services';
import type { MediaFile } from '../types/post';
import MediaGallery from './MediaGallery';
import MediaUpload from './MediaUpload';

interface PostDetailModalProps {
  postId: number;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ postId, onClose, onUpdate, onDelete }) => {
  const { post, refetch } = usePost(postId);
  const [caption, setCaption] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [currentStage, setCurrentStage] = useState<'draft' | 'framed' | 'detailed' | 'done'>('draft');
  const [selectedMediaStage, setSelectedMediaStage] = useState<'original' | 'framed' | 'detailed'>('original');
  const [saving, setSaving] = useState(false);
  const [invalidFiles, setInvalidFiles] = useState<any[]>([]);
  const captionTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Start auto-detection when modal opens
  useEffect(() => {
    autoDetectionService.startAutoDetection(postId, async () => {
      await refetch();
      onUpdate();
    });

    // Cleanup when modal closes
    return () => {
      autoDetectionService.stopAutoDetection(postId);
    };
  }, [postId, refetch, onUpdate]);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      setCurrentStage(post.stage);
    }
  }, [post]);

  const handleSaveCaption = async () => {
    setSaving(true);
    try {
      const updatedPost = await postService.updatePost(postId, { caption: caption.trim() || undefined });
      setCaption(updatedPost.caption || '');
      setIsEditingCaption(false);
      await refetch();
      onUpdate();
    } catch (error) {
      console.error('Failed to update caption:', error);
      alert('Failed to update caption');
    } finally {
      setSaving(false);
    }
  };

  // Fetch invalid files from file detection API
  const fetchInvalidFiles = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/file-detection/posts/${postId}/scan`);
      const data = await response.json();
      const invalidFiles = data.grouped_classifications.invalid_stage || [];
      console.log('Fetched invalid files:', invalidFiles);
      setInvalidFiles(invalidFiles);
    } catch (error) {
      console.error('Failed to fetch invalid files:', error);
      setInvalidFiles([]);
    }
  };

  // Import invalid file to specific stage
  const handleImportInvalidFile = async (filename: string, targetStage: string) => {
    try {
      // Extract base name from filename (remove extension and invalid suffix)
      const baseName = filename.replace(/\.[^/.]+$/, "").replace(/_v\d+.*$/, '');

      // Create new filename with correct stage suffix
      const newFilename = targetStage === 'original'
        ? `${baseName}.jpg`
        : `${baseName}_${targetStage}.jpg`;

      console.log(`Importing ${filename} to ${targetStage} as ${newFilename}`);

      // Call backend API to rename and process the file
      const response = await fetch(`http://localhost:8000/api/file-detection/posts/${postId}/import-invalid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_filename: filename,
          new_filename: newFilename,
          target_stage: targetStage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import file');
      }

      // Refresh data
      await fetchInvalidFiles();
      await refetch();
      onUpdate();

      console.log(`Successfully imported ${filename} as ${newFilename}`);
    } catch (error) {
      console.error('Failed to import invalid file:', error);
      alert('Failed to import file. Please try again.');
    }
  };

  // Fetch invalid files when component mounts or stage changes
  useEffect(() => {
    console.log('useEffect triggered for fetchInvalidFiles, postId:', postId, 'selectedMediaStage:', selectedMediaStage);
    fetchInvalidFiles();
  }, [postId, selectedMediaStage]);

  // Temp: Add manual fetch for debugging
  const handleManualFetch = () => {
    console.log('Manual fetch triggered');
    fetchInvalidFiles();
  };

  // Auto-sync: Check for filesystem changes every 10 seconds
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/file-detection/posts/${postId}/scan`);
        const data = await response.json();

        // If there are deleted files, automatically process them to sync database
        if (data.deleted_files && data.deleted_files.length > 0) {
          console.log('Detected deleted files, auto-syncing...');
          await fetch(`http://localhost:8000/api/file-detection/posts/${postId}/process`, {
            method: 'POST'
          });
          await refetch();
          onUpdate();
          await fetchInvalidFiles();
        }
      } catch (error) {
        console.error('Auto-sync check failed:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(syncInterval);
  }, [postId, refetch, onUpdate]);

  const handleCaptionBlur = async () => {
    // Only save if the caption has actually changed
    if (post && caption.trim() !== (post.caption || '').trim()) {
      await handleSaveCaption();
    } else {
      setIsEditingCaption(false);
    }
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditingCaption(false);
      if (post) {
        setCaption(post.caption || '');
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Save on Ctrl+Enter or Cmd+Enter
      e.preventDefault();
      handleSaveCaption();
    }
  };

  const handleCaptionClick = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Set cursor to end of text
    const textarea = e.target;
    const length = textarea.value.length;
    textarea.setSelectionRange(length, length);
  };

  const handleStageChange = async (newStage: string) => {
    if (currentStage === newStage) return;

    setSaving(true);
    try {
      await postService.updatePost(postId, { stage: newStage });
      setCurrentStage(newStage as 'draft' | 'framed' | 'detailed' | 'done');
      await refetch();
      onUpdate();
    } catch (error) {
      console.error('Failed to update stage:', error);
      alert('Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteMedia = async (mediaId: number, targetStage: string) => {
    try {
      await mediaService.promoteMedia(mediaId, targetStage);
      refetch();
      alert(`Media promoted to ${targetStage}!`);
    } catch (error) {
      console.error('Failed to promote media:', error);
      alert('Failed to promote media');
    }
  };

  const handleDeleteMedia = async (mediaIdToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this media file?')) {
      return;
    }

    setSaving(true);
    try {
      await mediaService.deleteMedia(mediaIdToDelete);
      await refetch();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete media');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this entire post and all its media? This cannot be undone.')) return;

    try {
      await postService.deletePost(postId);
      onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const stages = [
    { value: 'draft', label: 'Draft', color: '#e5e7eb', textColor: '#374151' },
    { value: 'framed', label: 'Framed', color: '#dbeafe', textColor: '#1d4ed8' },
    { value: 'detailed', label: 'Detailed', color: '#e9d5ff', textColor: '#6b21a8' },
    { value: 'done', label: 'Done', color: '#d1fae5', textColor: '#065f46' },
  ];

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}
      >
        {!post ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div>Post not found</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Post #{post.id}
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* Caption Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Caption
              </label>
              {isEditingCaption ? (
                <div>
                  <textarea
                    ref={captionTextareaRef}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onFocus={handleCaptionClick}
                    onBlur={handleCaptionBlur}
                    onKeyDown={handleCaptionKeyDown}
                    rows={3}
                    className="form-input"
                    style={{ marginBottom: '8px' }}
                    autoFocus
                    placeholder="Enter caption... (auto-saves when you click away)"
                  />
                  {saving && (
                    <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                      Saving...
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingCaption(true)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    minHeight: '60px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <p style={{ color: caption ? '#374151' : '#9ca3af', fontSize: '14px', margin: 0 }}>
                    {caption || 'Click to add caption...'}
                  </p>
                </div>
              )}
            </div>

            {/* Stage Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Post Stage
              </label>
              <select
                value={currentStage}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {stages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Section */}
            <div style={{ marginBottom: '24px' }}>
              {/* Media Stage Navigation */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  Media Stage View
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {[
                    { value: 'original', label: 'Original' },
                    { value: 'framed', label: 'Framed' },
                    { value: 'detailed', label: 'Detailed' }
                  ].map((stage) => {
                    const count = (post.media_files || []).filter((media: MediaFile) => {
                      switch (stage.value) {
                        case 'original':
                          return !!media.original_path;
                        case 'framed':
                          return !!media.framed_path;
                        case 'detailed':
                          return !!media.detailed_path;
                        default:
                          return false;
                      }
                    }).length;

                    return (
                      <button
                        key={stage.value}
                        onClick={() => setSelectedMediaStage(stage.value as 'original' | 'framed' | 'detailed')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: selectedMediaStage === stage.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          backgroundColor: selectedMediaStage === stage.value ? '#dbeafe' : 'white',
                          color: selectedMediaStage === stage.value ? '#1d4ed8' : '#374151',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          position: 'relative'
                        }}
                      >
                        {stage.label}
                        {count > 0 && (
                          <span style={{
                            marginLeft: '6px',
                            backgroundColor: selectedMediaStage === stage.value ? '#1d4ed8' : '#6b7280',
                            color: 'white',
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: '600'
                          }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Filter and manage media at different stages independently
                </div>
              </div>

              {/* Debug: Temporary button to test invalid files */}
              <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                <button
                  onClick={handleManualFetch}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                >
                  🔄 Fetch Invalid Files
                </button>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Invalid files: {invalidFiles.length}
                </span>
              </div>

              <MediaGallery
                key={`${post?.updated_at}-${selectedMediaStage}`} // Force re-render when stage changes
                mediaFiles={post.media_files || []}
                invalidFiles={invalidFiles}
                onPromote={handlePromoteMedia}
                onDelete={handleDeleteMedia}
                onImportInvalidFile={handleImportInvalidFile}
                selectedMediaStage={selectedMediaStage}
              />
            </div>

            {/* Upload Section */}
            <div style={{ marginBottom: '24px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                Upload New Media
              </h3>
              <MediaUpload
                postId={postId}
                onUploadComplete={async () => {
                  await refetch();
                }}
              />
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
              <button
                onClick={handleDeletePost}
                className="button"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                🗑️ Delete Post
              </button>
              <button
                onClick={onClose}
                className="button"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostDetailModal;
