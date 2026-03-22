import React, { useState, useRef, useEffect } from 'react';
import { EnhancementTag } from '../types/mediaVault';

interface TagDropdownProps {
  availableTags: EnhancementTag[];
  selectedTags: EnhancementTag[];
  onTagsChange: (tags: EnhancementTag[]) => void;
  disabled?: boolean;
  position?: { top: number; left: number };
}

const TagDropdown: React.FC<TagDropdownProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
  disabled = false,
  position
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (tag: EnhancementTag) => {
    // Don't allow removing original tag
    if (tag.name === 'original' && selectedTags.some(t => t.id === tag.id)) {
      return;
    }

    const isSelected = selectedTags.some(t => t.id === tag.id);
    let newTags: EnhancementTag[];

    if (isSelected) {
      newTags = selectedTags.filter(t => t.id !== tag.id);
    } else {
      newTags = [...selectedTags, tag];
    }

    onTagsChange(newTags);
  };

  const style = position ? {
    position: 'absolute' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 50
  } : {};

  return (
    <div ref={dropdownRef} className="relative" style={style}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-w-[200px] bg-gray-700 border border-gray-600 rounded-lg p-2 cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">
            {selectedTags.length === 0 ? 'Select tags...' : `${selectedTags.length} selected`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-600">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="p-2 text-gray-400 text-sm">No tags found</div>
            ) : (
              filteredTags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id);
                const isLocked = tag.name === 'original' && isSelected;

                return (
                  <div
                    key={tag.id}
                    onClick={() => !isLocked && handleToggle(tag)}
                    className={`flex items-center justify-between p-2 hover:bg-gray-700 cursor-pointer ${
                      isLocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-500"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-white text-sm">{tag.name}</span>
                      {isLocked && <span className="text-xs text-gray-500">🔒</span>}
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagDropdown;
