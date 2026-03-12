import React from 'react';
import type { MediaFile } from '../types/post';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onPromote: (mediaId: number, targetStage: string) => void;
  onDelete: (mediaId: number) => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ mediaFiles, onPromote, onDelete }) => {
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

  if (mediaFiles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
        <p style={{ fontSize: '16px' }}>No media files yet</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
        Media Files ({mediaFiles.length})
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {mediaFiles.map((media) => {
          const currentStage = media.detailed_path ? 'detailed' : media.framed_path ? 'framed' : 'original';
          const availablePromotions = getAvailableStages(media);
          
          return (
            <div
              key={media.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white'
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
                  {media.original_thumbnail_path ? (
                    <img 
                      src={`/${media.original_thumbnail_path}`}
                      alt={media.base_filename}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.error('Thumbnail failed to load:', media.original_thumbnail_path);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 48px">🖼️</div>';
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🖼️</div>
                  )}
                </div>
              )}
              {media.file_type === 'video' && (
                <div style={{ 
                  width: '100%', 
                  height: '180px', 
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '48px' }}>🎬</div>
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
