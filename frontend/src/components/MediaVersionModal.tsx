import React, { useEffect, useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault, MediaVersion } from '../types/mediaVault';
import FilenameEditor from './FilenameEditor';
import TagDropdown from './TagDropdown';
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
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [tagDropdownPosition, setTagDropdownPosition] = useState<{ top: number; left: number } | null>(null);

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

  const handleDeleteVersion = async (versionId: number) => {
    if (!media) return;

    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    try {
      await mediaVaultService.deleteVersion(media.id, versionId);
      await loadVersions();

      if (onVersionDeleted) {
        onVersionDeleted();
      }

      if (versions.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version. Please try again.');
    }
  };

  const handleTagClick = (versionId: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setEditingVersion(versionId);
    setTagDropdownPosition({
      top: rect.bottom + 5,
      left: rect.left
    });
  };

  const [dragOverVersionId, setDragOverVersionId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, versionId: number) => {
    e.dataTransfer.setData('text/plain', versionId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, versionId: number) => {
    e.preventDefault();
    if (dragOverVersionId !== versionId) {
      setDragOverVersionId(versionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the entire card, not entering child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverVersionId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetVersionId: number) => {
    e.preventDefault();
    setDragOverVersionId(null);
    
    const draggedVersionId = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (draggedVersionId === targetVersionId) {
      return; // Can't drop on itself
    }
    
    try {
      console.log('Starting drop operation...');
      setLoading(true);
      
      // Get the versions to understand current relationships
      const draggedVersion = versions.find(v => v.id === draggedVersionId);
      const targetVersion = versions.find(v => v.id === targetVersionId);
      
      if (!draggedVersion || !targetVersion) return;
      
      console.log('Branching: making', targetVersionId, 'parent of', draggedVersionId);
      console.log('Calling moveVersion with:', media!.id, draggedVersionId, targetVersionId);
      
      // Set the target as parent of the dragged version
      await mediaVaultService.moveVersion(media!.id, draggedVersionId, targetVersionId);
      
      console.log('Branching completed, reloading versions...');
      
      // Reload versions to reflect the change
      await loadVersions();
      
      if (onVersionDeleted) {
        onVersionDeleted();
      }
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert('Failed to create branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagSelectionChange = async (versionId: number, newTags: EnhancementTag[]) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    try {
      setLoading(true);
      
      const currentTagIds = version.enhancementTags?.map(t => t.id) || [];
      const newTagIds = newTags.map(t => t.id);

      const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id) && id !== 2); // Don't remove original tag

      const invalidTagsToRemove = version.enhancementTags?.filter(t => 
        t.name === 'invalid' && t.notes && !newTagIds.includes(t.id)
      ).map(t => t.notes || '') || [];

      await mediaVaultService.updateVersionTags(versionId, {
        tagsToAdd,
        tagsToRemove,
        invalidTagsToRemove
      });

      await loadVersions();
      setEditingVersion(null);
      setTagDropdownPosition(null);
    } catch (error) {
      console.error('Failed to update tags:', error);
      alert('Failed to update tags. Please try again.');
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

  // Simple tree rendering without reactflow
  const renderVersionTree = () => {
    console.log('Rendering versions tree, versions:', versions);
    console.log('All versions details:');
    versions.forEach(v => {
      console.log(`  Version ${v.id}: tags=${v.enhancementTags?.map(t => t.name).join(',') || 'none'}, parent=${v.parentVersionId}`);
    });
    
    // Find original version (root)
    const originalVersion = versions.find(v => 
      v.enhancementTags?.some(tag => tag.name === 'original')
    );

    if (!originalVersion) {
      console.log('No original version found');
      return <div className="text-white">No original version found</div>;
    }

    console.log('Original version:', originalVersion);

    // Build tree map - include ALL versions, not just ones with parents
    const childrenMap = new Map<number, MediaVersion[]>();
    const rootVersions: MediaVersion[] = [];
    
    versions.forEach(v => {
      if (v.parentVersionId) {
        if (!childrenMap.has(v.parentVersionId)) {
          childrenMap.set(v.parentVersionId, []);
        }
        childrenMap.get(v.parentVersionId)!.push(v);
      } else {
        // This is a root version (no parent)
        if (v.id !== originalVersion.id) {
          rootVersions.push(v);
        }
      }
    });

    console.log('Root versions (no parent):', rootVersions.map(v => v.id));
    console.log('Children map:', Array.from(childrenMap.entries()).map(([k, v]) => [k, v.map(c => c.id)]));
    
    // For debugging, let's also check what versions have parentVersionId
    console.log('Versions with parents:');
    versions.forEach(v => {
      if (v.parentVersionId) {
        console.log(`  Version ${v.id} has parent ${v.parentVersionId}`);
      }
    });

    // Render version node
    const renderVersionNode = (version: MediaVersion, level: number = 0) => {
      const isOriginal = version.id === originalVersion.id;
      const hasNoTags = !version.enhancementTags || version.enhancementTags.length === 0;
      const hasInvalidTag = version.enhancementTags?.some(tag => tag.name === 'invalid');
      const children = childrenMap.get(version.id) || [];

      return (
        <div 
          key={version.id} 
          className="flex flex-col items-start"
        >
          <div 
            className={`bg-gray-700 rounded-lg p-3 shadow-lg border border-gray-600 relative ${!isOriginal ? 'cursor-move' : ''} ${
              dragOverVersionId === version.id ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{ minWidth: '200px' }}
            draggable={!isOriginal}
            onDragStart={(e) => handleDragStart(e, version.id)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, version.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, version.id)}
          >
            {/* Drag indicator for non-original versions */}
            {!isOriginal && (
              <div className="absolute top-1 left-1 text-gray-400 text-xs cursor-move">
                ⋮⋮
              </div>
            )}
            {/* Delete button for non-original versions */}
            {!isOriginal && (
              <button
                onClick={() => handleDeleteVersion(version.id)}
                className="float-right w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center text-xs"
                title="Delete version"
              >
                🗑️
              </button>
            )}

            {/* Thumbnail */}
            <div className="bg-gray-600 rounded mb-2 overflow-hidden" style={{ height: '120px' }}>
              {version.thumbnailPath ? (
                <img
                  src={`/${version.thumbnailPath}`}
                  alt={`Version ${version.id}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No thumbnail
                </div>
              )}
            </div>

            {/* Version info */}
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Version {version.id}</div>
              {version.enhancementTags && version.enhancementTags.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {version.enhancementTags.map(tag => (
                    <span
                      key={tag.id}
                      className={`text-xs px-1 rounded ${
                        tag.name === 'original' ? 'bg-blue-900 text-blue-200' :
                        tag.name === 'edit' ? 'bg-green-900 text-green-200' :
                        tag.name === 'invalid' ? 'bg-red-900 text-red-200' :
                        'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-8">
        {/* Render original version and first child horizontally */}
        <div className="flex gap-20 items-start">
          {renderVersionNode(originalVersion)}
          {childrenMap.get(originalVersion.id)?.length > 0 && (
            <div className="flex items-start relative">
              <div className="absolute -top-8 left-0 text-xs text-red-500 bg-white px-1">V6</div>
              {renderVersionNode(childrenMap.get(originalVersion.id)![0])}
            </div>
          )}
        </div>
        
        {/* Render remaining children vertically aligned below first child */}
        {childrenMap.get(originalVersion.id)?.slice(1).map((child, index) => (
          <div key={child.id} className="flex items-start relative" style={{ marginLeft: '280px' }}>
            <div className="absolute -top-8 left-0 text-xs text-blue-500 bg-white px-1">V7</div>
            {renderVersionNode(child)}
          </div>
        ))}
        
        {/* Render root versions (siblings) on separate lines */}
        {rootVersions.map(version => (
          <div key={version.id} className="flex gap-20 items-start ml-20">
            {renderVersionNode(version)}
          </div>
        ))}
        
        {/* Instructions */}
        <div className="text-gray-400 text-xs text-center mt-4">
          💡 Drag a version over another to create a branch (parent-child relationship)
        </div>
      </div>
    );
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