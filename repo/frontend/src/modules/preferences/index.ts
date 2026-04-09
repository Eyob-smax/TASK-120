/**
 * Preferences Module
 *
 * LocalStorage-backed lightweight user preferences including column
 * layouts, last-used filters, and search history capped at 50 entries.
 */

export { PreferenceStorage } from './storage';
export { SearchHistory } from './search-history';
export { ColumnLayoutManager } from './column-layout';
export { FilterStateManager } from './filter-state';
