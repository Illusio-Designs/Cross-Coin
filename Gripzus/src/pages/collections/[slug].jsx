// Clean collection URL: /collections/<slug>. Reuses the catalogue page, which
// reads router.query.slug and filters to that collection — so there's one
// source of truth for the product grid, filters and sort.
export { default } from '../products';
