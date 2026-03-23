import React, { useEffect, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault, MediaVersion } from '../types/mediaVault';
import FilenameEditor from './FilenameEditor';
import MediaVersionTree from './MediaVersionTree';

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

  // Load versions when modal opens
  useEffect(() => {
    if (isOpen && media) {
      loadVersions();
      // Hide scrollbars when modal opens
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }, [isOpen, media]);

  // Restore scrollbars when modal closes
  useEffect(() => {
    return () => {
      // Cleanup: restore scrollbars
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadVersions = async () => {
    if (!media) return;

    setLoading(true);
    try {
      const response = await mediaVaultService.getMediaVersions(media.id);
      console.log('Loaded versions:', response);
      setVersions(response.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilenameUpdate = async (newFilename: string) => {
    if (!media) return;

    try {
      await mediaVaultService.updateFilename(media.id, newFilename);
      // Update media base filename in the modal
      media.baseFilename = newFilename;
    } catch (error) {
      console.error('Failed to update filename:', error);
      alert('Failed to update filename. Please try again.');
    }
  };

  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Media Versions</h2>
            <FilenameEditor
              filename={media.baseFilename?.replace(/_[a-f0-9]{4}$/, '') || 'Unknown'}
              onSave={handleFilenameUpdate}
            />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div>
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading versions...
            </div>
          ) : (
            <div className="p-4">
              <MediaVersionTree
                media={media}
                versions={versions}
                enhancementTags={enhancementTags}
                onVersionDeleted={() => {
                  loadVersions();
                  if (onVersionDeleted) onVersionDeleted();
                }}
              />
              <div className="text-gray-400 text-xs text-center mt-4">
                💡 Drag a version over another to create a branch (parent-child relationship)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaVersionModal;