import { create } from 'zustand';










export const useUiStore = create()((set) => ({
  mobileMenuOpen: false,
  filterDrawerOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  openFilterDrawer: () => set({ filterDrawerOpen: true }),
  closeFilterDrawer: () => set({ filterDrawerOpen: false })
}));