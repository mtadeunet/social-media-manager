import React, { useState } from 'react';
import { mediaVaultService } from '../services/mediaVaultService';
import { EnhancementTag, MediaVault, MediaVersion } from '../types/mediaVault';
import TagDropdown from './TagDropdown';

interface MediaVersionTreeProps {
  media: MediaVault;
  versions: MediaVersion[];
  enhancementTags: EnhancementTag[];
  onVersionDeleted?: () => void;
}

const MediaVersionTree: React.FC<MediaVersionTreeProps> = ({
  media,
  versions,
  enhancementTags,
  onVersionDeleted
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [tagDropdownPosition, setTagDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Build grid positions
  const buildGrid = () => {
    const grid = new Map<string, MediaVersion>(); // key: "x,y"
    const positions = new Map<number, {x: number, y: number}>(); // versionId -> position
    
    // Find original version
    const originalVersion = versions.find(v => 
      v.enhancementTags?.some(tag => tag.name === 'original')
    );

    if (!originalVersion) return { grid, positions };

    // Place original at (0, 0)
    grid.set('0,0', originalVersion);
    positions.set(originalVersion.id, {x: 0, y: 0});

    // Place children based on parent positions
    versions.forEach(version => {
      if (version.parentVersionId && positions.has(version.parentVersionId)) {
        const parentPos = positions.get(version.parentVersionId)!;
        let x = parentPos.x + 1;
        let y = parentPos.y;
        let row = 0;

        // Find first available cell in the column
        while (grid.has(`${x},${y}`)) {
          row++;
          y = parentPos.y + row;
        }

        grid.set(`${x},${y}`, version);
        positions.set(version.id, {x, y});
      }
    });

    return { grid, positions };
  };

  const { grid } = buildGrid();

  // Handle tag click to open dropdown
  const handleTagClick = (versionId: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // If clicking on the same version that's already open, close it
    if (editingVersion === versionId && tagDropdownPosition) {
      setTagDropdownPosition(null);
      setEditingVersion(null);
      return;
    }
    
    setEditingVersion(versionId);
    setTagDropdownPosition({
      top: rect.bottom,
      left: rect.left
    });
  };

  // Handle tag selection change
  const handleTagSelectionChange = async (versionId: number, newTags: EnhancementTag[]) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    try {
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

      setEditingVersion(null);
      setTagDropdownPosition(null);
      if (onVersionDeleted) onVersionDeleted();
    } catch (error) {
      console.error('Failed to update tags:', error);
      alert('Failed to update tags. Please try again.');
    }
  };

  // Calculate grid dimensions
  let maxX = 0, maxY = 0;
  grid.forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  // Render version card
  const renderVersionCard = (version: MediaVersion) => {
    const isOriginal = version.enhancementTags?.some(tag => tag.name === 'original');
    
    return (
      <div 
        className={`bg-gray-700 rounded-lg p-3 shadow-lg border border-gray-600 relative ${
          !isOriginal ? 'cursor-move' : ''
        }`}
        style={{ minWidth: '200px' }}
        draggable={!isOriginal}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', version.id.toString());
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const draggedVersionId = parseInt(e.dataTransfer.getData('text/plain'));
          if (draggedVersionId !== version.id) {
            try {
              await mediaVaultService.moveVersion(media.id, draggedVersionId, version.id);
              if (onVersionDeleted) onVersionDeleted();
            } catch (error) {
              console.error('Failed to create branch:', error);
            }
          }
        }}
      >
        {/* Delete button for non-original versions */}
        {!isOriginal && (
          <button
            onClick={async () => {
              if (confirm('Delete this version?')) {
                await mediaVaultService.deleteVersion(media.id, version.id);
                if (onVersionDeleted) onVersionDeleted();
              }
            }}
            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center text-xs"
            title="Delete version"
          >
            🗙
          </button>
        )}

        {/* Thumbnail - clickable to open full image */}
        <div 
          className="bg-gray-600 rounded mb-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative" 
          style={{ height: '120px' }}
          onClick={() => {
            if (version.filename) {
              const fullImageUrl = `http://localhost:8000/media/vault/2026/03/${version.filename}`;
              console.log('Opening full image:', fullImageUrl);
              setSelectedImage(fullImageUrl);
            }
          }}
        >
          {version.thumbnailPath ? (
            <img
              src={`http://localhost:8000/${version.thumbnailPath}`}
              alt={`Version ${version.id}`}
              style={{ 
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '120px',
                zIndex: 1,
                objectFit: 'contain'
              }}
              onLoad={(e) => {
                console.log('Thumbnail loaded successfully');
                console.log('Image element:', e.currentTarget);
                console.log('Image src:', e.currentTarget.src);
              }}
              onError={(e) => {
                console.error('Failed to load thumbnail:', `http://localhost:8000/${version.thumbnailPath}`);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No thumbnail
            </div>
          )}
        </div>

        {/* Tag pills */}
        <div className="text-center">
          {version.enhancementTags && version.enhancementTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-center">
              {version.enhancementTags.map(tag => {
                const validTag = enhancementTags.find(t => t.id === tag.id);
                const isInvalidTag = tag.name === 'invalid' && tag.notes;
                const displayName = isInvalidTag ? `invalid - ${tag.notes}` : tag.name;
                const isValid = validTag && tag.name !== 'invalid';
                const tagColor = isValid ? tag.color : '#dc2626';
                
                return (
                  <span
                    key={tag.id}
                    className="text-[10px] px-2 py-0.5 rounded-md font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: 'transparent',
                      color: tagColor + ' !important',
                      borderColor: tagColor
                    }}
                    onClick={(e) => handleTagClick(version.id, e)}
                    title={isInvalidTag
                      ? `Invalid tag: ${tag.notes || tag.name}`
                      : tag.description || tag.name
                    }
                  >
                    {displayName}
                    {isInvalidTag && (
                      <span className="ml-1 text-xs">⚠️</span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 justify-center">
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  borderColor: '#dc2626'
                }}
                onClick={(e) => handleTagClick(version.id, e)}
                title="Click to add tags"
              >
                no tags
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render grid
  const renderGrid = () => {
    const cells = [];
    
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        const key = `${x},${y}`;
        const version = grid.get(key);
        
        cells.push(
          <div
            key={key}
            className="border border-gray-800 flex items-start justify-center p-4"
            style={{
              width: '240px',
              height: '280px',
              gridColumn: x + 1,
              gridRow: y + 1
            }}
          >
            {version ? renderVersionCard(version) : null}
          </div>
        );
      }
    }
    
    return cells;
  };

  if (grid.size === 0) {
    return <div className="text-white">No versions found</div>;
  }

  return (
    <div className="relative">
      <div 
        className="bg-gray-900 rounded p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${maxX + 1}, 240px)`,
          gridTemplateRows: `repeat(${maxY + 1}, 280px)`,
          columnGap: '80px',
          rowGap: '20px'
        }}
      >
        {renderGrid()}
      </div>

      {/* Full image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size version"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Tag dropdown */}
      {tagDropdownPosition && editingVersion && (
        <TagDropdown
          availableTags={enhancementTags}
          selectedTags={versions.find(v => v.id === editingVersion)?.enhancementTags || []}
          onTagsChange={(newTags) => handleTagSelectionChange(editingVersion, newTags)}
          onClose={() => {
            setTagDropdownPosition(null);
            setEditingVersion(null);
          }}
          position={tagDropdownPosition}
        />
      )}
    </div>
  );
};

export default MediaVersionTree;
