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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 tracking-tight">
            Media Vault
          </h1>
          <p className="text-gray-400 text-lg">Centralized media management with intelligent version tracking</p>
        </div>

        {/* Upload Section */}
        <div className="backdrop-blur-2xl bg-slate-800/50 border border-purple-500/20 rounded-3xl shadow-2xl p-8 mb-8 hover:border-purple-500/40 transition-all duration-500">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">⬆️</span>
            Upload New Media
          </h2>
          <MediaDropZone
            enhancementTags={enhancementTags}
            onUploadComplete={loadMedia}
          />
        </div>

        {/* Filters */}
        <div className="backdrop-blur-2xl bg-slate-800/50 border border-cyan-500/20 rounded-3xl shadow-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by filename..."
                className="w-full px-5 py-3.5 backdrop-blur-xl bg-slate-900/50 border border-cyan-500/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder-gray-500 text-white font-medium"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer px-5 py-3.5 backdrop-blur-xl bg-slate-900/50 border border-purple-500/30 rounded-2xl hover:bg-slate-900/70 hover:border-purple-500/50 transition-all w-full">
                <input
                  type="checkbox"
                  checked={showUsableOnly}
                  onChange={(e) => setShowUsableOnly(e.target.checked)}
                  className="w-5 h-5 text-purple-500 bg-slate-900 border-purple-500/50 rounded focus:ring-purple-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Show usable only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-cyan-500"></div>
            <p className="mt-6 text-cyan-400 font-bold text-lg">Loading media...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="backdrop-blur-2xl bg-slate-800/50 border border-purple-500/20 rounded-3xl shadow-2xl p-16 text-center">
            <div className="text-6xl mb-6">📦</div>
            <p className="text-white text-2xl font-bold mb-3">No media found</p>
            <p className="text-gray-400 text-lg">Upload your first media file to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map(media => (
              <div
                key={media.id}
                className="backdrop-blur-2xl bg-slate-800/40 border border-purple-500/20 rounded-3xl shadow-2xl overflow-hidden hover:shadow-purple-500/20 hover:shadow-2xl hover:scale-105 hover:border-purple-500/50 transition-all duration-500 cursor-pointer group"
                onClick={() => onMediaSelect?.(media)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 relative overflow-hidden">
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
                      className={`px-4 py-2 backdrop-blur-xl rounded-2xl text-xs font-bold border-2 transition-all duration-300 uppercase tracking-wider ${media.is_usable
                        ? 'bg-emerald-500/90 text-white border-emerald-400 hover:bg-emerald-400 shadow-lg shadow-emerald-500/50'
                        : 'bg-slate-700/90 text-gray-300 border-slate-600 hover:bg-slate-600 shadow-lg shadow-slate-700/50'
                        }`}
                    >
                      {media.is_usable ? '✓ Usable' : 'Not Usable'}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 backdrop-blur-sm bg-slate-900/40 border-t border-purple-500/10">
                  <h3 className="font-bold text-white truncate group-hover:text-cyan-400 transition-colors text-lg" title={media.base_filename}>
                    {media.base_filename}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="px-3 py-1.5 backdrop-blur-xl bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-400 uppercase tracking-wider">{media.file_type}</span>
                    <span className="px-3 py-1.5 backdrop-blur-xl bg-purple-500/20 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-400 uppercase tracking-wider">{media.version_count || 0} versions</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media.id);
                      }}
                      className="flex-1 px-4 py-2.5 text-sm backdrop-blur-xl bg-red-500/20 text-red-400 border-2 border-red-500/30 rounded-2xl hover:bg-red-500/30 hover:border-red-500/50 font-bold transition-all duration-300 hover:scale-105 uppercase tracking-wider"
                    >
                      🗑️ Delete
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
