import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  loading: false,
  error: null
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, { payload }) => {
      state.items = payload;
    },
    addToWishlist: (state, { payload }) => {
      if (!state.items.find(item => item.id === payload.id)) {
        state.items.push(payload);
      }
    },
    removeFromWishlist: (state, { payload }) => {
      state.items = state.items.filter(item => item.id !== payload);
    },
    clearWishlist: (state) => {
      state.items = [];
    },
    setLoading: (state, { payload }) => {
      state.loading = payload;
    },
    setError: (state, { payload }) => {
      state.error = payload;
    },
  },
});

export const {
  setWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  setLoading,
  setError
} = wishlistSlice.actions;

export default wishlistSlice.reducer; 