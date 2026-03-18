import React from 'react';
import type { SelectionControlsProps } from '../types/filters';

const SelectionControls: React.FC<SelectionControlsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected
}) => {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-medium drop-shadow">
          Showing {totalCount} file{totalCount !== 1 ? 's' : ''}
          {totalCount > 0 && (
            <button
              onClick={onSelectAll}
              className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md border border-blue-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              Select All
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">
            {selectedCount} of {totalCount} file{totalCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onSelectAll}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md border border-blue-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md border border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
          >
            Clear Selection
          </button>
        </div>
        
        <button
          onClick={onDeleteSelected}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg border border-red-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
        >
          Delete Selected ({selectedCount})
        </button>
      </div>
    </div>
  );
};

export default SelectionControls;
