import React, { useCallback, useEffect, useState } from 'react';
import { contentTypeService, ContentTypeTag } from '../services/contentTypeService';
import { mediaVaultService } from '../services/mediaVaultService';
import type { FilterState } from '../types/filters';
import { EnhancementTag, MediaVault } from '../types/mediaVault';
import FilterBar from './FilterBar';
import MediaDropZone from './MediaDropZone';
import MediaVersionModal from './MediaVersionModal';
import SelectionControls from './SelectionControls';
import TagsManagementModal from './TagsManagementModal';

interface MediaVaultGalleryProps {
  showContentTypeModal: boolean;
  setShowContentTypeModal: (show: boolean) => void;
}

const MediaVaultGallery: React.FC<MediaVaultGalleryProps> = ({ 
  showContentTypeModal, 
  setShowContentTypeModal 
}) => {
  const [mediaItems, setMediaItems] = useState<MediaVault[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    showUsableOnly: false,
    uploadFilter: 'none',
    timeRangeFilter: { value: 10, unit: 'minutes' }
  });

  // Selection state
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Tags state
  const [enhancementTags, setEnhancementTags] = useState<EnhancementTag[]>([]);
  const [contentTypeTags, setContentTypeTags] = useState<ContentTypeTag[]>([]);

  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<MediaVault | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  useEffect(() => {
    loadMedia();
    loadTags();
  }, [filters.searchTerm, filters.showUsableOnly, filters.uploadFilter, filters.timeRangeFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll();
      } else if (event.key === 'Escape') {
        // Close all modals on Escape key
        if (showVersionModal) {
          setShowVersionModal(false);
          setSelectedMedia(null);
        }
        if (showContentTypeModal) {
          setShowContentTypeModal(false);
        }
        // Clear selection if no modals are open
        if (!showVersionModal && !showContentTypeModal) {
          handleClearSelection();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mediaItems, showVersionModal, showContentTypeModal]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await mediaVaultService.listMedia(0, 50);
      setMediaItems(response.media);
    } catch (error) {
      console.error('Failed to load media:', error);
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const [enhancement, contentTypes] = await Promise.all([
        mediaVaultService.listEnhancementTags(),
        contentTypeService.listContentTypes()
      ]);
      setEnhancementTags(enhancement);
      setContentTypeTags(contentTypes);
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
    if (!media.latestVersion?.enhancementTags) return false;
    const validTagIds = new Set(enhancementTags.map((t: EnhancementTag) => t.id));
    return media.latestVersion.enhancementTags.some((tag: any) => !validTagIds.has(tag.id));
  };

  // Remove hash suffix from filename for display
  const getDisplayFilename = (baseFilename: string | undefined): string => {
    if (!baseFilename) return 'Unknown';
    // Remove the _hash4 suffix (e.g., "photo_b4e1" -> "photo")
    return baseFilename.replace(/_[a-f0-9]{4}$/, '');
  };

  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      showUsableOnly: false,
      uploadFilter: 'none',
      timeRangeFilter: { value: 10, unit: 'minutes' }
    });
  }, []);

  const hasActiveFilters = Boolean(filters.searchTerm || filters.showUsableOnly || filters.uploadFilter !== 'none');

  const handleUploadSessionComplete = () => {
    // Refresh media after upload
    loadMedia();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gray-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gray-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gray-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                Media Vault
              </h1>
              <p className="text-white/70 text-sm">Centralized media management with intelligent version tracking</p>
            </div>
          </div>
          
          {/* Compact Upload Zone */}
          <div className="w-24 h-24">
            <MediaDropZone
              compact={true}
              onUploadComplete={loadMedia}
              onUploadSessionComplete={handleUploadSessionComplete}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Selection Controls */}
        <SelectionControls
          selectedCount={selectedMediaIds.size}
          totalCount={mediaItems.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onDeleteSelected={handleDeleteSelected}
        />

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
        <div className="grid gap-2 p-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
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
                <div className="absolute inset-0 p-[6px] pb-0">
                  {media.latestVersion?.thumbnailPath ? (
                    <img
                      src={`http://localhost:8000/${media.latestVersion.thumbnailPath}`}
                      alt={media.baseFilename}
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
                <h3 className="text-xs text-gray-300 truncate font-medium" title={media.baseFilename || 'Unknown'}>
                  {getDisplayFilename(media.baseFilename)}
                </h3>
              </div>

              {/* Enhancement Tags */}
              {media.latestVersion?.enhancementTags && media.latestVersion.enhancementTags.length > 0 && (
                <div className="mt-1 px-1 flex flex-wrap gap-1 justify-center">
                  {media.latestVersion.enhancementTags.map((tag: any) => {
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
                        className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
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

              {/* Content Type Tags */}
              {media.contentTypes && media.contentTypes.length > 0 && (
                <div className="mt-1 px-1 flex flex-wrap gap-1 justify-center">
                  {media.contentTypes.map((tag: any) => {
                    const validTag = contentTypeTags.find(t => t.id === tag.id);
                    const tagColor = validTag ? tag.color : '#6b7280';
                    return (
                      <span
                        key={tag.id}
                        className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                        style={{
                          backgroundColor: tagColor + ' !important',
                          color: '#ffffff !important',
                          borderColor: tagColor
                        }}
                        title={validTag ? tag.description : 'Content type tag'}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

      {/* Tags Management Modal */}
      <TagsManagementModal
        isOpen={showContentTypeModal}
        onClose={() => {
          setShowContentTypeModal(false);
        }}
        onTagsUpdated={() => {
          loadTags(); // Refresh the tags list
        }}
      />
    </div>
  );
};

export default MediaVaultGallery;
