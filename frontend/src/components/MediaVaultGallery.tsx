import React, { useState, useEffect } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { MediaVault, EnhancementTag, StyleTag, PlatformTag } from '../types/mediaVault';

interface MediaVaultGalleryProps {
  onMediaSelect?: (media: MediaVault) => void;
}

const MediaVaultGallery: React.FC<MediaVaultGalleryProps> = ({ onMediaSelect }) => {
  const [mediaItems, setMediaItems] = useState<MediaVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsableOnly, setShowUsableOnly] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Tags state
  const [enhancementTags, setEnhancementTags] = useState<EnhancementTag[]>([]);
  const [styleTags, setStyleTags] = useState<StyleTag[]>([]);
  const [platformTags, setPlatformTags] = useState<PlatformTag[]>([]);
  const [selectedEnhancementTags, setSelectedEnhancementTags] = useState<number[]>([]);

  useEffect(() => {
    loadMedia();
    loadTags();
  }, [searchTerm, showUsableOnly]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await mediaVaultService.listMedia(0, 50, searchTerm, showUsableOnly);
      setMediaItems(response.media);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const [enhancement, style, platform] = await Promise.all([
        mediaVaultService.listEnhancementTags(),
        mediaVaultService.listStyleTags(),
        mediaVaultService.listPlatformTags()
      ]);
      setEnhancementTags(enhancement);
      setStyleTags(style);
      setPlatformTags(platform);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      await mediaVaultService.uploadMedia(selectedFile, selectedEnhancementTags);
      setSelectedFile(null);
      setSelectedEnhancementTags([]);
      await loadMedia();
    } catch (error) {
      console.error('Failed to upload media:', error);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleUsability = async (mediaId: number) => {
    try {
      await mediaVaultService.toggleUsability(mediaId);
      await loadMedia();
    } catch (error) {
      console.error('Failed to toggle usability:', error);
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Are you sure you want to delete this media and all its versions?')) return;

    try {
      await mediaVaultService.deleteMedia(mediaId);
      await loadMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete media');
    }
  };

  const toggleEnhancementTag = (tagId: number) => {
    setSelectedEnhancementTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Media Vault</h1>
          <p className="text-gray-600">Centralized media management with version tracking</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload New Media</h2>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {selectedFile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enhancement Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {enhancementTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleEnhancementTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedEnhancementTags.includes(tag.id)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: selectedEnhancementTags.includes(tag.id) ? tag.color : undefined
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Media'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by filename..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUsableOnly}
                  onChange={(e) => setShowUsableOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show usable only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading media...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No media found</p>
            <p className="text-gray-400 text-sm mt-2">Upload your first media file to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map(media => (
              <div
                key={media.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onMediaSelect?.(media)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 relative">
                  {media.latest_version?.thumbnail_path ? (
                    <img
                      src={`http://localhost:8000/${media.latest_version.thumbnail_path}`}
                      alt={media.base_filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📁</span>
                    </div>
                  )}
                  
                  {/* Usability Badge */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUsability(media.id);
                      }}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        media.is_usable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {media.is_usable ? '✓ Usable' : 'Not Usable'}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate" title={media.base_filename}>
                    {media.base_filename}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <span>{media.file_type}</span>
                    <span>{media.version_count || 0} versions</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media.id);
                      }}
                      className="flex-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaVaultGallery;
