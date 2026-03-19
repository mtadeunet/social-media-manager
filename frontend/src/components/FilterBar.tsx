import React from 'react';
import type { FilterBarProps } from '../types/filters';

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ searchTerm: e.target.value });
  };

  const handleUsableOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ showUsableOnly: e.target.checked });
  };

  const handleUploadFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ uploadFilter: e.target.value as 'none' | 'last-session' | 'time-range' });
  };

  const handleTimeRangeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    onFiltersChange({
      timeRangeFilter: { ...filters.timeRangeFilter, value }
    });
  };

  const handleTimeRangeUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      timeRangeFilter: { ...filters.timeRangeFilter, unit: e.target.value as 'minutes' | 'hours' | 'days' }
    });
  };

  return (
    <div className="bg-gray-800 rounded-xl px-4 py-3 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={filters.searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by filename..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all placeholder-gray-400 text-white text-sm"
          />
        </div>

        {/* Upload Filter */}
        <div className="min-w-[150px]">
          <select
            value={filters.uploadFilter}
            onChange={handleUploadFilterChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-sm"
          >
            <option value="none">All Uploads</option>
            <option value="last-session">Last Session</option>
            <option value="time-range">Time Range</option>
          </select>
        </div>

        {/* Time Range Filter (shown when time-range is selected) */}
        {filters.uploadFilter === 'time-range' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={filters.timeRangeFilter.value}
              onChange={handleTimeRangeValueChange}
              className="w-16 px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-sm text-center"
            />
            <select
              value={filters.timeRangeFilter.unit}
              onChange={handleTimeRangeUnitChange}
              className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-sm"
            >
              <option value="minutes">Min</option>
              <option value="hours">Hrs</option>
              <option value="days">Days</option>
            </select>
          </div>
        )}

        {/* Show Usable Only Checkbox */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showUsableOnly}
            onChange={handleUsableOnlyChange}
            className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-white">Usable only</span>
        </label>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm font-medium transition-all duration-200 border border-gray-600"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
