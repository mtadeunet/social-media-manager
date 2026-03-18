import React, { useEffect, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault, MediaVersion } from '../types/mediaVault';

interface MediaVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaVault | null;
  enhancementTags: EnhancementTag[];
  onVersionDeleted?: () => void;
}

const MediaVersionModal: React.FC<MediaVersionModalProps> = ({
  isOpen,
  onClose,
  media,
  enhancementTags,
  onVersionDeleted
}) => {
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && media) {
      loadVersions();
    }
  }, [isOpen, media]);

  const loadVersions = async () => {
    if (!media) return;

    setLoading(true);
    try {
      const response = await mediaVaultService.getMediaVersions(media.id);
      setVersions(response.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!media) return;

    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    try {
      await mediaVaultService.deleteVersion(media.id, versionId);
      // Remove the deleted version from the state
      setVersions(versions.filter(v => v.id !== versionId));

      // Call the callback to refresh parent component
      if (onVersionDeleted) {
        onVersionDeleted();
      }

      // If this was the last version, close the modal
      if (versions.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version. Please try again.');
    }
  };

  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Media Versions - {media.base_filename.replace(/_[a-f0-9]{4}$/, '')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Loading versions...
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No versions found
          </div>
        ) : (
          <div className="space-y-4">
            {/* Version Flow */}
            <div className="flex items-center space-x-4 overflow-x-auto pb-4">
              {versions.map((version, index) => (
                <React.Fragment key={version.id}>
                  {/* Version Card */}
                  <div className="flex-shrink-0 group">
                    <div className="bg-gray-700 rounded-lg p-3" style={{ width: '256px' }}>

                      {/* Thumbnail */}
                      <div className="bg-gray-600 rounded-lg mb-3 overflow-hidden relative" style={{ height: '180px' }}>
                        {/* Delete button overlaying the thumbnail - Only for non-original versions */}
                        {!version.enhancement_tags?.some(tag => tag.name === 'original') && (
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
                              handleDeleteVersion(version.id);
                            }}
                            title="Delete version"
                          >
                            <span style={{
                              display: 'block',
                              textAlign: 'center',
                              lineHeight: '1',
                              margin: '0',
                              padding: '0'
                            }}>🗑️</span>
                          </div>
                        )}
                        {version.thumbnail_path ? (
                          <img
                            src={`http://localhost:8000/${version.thumbnail_path}`}
                            alt={`Version ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            📁
                          </div>
                        )}
                      </div>

                      {/* Version Info */}
                      <div className="text-center">
                        {/* Enhancement Tags */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {version.enhancement_tags && version.enhancement_tags.length > 0 &&
                            version.enhancement_tags.map((tag: EnhancementTag) => {
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
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  {index < versions.length - 1 && (
                    <div className="flex-shrink-0 text-gray-400 text-2xl">
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Sort Controls */}
            {versions.length > 1 && (
              <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-600">
                <span className="text-sm text-gray-400">Sort versions:</span>
                <button
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
                  onClick={() => {
                    const sortedVersions = [...versions].sort((a, b) =>
                      new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime()
                    );
                    // Keep original first, sort the rest
                    const original = sortedVersions[0];
                    const others = sortedVersions.slice(1).sort((a, b) =>
                      new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime()
                    );
                    setVersions([original, ...others]);
                  }}
                >
                  Date (Oldest)
                </button>
                <button
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
                  onClick={() => {
                    const original = versions[0];
                    const others = [...versions.slice(1)].sort((a, b) =>
                      new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
                    );
                    setVersions([original, ...others]);
                  }}
                >
                  Date (Newest)
                </button>
                <button
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
                  onClick={() => {
                    const original = versions[0];
                    const others = [...versions.slice(1)].sort((a, b) => {
                      const aTags = a.enhancement_tags?.map(t => t.name).join('') || '';
                      const bTags = b.enhancement_tags?.map(t => t.name).join('') || '';
                      return aTags.localeCompare(bTags);
                    });
                    setVersions([original, ...others]);
                  }}
                >
                  By Tag
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaVersionModal;
