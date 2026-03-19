import React, { useState, useRef, useEffect } from 'react';
import { ContentType } from '../types/mediaVault';

interface MultiSelectComboBoxProps {
  options: ContentType[];
  selectedMediaIds?: Set<number>;
  mediaContentTypes?: Map<number, ContentType[]>;
  onToggleContentType: (contentTypeId: number, add: boolean) => void;
  placeholder?: string;
}

const MultiSelectComboBox: React.FC<MultiSelectComboBoxProps> = ({
  options,
  selectedMediaIds = new Set(),
  mediaContentTypes = new Map(),
  onToggleContentType,
  placeholder = "Select content types..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort options alphabetically
  const sortedOptions = [...options].sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredOptions = sortedOptions.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine checkbox state for tri-state behavior
  const getCheckboxState = (option: ContentType): 'checked' | 'indeterminate' | 'unchecked' => {
    if (selectedMediaIds.size === 0) {
      return 'unchecked';
    }

    let countWithContentType = 0;
    selectedMediaIds.forEach(mediaId => {
      const contentTypes = mediaContentTypes.get(mediaId) || [];
      if (contentTypes.some(ct => ct.id === option.id)) {
        countWithContentType++;
      }
    });

    if (countWithContentType === 0) {
      return 'unchecked';
    } else if (countWithContentType === selectedMediaIds.size) {
      return 'checked';
    } else {
      return 'indeterminate';
    }
  };

  const handleToggleOption = (option: ContentType) => {
    const checkboxState = getCheckboxState(option);
    
    // Tri-state toggle behavior:
    // - CHECKED: remove content type from ALL selected media
    // - UNDETERMINED: add content type to ALL selected media
    // - UNCHECKED: add content type to ALL selected media
    if (checkboxState === 'checked') {
      // Remove from all selected media
      onToggleContentType(option.id, false);
    } else {
      // Add to all selected media (both indeterminate and unchecked)
      onToggleContentType(option.id, true);
    }
  };


  return (
    <div ref={dropdownRef} className="relative min-w-[200px]">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm rounded-lg border border-purple-500 shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-white/80 truncate">{placeholder}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No content types found
              </div>
            ) : (
              filteredOptions.map(option => {
                const checkboxState = getCheckboxState(option);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggleOption(option)}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      checkboxState === 'checked' 
                        ? 'bg-purple-600 border-purple-600' 
                        : checkboxState === 'indeterminate'
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-500'
                    }`}>
                      {checkboxState === 'checked' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {checkboxState === 'indeterminate' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14" />
                        </svg>
                      )}
                    </div>

                    {/* Color Indicator */}
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />

                    {/* Name */}
                    <span className="flex-1 text-sm text-white">{option.name}</span>

                    {/* Icon if available */}
                    {option.icon && (
                      <span className="text-lg">{option.icon}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectComboBox;
