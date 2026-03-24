import { create } from 'zustand'

interface UiStore {
  mobileMenuOpen: boolean
  filterDrawerOpen: boolean
  openMobileMenu: () => void
  closeMobileMenu: () => void
  openFilterDrawer: () => void
  closeFilterDrawer: () => void
}

export const useUiStore = create<UiStore>()((set) => ({
  mobileMenuOpen: false,
  filterDrawerOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  openFilterDrawer: () => set({ filterDrawerOpen: true }),
  closeFilterDrawer: () => set({ filterDrawerOpen: false }),
}))
