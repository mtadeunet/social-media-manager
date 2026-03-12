import React from 'react';
import type { PostList } from '../types/post';

interface PostListProps {
  posts: PostList[];
  loading: boolean;
  onPostClick: (postId: number) => void;
  onDeletePost?: (postId: number) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, loading, onPostClick, onDeletePost }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height: '200px' }}>
        <div className="text-lg">Loading posts...</div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-8">
        <div style={{ color: '#6b7280', fontSize: '18px' }}>No posts found</div>
        <div style={{ color: '#9ca3af', marginTop: '8px' }}>Create your first post to get started</div>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'draft': return '#e5e7eb';
      case 'framed': return '#dbeafe';
      case 'detailed': return '#e9d5ff';
      case 'done': return '#d1fae5';
      default: return '#e5e7eb';
    }
  };

  const getStageTextColor = (stage: string) => {
    switch (stage) {
      case 'draft': return '#374151';
      case 'framed': return '#1d4ed8';
      case 'detailed': return '#6b21a8';
      case 'done': return '#065f46';
      default: return '#374151';
    }
  };

  return (
    <div className="grid grid-cols-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="card"
          style={{ cursor: 'pointer' }}
          onClick={() => onPostClick(post.id)}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                Post #{post.id}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '12px',
                    backgroundColor: getStageColor(post.stage),
                    color: getStageTextColor(post.stage)
                  }}
                >
                  {post.stage}
                </span>
                {onDeletePost && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePost(post.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                    title="Delete post"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            {post.caption && (
              <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '12px' }}>
                {post.caption}
              </p>
            )}
            
            <div className="flex justify-between items-center" style={{ fontSize: '14px', color: '#6b7280' }}>
              <span>{post.media_count} media file{post.media_count !== 1 ? 's' : ''}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            
            {post.is_posted && (
              <div style={{ marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Posted
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
