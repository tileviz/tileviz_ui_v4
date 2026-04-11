// ============================================================
//  hooks/useLayout.ts — Responsive breakpoint hook
//  Central source of truth for layout decisions across all screens.
// ============================================================

import { useWindowDimensions } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface LayoutInfo {
  /** Current device type based on screen width */
  device: DeviceType;
  /** Whether the device is a phone (<600px) */
  isPhone: boolean;
  /** Whether the device is a tablet (600–1024px) */
  isTablet: boolean;
  /** Whether the device is desktop (>1024px) */
  isDesktop: boolean;
  /** Recommended number of grid columns for cards/tiles */
  columns: number;
  /** Current orientation */
  orientation: Orientation;
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Whether to show bottom tab bar (phone + small tablet) */
  showBottomTabs: boolean;
  /** Whether to show top header nav tabs (desktop + large tablet) */
  showTopNav: boolean;
  /** Sidebar width recommendation */
  sidebarWidth: number;
}

/**
 * Central responsive layout hook.
 * Use this in every screen/component that needs to adapt to screen size.
 *
 * Breakpoints:
 *  - Phone:   width < 600
 *  - Tablet:  600 ≤ width < 1024
 *  - Desktop: width ≥ 1024
 */
export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  const isPhone = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;

  const device: DeviceType = isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop';
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';

  // Grid columns: adapts for tile cards, saved designs, admin cards
  const columns = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Navigation layout
  const showBottomTabs = isPhone;
  const showTopNav = !isPhone; // tablet and desktop show top nav

  // Sidebar width
  const sidebarWidth = isDesktop ? 220 : isTablet ? 200 : 0;

  return {
    device,
    isPhone,
    isTablet,
    isDesktop,
    columns,
    orientation,
    width,
    height,
    showBottomTabs,
    showTopNav,
    sidebarWidth,
  };
}
