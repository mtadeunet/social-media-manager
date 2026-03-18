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
    <div className="bg-gray-800 rounded-2xl p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 drop-shadow">
            Search
          </label>
          <input
            type="text"
            value={filters.searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by filename..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all placeholder-gray-400 text-white"
          />
        </div>

        {/* Upload Filter */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 drop-shadow">
            Upload Filter
          </label>
          <select
            value={filters.uploadFilter}
            onChange={handleUploadFilterChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white"
          >
            <option value="none">All Uploads</option>
            <option value="last-session">Last Upload Session</option>
            <option value="time-range">Time Range</option>
          </select>
        </div>

        {/* Time Range Filter (shown when time-range is selected) */}
        {filters.uploadFilter === 'time-range' && (
          <div>
            <label className="block text-sm font-medium text-white mb-2 drop-shadow">
              Time Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={filters.timeRangeFilter.value}
                onChange={handleTimeRangeValueChange}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white text-center"
              />
              <select
                value={filters.timeRangeFilter.unit}
                onChange={handleTimeRangeUnitChange}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all text-white"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Second Row - Options and Clear Button */}
      <div className="flex items-center justify-between">
        {/* Show Usable Only Checkbox */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showUsableOnly}
            onChange={handleUsableOnlyChange}
            className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-white">Show usable only</span>
        </label>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm font-medium transition-all duration-200 border border-gray-600"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
