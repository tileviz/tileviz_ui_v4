// ============================================================
//  utils/useDocumentTitle.ts — Dynamic browser tab title
//  Updates document.title on web to show page-specific titles
//  following industry standard: "Page Name | Brand" pattern.
// ============================================================
import { useEffect } from 'react';
import { Platform } from 'react-native';

const BRAND = 'TileViz';

/** Maps internal page keys to professional, user-facing titles */
const PAGE_TITLES: Record<string, string> = {
  visualizer: '3D Visualizer',
  catalog:    'Tile Catalog',
  saved:      'Saved Designs',
  inventory:  'Inventory Management',
  dashboard:  'Dashboard',
  admin:      'Admin Panel',
  zones:      'Zone Designer',
};

/**
 * Sets the browser tab title in "Page Name | TileViz" format.
 * No-op on native platforms.
 *
 * @param pageKey  — the internal activePage key (e.g. 'catalog')
 * @param suffix   — optional extra context (e.g. room type)
 */
export function useDocumentTitle(pageKey: string, suffix?: string) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const pageName = PAGE_TITLES[pageKey] || 'Home';
    const parts = [pageName];
    if (suffix) parts.push(suffix);
    parts.push(BRAND);

    document.title = parts.join(' — ');
  }, [pageKey, suffix]);
}

/**
 * Sets a one-off document title (for auth, intro, loading screens).
 * No-op on native platforms.
 */
export function useStaticDocumentTitle(title: string) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = `${title} — ${BRAND}`;
  }, [title]);
}
