import React, { useState } from 'react';

interface PostFormProps {
  onSubmit: (post: { caption?: string; stage: string }) => void;
  onCancel: () => void;
}

const PostForm: React.FC<PostFormProps> = ({ onSubmit, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onSubmit({ caption: caption.trim() || undefined, stage: 'draft' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>
        Create New Post
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="caption" style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="form-input"
            placeholder="What's this post about?"
            autoFocus
          />
        </div>

        <div className="flex justify-end" style={{ gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            className="button button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="button"
            style={{ opacity: submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
