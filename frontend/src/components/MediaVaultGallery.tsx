import React, { useEffect, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault } from '../types/mediaVault';
import MediaDropZone from './MediaDropZone';
import MediaVersionModal from './MediaVersionModal';

const MediaVaultGallery: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsableOnly, setShowUsableOnly] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Selection state
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);


  // Upload filter state
  const [uploadFilter, setUploadFilter] = useState<'none' | 'last-session' | 'time-range'>('none');
  const [timeRangeFilter, setTimeRangeFilter] = useState({ value: 10, unit: 'minutes' as const });

  // Tags state
  const [enhancementTags, setEnhancementTags] = useState<EnhancementTag[]>([]);

  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<MediaVault | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  useEffect(() => {
    loadMedia();
    loadTags();
  }, [searchTerm, showUsableOnly, uploadFilter, timeRangeFilter]);

  // Periodic connection check
  useEffect(() => {
    const interval = setInterval(checkBackendConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll();
      } else if (event.key === 'Escape') {
        handleClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mediaItems]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/');
      setBackendConnected(response.ok);
    } catch (error) {
      setBackendConnected(false);
    }
  };

  const loadMedia = async () => {
    try {
      setLoading(true);
      await checkBackendConnection();
      const response = await mediaVaultService.listMedia(0, 50);
      setMediaItems(response.media);
    } catch (error) {
      console.error('Failed to load media:', error);
      setMediaItems([]);
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const enhancement = await mediaVaultService.listEnhancementTags();
      setEnhancementTags(enhancement);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Selection handlers
  const handleMediaClick = (mediaId: number, index: number, event: React.MouseEvent) => {
    event.preventDefault();

    const media = mediaItems.find(item => item.id === mediaId);
    if (!media) return;

    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click: Toggle selection
      setSelectedMediaIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mediaId)) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        return newSet;
      });
      setLastSelectedIndex(index);
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: Select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = new Set<number>();
      for (let i = start; i <= end; i++) {
        if (mediaItems[i]) {
          rangeIds.add(mediaItems[i].id);
        }
      }
      setSelectedMediaIds(rangeIds);
    } else {
      // Normal click: Open version modal
      setSelectedMedia(media);
      setShowVersionModal(true);
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(mediaItems.map(item => item.id));
    setSelectedMediaIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedMediaIds(new Set());
    setLastSelectedIndex(null);
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Are you sure you want to delete this media and all its versions?')) return;

    try {
      await mediaVaultService.deleteMedia(mediaId);
      await loadMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMediaIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedMediaIds.size} media item(s) and all their versions?`)) return;

    try {
      for (const mediaId of selectedMediaIds) {
        await mediaVaultService.deleteMedia(mediaId);
      }
      setSelectedMediaIds(new Set());
      setLastSelectedIndex(null);
      await loadMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  // Check if a media item has invalid tags (tags that don't exist in enhancement_tags)
  const hasInvalidTags = (media: MediaVault): boolean => {
    if (!media.latest_version?.enhancement_tags) return false;
    const validTagIds = new Set(enhancementTags.map(t => t.id));
    return media.latest_version.enhancement_tags.some(tag => !validTagIds.has(tag.id));
  };

  // Remove hash suffix from filename for display
  const getDisplayFilename = (baseFilename: string): string => {
    // Remove the _hash4 suffix (e.g., "photo_b4e1" -> "photo")
    return baseFilename.replace(/_[a-f0-9]{4}$/, '');
  };


  const handleUploadSessionComplete = () => {
    // Refresh media after upload
    loadMedia();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gray-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gray-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gray-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-6xl font-bold text-white tracking-tight drop-shadow-lg">
              Media Vault
            </h1>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              backgroundColor: backendConnected ? '#065f46' : '#7f1d1d',
              border: `1px solid ${backendConnected ? '#10b981' : '#ef4444'}`
            }}>
              <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'} ${backendConnected ? 'animate-pulse' : ''}`}></div>
              <span className="text-sm font-medium text-white">
                {backendConnected ? 'Backend Connected' : 'Backend Offline'}
              </span>
            </div>
          </div>
          <p className="text-white/90 text-xl drop-shadow">Centralized media management with intelligent version tracking</p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-8 hover:bg-gray-750 transition-all duration-300">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Upload Media
          </h2>
          {!backendConnected && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg">
              <p className="text-red-200 text-sm">
                ⚠️ Backend is offline. File uploads will not work until the backend connection is restored.
              </p>
            </div>
          )}
          <MediaDropZone
            enhancementTags={enhancementTags}
            onUploadComplete={loadMedia}
            onUploadSessionComplete={handleUploadSessionComplete}
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-white font-medium drop-shadow">
                Showing {mediaItems.length} file{mediaItems.length !== 1 ? 's' : ''}
                {mediaItems.length > 0 && (
                  <span className="ml-4">
                    <button
                      onClick={handleSelectAll}
                      className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md border border-blue-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                    >
                      Select All
                    </button>
                    {selectedMediaIds.size > 0 && (
                      <>
                        <span className="ml-3">• {selectedMediaIds.size} selected</span>
                        <button
                          onClick={() => setSelectedMediaIds(new Set())}
                          className="ml-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md border border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md border border-red-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                        >
                          Delete Selected
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Upload Filter Dropdown */}
                <div className="relative">
                  <select
                    value={uploadFilter}
                    onChange={(e) => setUploadFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-sm"
                  >
                    <option value="none" className="bg-gray-700">All Uploads</option>
                    <option value="last-session" className="bg-gray-700">Last Upload Session</option>
                    <option value="time-range" className="bg-gray-700">Time Range</option>
                  </select>
                </div>

                {/* Time Range Filter (shown when time-range is selected) */}
                {uploadFilter === 'time-range' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={timeRangeFilter.unit}
                      onChange={(e) => setTimeRangeFilter(prev => ({ ...prev, unit: e.target.value as any }))}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-xs"
                    >
                      <option value="minutes" className="bg-gray-700">Minutes</option>
                      <option value="hours" className="bg-gray-700">Hours</option>
                      <option value="days" className="bg-gray-700">Days</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={timeRangeFilter.value}
                      onChange={(e) => setTimeRangeFilter(prev => ({ ...prev, value: parseInt(e.target.value) || 1 }))}
                      className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-xs text-center"
                    />
                  </div>
                )}

                {/* Clear Filters Button */}
                {(uploadFilter !== 'none' || searchTerm || showUsableOnly) && (
                  <button
                    onClick={() => {
                      setUploadFilter('none');
                      setSearchTerm('');
                      setShowUsableOnly(false);
                    }}
                    className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs font-medium transition-all duration-200 border border-gray-600"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by filename..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all placeholder-gray-400 text-white"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-3 cursor-pointer px-4 py-3 hover:bg-gray-700/50 transition-all w-full">
                  <input
                    type="checkbox"
                    checked={showUsableOnly}
                    onChange={(e) => setShowUsableOnly(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-white">Show usable only</span>
                </label>
              </div>
            </div>
          </div>
        </div>


        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-gray-400"></div>
            <p className="mt-4 text-white font-medium">Loading media...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-white text-2xl font-semibold mb-2">No media found</p>
            <p className="text-gray-400 text-lg">Upload your first media file to get started</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {mediaItems.map((media, index) => (
              <div
                key={media.id}
                className={`relative group cursor-pointer transition-all duration-200 ${selectedMediaIds.has(media.id)
                  ? 'ring-2 ring-blue-500'
                  : hasInvalidTags(media)
                    ? 'ring-2 ring-red-500'
                    : 'hover:scale-105'
                  }`}
                onClick={(e) => handleMediaClick(media.id, index, e)}
              >
                {/* Cell with thumbnail filling it */}
                <div className="aspect-square bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative overflow-hidden">
                  {/* Thumbnail fills the cell */}
                  <div className="absolute inset-0 p-[10px] pb-0">
                    {media.latest_version?.thumbnail_path ? (
                      <img
                        src={`http://localhost:8000/${media.latest_version.thumbnail_path}`}
                        alt={media.base_filename}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-700 rounded">
                        <span className="text-3xl">📁</span>
                      </div>
                    )}
                  </div>
                  {/* Selection button overlaying the thumbnail */}
                  <div
                    className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      width: '32px',
                      height: '32px',
                      zIndex: 10,
                      backgroundColor: selectedMediaIds.has(media.id) ? '#ef4444 !important' : '#22c55e !important',
                      backgroundImage: 'none !important',
                      background: selectedMediaIds.has(media.id) ? '#ef4444 !important' : '#22c55e !important',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: `2px solid ${selectedMediaIds.has(media.id) ? '#ef4444' : '#22c55e'}`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedMediaIds.has(media.id)) {
                        // Remove from selection
                        setSelectedMediaIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(media.id);
                          return newSet;
                        });
                      } else {
                        // Add to selection
                        setSelectedMediaIds(prev => new Set(prev).add(media.id));
                      }
                    }}
                  >
                    <span style={{
                      display: 'block',
                      textAlign: 'center',
                      lineHeight: '1',
                      margin: '0',
                      padding: '0'
                    }}>{selectedMediaIds.has(media.id) ? '-' : '+'}</span>
                  </div>

                  {/* Delete button overlaying the thumbnail */}
                  <div
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      width: '32px',
                      height: '32px',
                      zIndex: 10,
                      backgroundColor: '#dc2626 !important',
                      backgroundImage: 'none !important',
                      background: '#dc2626 !important',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '2px solid #dc2626',
                      marginRight: '10px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMedia(media.id);
                    }}
                    title="Delete media"
                  >
                    <span style={{
                      display: 'block',
                      textAlign: 'center',
                      lineHeight: '1',
                      margin: '0',
                      padding: '0'
                    }}>🗑️</span>
                  </div>
                </div>

                {/* Filename */}
                <div className="mt-1 px-1 text-center">
                  <h3 className="text-xs text-gray-300 truncate font-medium" title={media.base_filename}>
                    {getDisplayFilename(media.base_filename)}
                  </h3>
                </div>

                {/* Enhancement Tags */}
                {media.latest_version?.enhancement_tags && media.latest_version.enhancement_tags.length > 0 && (
                  <div className="mt-1 px-1 flex flex-wrap gap-1 justify-center">
                    {media.latest_version.enhancement_tags.map((tag: EnhancementTag) => {
                      const validTag = enhancementTags.find(t => t.id === tag.id);
                      // Check if this is an invalid tag with notes
                      const isInvalidTag = tag.name === 'invalid' && tag.notes;
                      // Get display name and validity
                      const displayName = isInvalidTag ? `invalid - ${tag.notes}` : tag.name;
                      const isValid = validTag && tag.name !== 'invalid';
                      const tagColor = isValid ? tag.color : '#dc2626';
                      return (
                        <span
                          key={tag.id}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                          style={{
                            backgroundColor: 'transparent',
                            color: tagColor + ' !important',
                            borderColor: tagColor
                          }}
                          title={isValid ? tag.description : `Invalid tag: ${tag.notes || tag.name}`}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Version Modal */}
      <MediaVersionModal
        isOpen={showVersionModal}
        onClose={() => {
          setShowVersionModal(false);
          setSelectedMedia(null);
        }}
        media={selectedMedia}
        enhancementTags={enhancementTags}
        onVersionDeleted={() => {
          loadMedia(); // Refresh the media list
        }}
      />
    </div>
  );
};

export default MediaVaultGallery;
