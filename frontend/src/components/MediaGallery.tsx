import React from 'react';
import type { MediaFile } from '../types/post';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  invalidFiles?: any[];
  onDelete: (mediaId: number) => void;
  onImportInvalidFile: (filename: string, targetStage: string) => void;
  selectedMediaStage?: 'original' | 'framed' | 'detailed';
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ mediaFiles, invalidFiles = [], onDelete, onImportInvalidFile, selectedMediaStage = 'original' }) => {
  console.log('MediaGallery rendering with', mediaFiles.length, 'media files and', invalidFiles.length, 'invalid files at stage:', selectedMediaStage);
  console.log('Invalid files:', invalidFiles);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Helper function to get thumbnail path for invalid files
  const getInvalidFileThumbnailPath = (invalidFile: any) => {
    // Generate thumbnail path based on file naming convention
    const baseName = invalidFile.base_name;
    const stage = invalidFile.stage;
    const thumbnailPath = `media/drafts/post_1/thumbnails/${baseName}_${stage}_thumb.jpg`;
    return thumbnailPath;
  };

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

  // Helper function to get the actual filename for the selected stage
  const getStageFilename = (media: MediaFile, stage: 'original' | 'framed' | 'detailed') => {
    const filePath = getFilePathForStage(media, stage);
    if (filePath) {
      // Extract filename from path
      const pathParts = filePath.split('/');
      return pathParts[pathParts.length - 1];
    }
    // Fallback to base filename + extension
    return `${media.base_filename}${media.file_extension}`;
  };

  // Helper function to check if media exists at a particular stage
  const mediaExistsAtStage = (media: MediaFile, stage: 'original' | 'framed' | 'detailed') => {
    return !!getFilePathForStage(media, stage);
  };

  // Filter media files to only show those that exist at the selected stage
  const filteredMediaFiles = mediaFiles
    .filter(media => mediaExistsAtStage(media, selectedMediaStage))
    .sort((a, b) => a.base_filename.localeCompare(b.base_filename));

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

  if (filteredMediaFiles.length === 0 && invalidFiles.length === 0) {
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
        {invalidFiles.length > 0 && (
          <span style={{
            marginLeft: '8px',
            fontSize: '14px',
            color: '#ef4444',
            fontWeight: '500'
          }}>
            + {invalidFiles.length} invalid
          </span>
        )}
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
                  {getThumbnailPathForStage(media, selectedMediaStage) ? (
                    <img
                      src={`/${getThumbnailPathForStage(media, selectedMediaStage)}`}
                      alt={`${media.base_filename} (${selectedMediaStage})`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.warn('Thumbnail failed to load, showing placeholder:', getThumbnailPathForStage(media, selectedMediaStage));
                        e.currentTarget.style.display = 'none';
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
                  {getThumbnailPathForStage(media, selectedMediaStage) ? (
                    <img
                      src={`/${getThumbnailPathForStage(media, selectedMediaStage)}`}
                      alt={`${media.base_filename} (${selectedMediaStage})`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.warn('Video thumbnail failed to load, showing placeholder:', getThumbnailPathForStage(media, selectedMediaStage));
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🎬</div>
                  )}
                </div>
              )}

              <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                {/* Filename Display */}
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  <span
                    title={getStageFilename(media, selectedMediaStage)}
                    style={{
                      display: 'inline-block',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'help'
                    }}
                  >
                    {getStageFilename(media, selectedMediaStage)}
                  </span>
                </div>

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
              </div>
            </div>
          );
        })}

        {/* Invalid Files - Show in all stages with red border */}
        {invalidFiles.map((invalidFile) => (
          <div
            key={`invalid-${invalidFile.filename}`}
            style={{
              border: '3px solid #ef4444', // Red border for invalid files
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'white',
              minWidth: '300px',
              maxWidth: '300px',
              width: '300px',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              // Show import button when hovering over entire card
              const importButton = e.currentTarget.querySelector('.import-button');
              if (importButton) {
                (importButton as HTMLElement).style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'translateY(0px)';
              // Hide import button when leaving card
              const importButton = e.currentTarget.querySelector('.import-button');
              if (importButton) {
                (importButton as HTMLElement).style.opacity = '0';
              }
            }}
          >
            {/* Import Button - Shows on hover over entire card */}
            <div
              className="import-button"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10,
                opacity: 0,
                transition: 'opacity 0.2s ease'
              }}
            >
              <button
                onClick={() => onImportInvalidFile(invalidFile.filename, selectedMediaStage)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                title={`Import to ${selectedMediaStage} stage`}
              >
                📥 Import
              </button>
            </div>

            {/* Invalid Badge */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px',
              zIndex: 5
            }}>
              INVALID
            </div>

            {/* Thumbnail */}
            <div style={{
              width: '100%',
              height: '180px',
              backgroundColor: '#fef2f2', // Light red background
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img
                src={`/${getInvalidFileThumbnailPath(invalidFile)}`}
                alt={invalidFile.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  opacity: 0.8 // Slightly transparent to indicate invalid state
                }}
                onError={(e) => {
                  console.warn('Invalid file thumbnail failed to load:', getInvalidFileThumbnailPath(invalidFile));
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* File Info */}
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                <span
                  title={`${invalidFile.base_name}_${invalidFile.stage}.${invalidFile.extension}`}
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'help'
                  }}
                >
                  {invalidFile.base_name}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500', marginBottom: '8px' }}>
                Stage: "{invalidFile.stage}" (invalid)
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                🖼️ Image • Hover to import
              </div>
            </div>
          </div>
        ))}
      </div>
    </div >
  );
};

export default MediaGallery;
