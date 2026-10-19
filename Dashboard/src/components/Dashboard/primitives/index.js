/**
 * Barrel for dashboard design-system primitives.
 *
 *   import { PageHeader, Panel, StatTile, StatGrid, FilterBar,
 *            ResponsiveTable, EmptyState } from '@/components/Dashboard/primitives';
 *
 * StatTile/StatGrid and EmptyState are the shared components from
 * components/ui (KpiTile/KpiGrid, EmptyState) under their older names.
 * Keep this file lean — only re-exports of the public primitives.
 */

export { default as PageHeader }       from './PageHeader.jsx';
export { default as Panel }            from './Panel.jsx';
export { default as StatTile, KpiGrid as StatGrid } from '../../ui/KpiTile.jsx';
export { default as FilterBar }        from './FilterBar.jsx';
export { default as ResponsiveTable }  from './ResponsiveTable.jsx';
export { default as EmptyState }       from '../../ui/EmptyState.jsx';
