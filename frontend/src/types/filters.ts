import { ContentType } from './mediaVault';

export interface FilterState {
  searchTerm: string;
  showUsableOnly: boolean;
  uploadFilter: 'none' | 'last-session' | 'time-range';
  timeRangeFilter: { value: number; unit: 'minutes' | 'hours' | 'days' };
}

export interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export interface SelectionControlsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  contentTypes?: ContentType[];
  selectedMediaIds?: Set<number>;
  mediaContentTypes?: Map<number, ContentType[]>;
  onToggleContentType?: (contentTypeId: number, add: boolean) => void;
}
