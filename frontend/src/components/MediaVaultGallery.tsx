import React, { useEffect, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault, PlatformTag, StyleTag } from '../types/mediaVault';
import MediaDropZone from './MediaDropZone';

interface MediaVaultGalleryProps {
  onMediaSelect?: (media: MediaVault) => void;
}

const MediaVaultGallery: React.FC<MediaVaultGalleryProps> = ({ onMediaSelect }) => {
  const [mediaItems, setMediaItems] = useState<MediaVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsableOnly, setShowUsableOnly] = useState(false);

  // Tags state
  const [enhancementTags, setEnhancementTags] = useState<EnhancementTag[]>([]);
  const [styleTags, setStyleTags] = useState<StyleTag[]>([]);
  const [platformTags, setPlatformTags] = useState<PlatformTag[]>([]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Media Vault
          </h1>
          <p className="text-gray-600">Centralized media management with version tracking</p>
        </div>

        {/* Upload Section - Glassy */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-xl p-6 mb-6 hover:bg-white/50 transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload New Media</h2>
          <MediaDropZone
            enhancementTags={enhancementTags}
            onUploadComplete={loadMedia}
          />
        </div>

        {/* Filters - Glassy */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by filename..."
                className="w-full px-4 py-2.5 backdrop-blur-xl bg-white/60 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/80 transition-all placeholder-gray-400"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer px-4 py-2.5 backdrop-blur-xl bg-white/60 border border-white/50 rounded-xl hover:bg-white/80 transition-all">
                <input
                  type="checkbox"
                  checked={showUsableOnly}
                  onChange={(e) => setShowUsableOnly(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Show usable only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading media...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-xl p-12 text-center">
            <p className="text-gray-600 text-lg font-medium">No media found</p>
            <p className="text-gray-500 text-sm mt-2">Upload your first media file to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map(media => (
              <div
                key={media.id}
                className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl hover:scale-105 hover:bg-white/60 transition-all duration-300 cursor-pointer group"
                onClick={() => onMediaSelect?.(media)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gradient-to-br from-purple-100/50 to-pink-100/50 relative overflow-hidden">
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
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUsability(media.id);
                      }}
                      className={`px-3 py-1.5 backdrop-blur-xl rounded-full text-xs font-semibold border transition-all duration-300 ${media.is_usable
                        ? 'bg-green-500/90 text-white border-green-400/50 hover:bg-green-600/90'
                        : 'bg-gray-500/90 text-white border-gray-400/50 hover:bg-gray-600/90'
                        }`}
                    >
                      {media.is_usable ? '✓ Usable' : 'Not Usable'}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 backdrop-blur-sm bg-white/20">
                  <h3 className="font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors" title={media.base_filename}>
                    {media.base_filename}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span className="px-2 py-0.5 backdrop-blur-xl bg-white/60 rounded-full text-xs font-medium">{media.file_type}</span>
                    <span className="px-2 py-0.5 backdrop-blur-xl bg-purple-100/60 rounded-full text-xs font-medium text-purple-700">{media.version_count || 0} versions</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media.id);
                      }}
                      className="flex-1 px-3 py-2 text-sm backdrop-blur-xl bg-red-500/90 text-white rounded-xl hover:bg-red-600/90 border border-red-400/50 font-medium transition-all duration-300 hover:scale-105"
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
