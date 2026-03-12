import React, { useState, useEffect } from 'react';
import { usePost } from '../hooks/useApi';
import { postService, mediaService } from '../services/api';
import MediaUpload from './MediaUpload';
import MediaGallery from './MediaGallery';

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
  const [saving, setSaving] = useState(false);

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
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="form-input"
                style={{ marginBottom: '8px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSaveCaption} disabled={saving} className="button" style={{ fontSize: '14px' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setCaption(post.caption || ''); setIsEditingCaption(false); }} className="button button-secondary" style={{ fontSize: '14px' }}>
                  Cancel
                </button>
              </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {stages.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStageChange(s.value)}
                disabled={saving}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: currentStage === s.value ? `2px solid ${s.textColor}` : '2px solid #e5e7eb',
                  backgroundColor: currentStage === s.value ? s.color : 'white',
                  color: s.textColor,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Section */}
        <div style={{ marginBottom: '24px' }}>
          <MediaGallery
            mediaFiles={post.media_files || []}
            onPromote={handlePromoteMedia}
            onDelete={handleDeleteMedia}
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
