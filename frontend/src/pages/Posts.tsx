import React, { useState } from 'react';
import { usePosts } from '../hooks/useApi';
import PostList from '../components/PostList';
import PostDetailModal from '../components/PostDetailModal';

const PostsPage: React.FC = () => {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const { posts, loading, error, createPost, deletePost } = usePosts();

  const handlePostClick = (postId: number) => {
    setSelectedPostId(postId);
  };

  const handleCreatePost = async () => {
    setCreating(true);
    try {
      const newPost = await createPost({ stage: 'draft' });
      setSelectedPostId(newPost.id);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(postId);
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
  };

  const stages = [
    { value: '', label: 'All Stages' },
    { value: 'draft', label: 'Draft' },
    { value: 'framed', label: 'Framed' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'done', label: 'Done' },
  ];

  if (error) {
    return (
      <div className="container">
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header Section */}
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '32px', 
        marginBottom: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <div>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              margin: 0, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Social Media Manager
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
              Manage your media content and posts
            </p>
          </div>
          <button
            onClick={handleCreatePost}
            disabled={creating}
            className="button"
            style={{ fontSize: '15px', padding: '14px 28px', opacity: creating ? 0.6 : 1 }}
          >
            {creating ? '⏳ Creating...' : '✨ Create New Post'}
          </button>
        </div>

        {/* Stage Filter */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            Filter:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {stages.map((stage) => (
              <button
                key={stage.value}
                onClick={() => setSelectedStage(stage.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: selectedStage === stage.value ? '2px solid #667eea' : '2px solid #e5e7eb',
                  backgroundColor: selectedStage === stage.value ? '#f0f4ff' : 'white',
                  color: selectedStage === stage.value ? '#667eea' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedStage === stage.value ? '600' : '500',
                  transition: 'all 0.2s'
                }}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
          onUpdate={() => {
            // Refetch posts to update the list
            window.location.reload();
          }}
          onDelete={() => {
            setSelectedPostId(null);
            window.location.reload();
          }}
        />
      )}

      {/* Posts List */}
      <PostList
        posts={posts.filter(post => !selectedStage || post.stage === selectedStage)}
        loading={loading}
        onPostClick={handlePostClick}
        onDeletePost={handleDeletePost}
      />
    </div>
  );
};

export default PostsPage;
