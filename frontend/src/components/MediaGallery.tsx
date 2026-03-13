import React from 'react';
import type { MediaFile } from '../types/post';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onPromote: (mediaId: number, targetStage: string) => void;
  onDelete: (mediaId: number) => void;
  selectedMediaStage?: 'original' | 'framed' | 'detailed';
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ mediaFiles, onPromote, onDelete, selectedMediaStage = 'original' }) => {
  console.log('MediaGallery rendering with', mediaFiles.length, 'media files at stage:', selectedMediaStage);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Helper function to get the correct thumbnail path based on selected stage
  const getThumbnailPathForStage = (media: MediaFile, stage: 'original' | 'framed' | 'detailed') => {
    switch (stage) {
      case 'original':
        return media.original_thumbnail_path;
      case 'framed':
        return media.framed_thumbnail_path;
      case 'detailed':
        return media.detailed_thumbnail_path;
      default:
        return media.original_thumbnail_path;
    }
  };

  // Helper function to get the correct file path based on selected stage
  const getFilePathForStage = (media: MediaFile, stage: 'original' | 'framed' | 'detailed') => {
    switch (stage) {
      case 'original':
        return media.original_path;
      case 'framed':
        return media.framed_path;
      case 'detailed':
        return media.detailed_path;
      default:
        return media.original_path;
    }
  };

  // Helper function to check if media exists at a particular stage
  const mediaExistsAtStage = (media: MediaFile, stage: 'original' | 'framed' | 'detailed') => {
    return !!getFilePathForStage(media, stage);
  };

  // Filter media files to only show those that exist at the selected stage
  const filteredMediaFiles = mediaFiles.filter(media => mediaExistsAtStage(media, selectedMediaStage));

  // Add non-passive wheel event listener for horizontal scrolling
  React.useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      carousel.scrollLeft += e.deltaY * 6; // 6x the scroll speed
      console.log('Scrolling horizontally:', e.deltaY * 6);
    };

    // Add non-passive event listener
    carousel.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      carousel.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'original': return '#e5e7eb';
      case 'framed': return '#dbeafe';
      case 'detailed': return '#e9d5ff';
      default: return '#e5e7eb';
    }
  };

  const getStageTextColor = (stage: string) => {
    switch (stage) {
      case 'original': return '#374151';
      case 'framed': return '#1d4ed8';
      case 'detailed': return '#6b21a8';
      default: return '#374151';
    }
  };

  const getAvailableStages = (media: MediaFile) => {
    const stages = [];
    if (media.original_path && !media.framed_path) {
      stages.push({ value: 'framed', label: 'Promote to Framed' });
    }
    if (media.framed_path && !media.detailed_path) {
      stages.push({ value: 'detailed', label: 'Promote to Detailed' });
    }
    return stages;
  };

  if (filteredMediaFiles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
        <p style={{ fontSize: '16px' }}>
          No media files at <strong>{selectedMediaStage}</strong> stage
        </p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          {selectedMediaStage === 'original'
            ? 'Upload some files to get started'
            : `Promote media from ${selectedMediaStage === 'framed' ? 'Original' : 'Framed'} stage`
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
        Media Files at {selectedMediaStage.charAt(0).toUpperCase() + selectedMediaStage.slice(1)} Stage ({filteredMediaFiles.length})
      </h3>

      {/* Horizontal Carousel Container */}
      <div
        ref={carouselRef}
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '8px 4px 16px 4px',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin', // Firefox
          scrollbarColor: '#e5e7eb #f9fafb' // Firefox
        }}
      >
        {filteredMediaFiles.map((media) => {
          const currentStage = media.detailed_path ? 'detailed' : media.framed_path ? 'framed' : 'original';
          const availablePromotions = getAvailableStages(media);

          return (
            <div
              key={media.id}
              style={{
                border: '2px solid blue', // Debug: Blue border on each card
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white',
                minWidth: '300px', // Increased width to force overflow
                maxWidth: '300px',
                width: '300px', // Fixed width
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Thumbnail */}
              {media.file_type === 'image' && (
                <div style={{
                  width: '100%',
                  height: '180px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {mediaExistsAtStage(media, selectedMediaStage) && getThumbnailPathForStage(media, selectedMediaStage) ? (
                    <img
                      src={`/${getThumbnailPathForStage(media, selectedMediaStage)}`}
                      alt={`${media.base_filename} (${selectedMediaStage})`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🖼️</div>
                  )}
                </div>
              )}

              {/* Video Thumbnail */}
              {media.file_type === 'video' && (
                <div style={{
                  width: '100%',
                  height: '180px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {mediaExistsAtStage(media, selectedMediaStage) && getThumbnailPathForStage(media, selectedMediaStage) ? (
                    <img
                      src={`/${getThumbnailPathForStage(media, selectedMediaStage)}`}
                      alt={`${media.base_filename} (${selectedMediaStage})`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🎬</div>
                  )}
                </div>
              )}

              <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: getStageColor(currentStage),
                      color: getStageTextColor(currentStage),
                      fontWeight: '500'
                    }}
                  >
                    {currentStage}
                  </span>
                  <button
                    onClick={() => onDelete(media.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px'
                    }}
                    title="Delete media"
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  {media.base_filename}{media.file_extension}
                </div>

                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {media.file_type === 'image' ? '🖼️ Image' : '🎬 Video'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f9fafb' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  Available Stages:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {media.original_path && (
                    <div style={{ fontSize: '12px', color: '#374151' }}>
                      ✓ Original
                    </div>
                  )}
                  {media.framed_path && (
                    <div style={{ fontSize: '12px', color: '#1d4ed8' }}>
                      ✓ Framed
                    </div>
                  )}
                  {media.detailed_path && (
                    <div style={{ fontSize: '12px', color: '#6b21a8' }}>
                      ✓ Detailed
                    </div>
                  )}
                </div>

                {availablePromotions.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {availablePromotions.map(promo => (
                      <button
                        key={promo.value}
                        onClick={() => onPromote(media.id, promo.value)}
                        className="button"
                        style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                      >
                        ⬆️ {promo.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MediaGallery;
