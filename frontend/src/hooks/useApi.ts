import { useEffect, useState } from 'react';
import { postService } from '../services/api';
import { Post, PostList } from '../types/post';

export const usePosts = (stage?: string) => {
  const [posts, setPosts] = useState<PostList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await postService.getPosts(stage);
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [stage]);

  const createPost = async (post: { caption?: string; stage: string }) => {
    try {
      const newPost = await postService.createPost(post);
      const newPostListItem: PostList = {
        id: newPost.id,
        caption: newPost.caption,
        stage: newPost.stage,
        is_posted: newPost.is_posted,
        created_at: newPost.created_at,
        media_count: 0
      };
      setPosts(prev => [newPostListItem, ...prev]);
      return newPost;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    }
  };

  const updatePost = async (id: number, post: { caption?: string; stage?: string }) => {
    try {
      const updatedPost = await postService.updatePost(id, post);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updatedPost, media_count: p.media_count } : p));
      return updatedPost;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
      throw err;
    }
  };

  const deletePost = async (id: number) => {
    try {
      await postService.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    refetch: async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await postService.getPosts(stage);
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    }
  };
};

export const usePost = (id: number) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const data = await postService.getPost(id);
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  return {
    post,
    loading,
    error,
    refetch: fetchPost
  };
};
