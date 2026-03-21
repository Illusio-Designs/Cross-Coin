# Implementation Plan: Blog Management

## Overview

Implement a full-featured blogging system on the existing Express/Sequelize/MySQL backend. The implementation follows the established codebase patterns: Sequelize models with `utf8mb4_general_ci`, `associations.js` for all relationships, `imagekitService.js` for uploads, `slugify` for slug generation, and `sequelize.transaction()` for multi-table writes. All new files are JavaScript (CommonJS).

## Tasks

- [ ] 1. Create SQL migration file
  - Create `Backend/migrations/blog_tables.sql` with `CREATE TABLE IF NOT EXISTS` DDL for all 7 tables in dependency order: `blog_categories` → `blog_posts` → `blog_tags` → `blog_post_tags` → `blog_brands` → `blog_featured_products` → `blog_seo`
  - Include `author_name VARCHAR(255) NULL` column in `blog_posts` DDL
  - Use `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci` on every table
  - Copy the exact DDL from the design document's SQL Schema section
  - _Requirements: 14.3, 14.4_

- [ ] 2. Implement the 7 Sequelize models
  - [ ] 2.1 Create `Backend/model/blogCategoryModel.js`
    - Define `BlogCategory` model with fields: `id`, `name`, `slug` (UNIQUE), `description`, `status` (ENUM active/inactive, default active), `created_at`, `updated_at`
    - Use `tableName: 'blog_categories'`, `timestamps: false`, `charset: 'utf8mb4'`, `collate: 'utf8mb4_general_ci'`
    - Export as `{ BlogCategory }`
    - _Requirements: 3.1, 14.1_

  - [ ] 2.2 Create `Backend/model/blogPostModel.js`
    - Define `BlogPost` model with fields: `id`, `title`, `slug` (UNIQUE), `author_name` (nullable VARCHAR 255), `hero_image` (nullable VARCHAR 1000), `sections` (DataTypes.JSON, nullable), `status` (ENUM draft/published/archived, default draft), `published_at` (nullable DATETIME), `blog_category_id` (nullable FK INT)
    - Use `tableName: 'blog_posts'`, `timestamps: false`, `charset: 'utf8mb4'`, `collate: 'utf8mb4_general_ci'`
    - Export as `{ BlogPost }`
    - _Requirements: 1.9, 5.1, 10.1, 10.2, 13.1, 14.4_

  - [ ] 2.3 Create `Backend/model/blogTagModel.js`
    - Define `BlogTag` model with fields: `id`, `name` (UNIQUE), `slug` (UNIQUE), `created_at`, `updated_at`
    - Use `tableName: 'blog_tags'`, `timestamps: false`
    - Export as `{ BlogTag }`
    - _Requirements: 4.1, 14.1_

  - [ ] 2.4 Create `Backend/model/blogPostTagModel.js`
    - Define `BlogPostTag` junction model with composite PK: `blog_post_id` (FK → blog_posts), `blog_tag_id` (FK → blog_tags), both with `ON DELETE CASCADE`
    - Use `tableName: 'blog_post_tags'`, `timestamps: false`
    - Export as `{ BlogPostTag }`
    - _Requirements: 4.1, 14.1_

  - [ ] 2.5 Create `Backend/model/blogBrandModel.js`
    - Define `BlogBrand` junction model with composite PK: `blog_post_id` (FK → blog_posts), `brand_id` (FK → brands), both with `ON DELETE CASCADE`
    - Use `tableName: 'blog_brands'`, `timestamps: false`
    - Export as `{ BlogBrand }`
    - _Requirements: 2.1, 14.1_

  - [ ] 2.6 Create `Backend/model/blogFeaturedProductModel.js`
    - Define `BlogFeaturedProduct` junction model with composite PK: `blog_post_id` (FK → blog_posts), `product_id` (FK → products), plus `lifestyle_tag` (nullable VARCHAR 255)
    - Use `tableName: 'blog_featured_products'`, `timestamps: false`
    - Export as `{ BlogFeaturedProduct }`
    - _Requirements: 6.1, 14.1_

  - [ ] 2.7 Create `Backend/model/blogSeoModel.js`
    - Define `BlogSEO` model mirroring `productSEOModel.js`: fields `id`, `blog_post_id` (UNIQUE FK), `meta_title`, `meta_description`, `meta_keywords`, `og_title`, `og_description`, `og_image`, `canonical_url`, `structured_data` (JSON), `created_at`, `updated_at`
    - Use `tableName: 'blog_seo'`, `timestamps: false`
    - Export as `{ BlogSEO }`
    - _Requirements: 7.1, 7.2, 14.1_

- [ ] 3. Update `associations.js`
  - Import all 7 blog models at the top of `Backend/model/associations.js`
  - Add all blog model names to `module.exports`
  - Register all 10 Sequelize associations from the design document's "Sequelize Associations" section: BlogPost↔BlogCategory (belongsTo/hasMany), BlogPost↔Brand through BlogBrand (belongsToMany both sides), BlogPost↔BlogTag through BlogPostTag (belongsToMany both sides), BlogPost↔Product through BlogFeaturedProduct (belongsToMany both sides), BlogPost↔BlogSEO (hasOne/belongsTo)
  - _Requirements: 14.5, 14.6_

- [ ] 4. Update `setupDatabase.js`
  - Add `createBlogTables()` async function to `Backend/scripts/setupDatabase.js` that executes each of the 7 `CREATE TABLE IF NOT EXISTS` SQL statements via `sequelize.query()`
  - Call `createBlogTables()` after the `await sequelize.sync(...)` line, consistent with the existing pattern
  - Log a confirmation message on success: `'✓ Blog tables created successfully'`
  - _Requirements: 14.1, 14.2, 14.7_

- [ ] 5. Checkpoint — verify models and DB setup
  - Ensure all 7 model files export correctly and `associations.js` has no import errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `blogController.js` — categories CRUD
  - Create `Backend/controller/blogController.js`
  - Implement `createCategory`, `getAllCategories`, `updateCategory`, `deleteCategory`
  - `createCategory`: validate `name` required, auto-generate `slug` via `slugify(name, { lower: true, strict: true })`, INSERT into `blog_categories`, return 201
  - `getAllCategories`: return all categories ordered by `name`
  - `updateCategory`: find by PK (404 if missing), update fields, regenerate slug if name changes
  - `deleteCategory`: find by PK (404 if missing), destroy (DB cascade sets `blog_category_id` to NULL on posts via `ON DELETE SET NULL`)
  - _Requirements: 3.1, 3.3_

- [ ] 7. Implement `blogController.js` — blog post CRUD
  - [ ] 7.1 Implement `createPost`
    - Validate `title` (required) and `brand_ids` (required non-empty array); return 400 if missing
    - Validate `sections` is a JSON array if provided; return 400 if invalid
    - Generate slug via `slugify(title, { lower: true, strict: true })`, check for collisions with `Op.like`, append numeric suffix if needed
    - Auto-set `published_at = new Date()` when `status === 'published'` and `published_at` is null
    - Open `sequelize.transaction()`: INSERT `blog_posts`, bulk-insert `blog_brands`, upsert `blog_seo` (create with nulls if no seo object), `findOrCreate` each tag then set `blog_post_tags`, validate each `product_id` exists (422 if not) then bulk-insert `blog_featured_products`; commit or rollback
    - Return 201 with full post including all associations
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 4.2, 4.3, 5.2, 5.3, 6.2, 6.3, 7.3, 7.5, 9.1, 10.3, 13.2_

  - [ ]* 7.2 Write property test for slug generation (Property 4)
    - **Property 4: Slug generation from title**
    - **Validates: Requirements 1.6, 1.7, 9.1, 9.2**

  - [ ]* 7.3 Write property test for brand_ids required validation (Property 5)
    - **Property 5: brand_ids required validation**
    - **Validates: Requirements 2.2**

  - [ ]* 7.4 Write property test for sections JSON validation (Property 11)
    - **Property 11: Invalid sections value returns 400**
    - **Validates: Requirements 5.3**

  - [ ] 7.5 Implement `getAllPostsAdmin`
    - Return all posts with full associations (Brands, BlogCategory, Tags, FeaturedProducts, BlogSEO)
    - Support optional filters: `brand_id` (join through BlogBrand), `status`, `category_id`
    - Support pagination: `page` (default 1), `limit` (default 20, clamped to max 100)
    - _Requirements: 1.2, 2.4, 12.2, 12.3, 12.4_

  - [ ]* 7.6 Write property test for admin limit clamping (Property 22)
    - **Property 22: Limit parameter is clamped**
    - **Validates: Requirements 11.6, 12.4**

  - [ ] 7.7 Implement `getPostByIdAdmin`
    - Find by PK with all associations; return 404 if not found
    - Include `author_name` in response
    - _Requirements: 1.3, 13.4_

  - [ ] 7.8 Implement `updatePost`
    - Find by PK (404 if missing)
    - Validate `brand_ids` non-empty if provided; validate `sections` is JSON array if provided
    - Regenerate slug from new title if title changes (collision check + suffix)
    - Auto-set `published_at` only if transitioning to `published` and current `published_at` is null; retain existing `published_at` on all other status changes
    - Open `sequelize.transaction()`: update `blog_posts`, delete-then-insert `blog_brands`, upsert `blog_seo`, delete-then-insert `blog_post_tags` (with `findOrCreate` for new tags), validate and delete-then-insert `blog_featured_products`; commit or rollback
    - _Requirements: 1.4, 2.3, 4.4, 6.4, 7.3, 10.3, 10.4_

  - [ ]* 7.9 Write property test for post create/update round-trip (Properties 1 & 2)
    - **Property 1: Blog post creation round-trip**
    - **Property 2: Blog post update round-trip**
    - **Validates: Requirements 1.1, 1.3, 1.4, 2.1, 2.3, 4.4, 6.4, 13.2**

  - [ ]* 7.10 Write property test for published_at logic (Properties 17 & 18)
    - **Property 17: published_at auto-set on first publish**
    - **Property 18: published_at retained on status change away from published**
    - **Validates: Requirements 10.3, 10.4**

  - [ ] 7.11 Implement `deletePost`
    - Find by PK (404 if missing)
    - Open `sequelize.transaction()`: destroy post (DB cascades remove blog_brands, blog_post_tags, blog_featured_products, blog_seo rows); commit or rollback
    - _Requirements: 1.5, 1.8_

  - [ ]* 7.12 Write property test for deletion cascade (Property 3)
    - **Property 3: Blog post deletion cascades**
    - **Validates: Requirements 1.5, 1.8**

- [ ] 8. Implement `blogController.js` — public API
  - [ ] 8.1 Implement `getPublicPosts`
    - Filter `status = 'published'` and join through BlogBrand where `brand_id = req.brandId` (set by `identifyBrand` middleware); return 400 if `req.brandId` is absent
    - Support filters: `category` (BlogCategory slug), `tag` (BlogTag slug), `page` (default 1), `limit` (default 10, clamped to max 50)
    - Include BlogCategory, Tags, FeaturedProducts (id, name, slug, hero_image, lifestyle_tag), BlogSEO, author_name
    - Return 200 with empty array when no posts found
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 13.4_

  - [ ]* 8.2 Write property test for public brand scoping (Properties 19 & 20)
    - **Property 19: Public API excludes non-published posts**
    - **Property 20: Public API is brand-scoped**
    - **Validates: Requirements 10.5, 11.1, 11.2**

  - [ ]* 8.3 Write property test for pagination and filters (Property 21)
    - **Property 21: Pagination and filter parameters are respected**
    - **Validates: Requirements 11.5, 12.3**

  - [ ] 8.4 Implement `getPublicPostBySlug`
    - Find published post by slug scoped to `req.brandId`; return 404 if not found
    - Include all associations including BlogCategory, Tags, FeaturedProducts, BlogSEO, author_name
    - _Requirements: 11.2, 3.4, 13.4_

  - [ ] 8.5 Implement `getAllTags`
    - Return all BlogTag records with `post_count` (count of associated published posts via BlogPostTag join)
    - _Requirements: 4.5_

  - [ ]* 8.6 Write property test for tags post count (Property 9)
    - **Property 9: Tags endpoint returns accurate post counts**
    - **Validates: Requirements 4.5**

- [ ] 9. Implement `blogController.js` — hero image upload
  - Implement `uploadHeroImage`
  - Validate MIME type is one of `image/jpeg`, `image/png`, `image/webp`; return 400 if not
  - If post already has a `hero_image`, call `imagekitService.deleteImage(post.hero_image)` before uploading new one
  - Upload file buffer to ImageKit `/blogs` folder via `imagekitService.uploadImage()`; store returned `filePath` in `hero_image` column
  - Return updated post record
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 9.1 Write property test for hero image upload (Property 15)
    - **Property 15: Hero image upload updates hero_image**
    - **Validates: Requirements 8.1, 8.3**

  - [ ]* 9.2 Write property test for non-image MIME rejection (Property 16)
    - **Property 16: Non-image MIME type returns 400**
    - **Validates: Requirements 8.4**

- [ ] 10. Checkpoint — verify controller logic
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Create `blogRoutes.js`
  - Create `Backend/routes/blogRoutes.js`
  - Import `isAuthenticated` and `authorize` from `authMiddleware.js`; import `upload` (multer instance) from `uploadMiddleware.js` or configure inline
  - Public routes (no auth): `GET /public` → `getPublicPosts`, `GET /public/:slug` → `getPublicPostBySlug`, `GET /tags` → `getAllTags`
  - Admin routes (wrapped with `isAuthenticated`, `authorize(['admin'])`):
    - `POST /admin/categories` → `createCategory`
    - `GET /admin/categories` → `getAllCategories`
    - `PUT /admin/categories/:id` → `updateCategory`
    - `DELETE /admin/categories/:id` → `deleteCategory`
    - `POST /admin/posts` → `createPost`
    - `GET /admin/posts` → `getAllPostsAdmin`
    - `GET /admin/posts/:id` → `getPostByIdAdmin`
    - `PUT /admin/posts/:id` → `updatePost`
    - `DELETE /admin/posts/:id` → `deletePost`
    - `POST /admin/posts/:id/hero-image` → `upload.single('image')`, `uploadHeroImage`
  - _Requirements: 1.1–1.5, 3.1, 8.1, 11.1, 11.2, 12.1_

  - [ ]* 11.1 Write property test for admin auth enforcement (Property 23)
    - **Property 23: Admin routes require authentication**
    - **Validates: Requirements 12.1**

- [ ] 12. Mount blog routes in `routesManager.js`
  - Add `const blogRoutes = require('./blogRoutes.js');` import to `Backend/routes/routesManager.js`
  - Add `router.use('/blogs', identifyBrand, blogRoutes);` after the existing route mounts
  - _Requirements: 11.1, 12.1_

- [ ] 13. Write unit tests in `blog.unit.test.js`
  - Create `Backend/tests/blog.unit.test.js`
  - Test slug generation: known title produces expected slug (e.g. `"Hello World"` → `"hello-world"`)
  - Test slug collision: second post with same title gets numeric suffix
  - Test missing `brand_ids` returns 400
  - Test null `author_name` is stored without error
  - Test `limit` clamping: public endpoint clamps to 50, admin endpoint clamps to 100
  - Test missing `X-Brand-Name` header returns 400 on public routes
  - Test hero image upload calls `imagekitService.uploadImage` with correct folder `/blogs`
  - Test invalid MIME type on hero image upload returns 400
  - Test SEO upsert: post created without `seo` object has `seo` key with all-null fields
  - _Requirements: 1.6, 1.7, 2.2, 7.5, 8.4, 9.1, 11.3, 11.6, 12.4, 13.3_

- [ ] 14. Write property-based tests in `blog.property.test.js`
  - Create `Backend/tests/blog.property.test.js`
  - Install `fast-check` if not already present (`npm install --save-dev fast-check`)
  - Configure each test with `numRuns: 100`
  - Tag each test with `// Feature: blog-management, Property N: <text>`

  - [ ]* 14.1 Write property test for blog post creation round-trip (Property 1)
    - **Property 1: Blog post creation round-trip**
    - **Validates: Requirements 1.1, 1.3, 2.1, 13.2**

  - [ ]* 14.2 Write property test for blog post update round-trip (Property 2)
    - **Property 2: Blog post update round-trip**
    - **Validates: Requirements 1.4, 2.3, 4.4, 6.4**

  - [ ]* 14.3 Write property test for deletion cascade (Property 3)
    - **Property 3: Blog post deletion cascades**
    - **Validates: Requirements 1.5, 1.8**

  - [ ]* 14.4 Write property test for slug generation (Property 4)
    - **Property 4: Slug generation from title**
    - **Validates: Requirements 1.6, 1.7, 9.1, 9.2**

  - [ ]* 14.5 Write property test for brand_ids validation (Property 5)
    - **Property 5: brand_ids required validation**
    - **Validates: Requirements 2.2**

  - [ ]* 14.6 Write property test for category CRUD round-trip (Property 6)
    - **Property 6: Blog category CRUD round-trip**
    - **Validates: Requirements 3.1**

  - [ ]* 14.7 Write property test for category deletion nullifies FK (Property 7)
    - **Property 7: Category deletion nullifies blog_category_id**
    - **Validates: Requirements 3.3**

  - [ ]* 14.8 Write property test for tags findOrCreate round-trip (Property 8)
    - **Property 8: Tags round-trip with findOrCreate**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 14.9 Write property test for tags post count (Property 9)
    - **Property 9: Tags endpoint returns accurate post counts**
    - **Validates: Requirements 4.5**

  - [ ]* 14.10 Write property test for sections JSON round-trip (Property 10)
    - **Property 10: Sections JSON round-trip**
    - **Validates: Requirements 5.2, 5.4**

  - [ ]* 14.11 Write property test for invalid sections (Property 11)
    - **Property 11: Invalid sections value returns 400**
    - **Validates: Requirements 5.3**

  - [ ]* 14.12 Write property test for featured products round-trip (Property 12)
    - **Property 12: Featured products round-trip**
    - **Validates: Requirements 6.2, 6.5**

  - [ ]* 14.13 Write property test for invalid product_id (Property 13)
    - **Property 13: Invalid product_id returns 422**
    - **Validates: Requirements 6.3**

  - [ ]* 14.14 Write property test for SEO upsert round-trip (Property 14)
    - **Property 14: SEO upsert round-trip**
    - **Validates: Requirements 7.3, 7.4, 7.5**

  - [ ]* 14.15 Write property test for hero image upload (Property 15)
    - **Property 15: Hero image upload updates hero_image**
    - **Validates: Requirements 8.1, 8.3**

  - [ ]* 14.16 Write property test for non-image MIME rejection (Property 16)
    - **Property 16: Non-image MIME type returns 400**
    - **Validates: Requirements 8.4**

  - [ ]* 14.17 Write property test for published_at auto-set (Property 17)
    - **Property 17: published_at auto-set on first publish**
    - **Validates: Requirements 10.3**

  - [ ]* 14.18 Write property test for published_at retention (Property 18)
    - **Property 18: published_at retained on status change away from published**
    - **Validates: Requirements 10.4**

  - [ ]* 14.19 Write property test for public API excludes non-published (Property 19)
    - **Property 19: Public API excludes non-published posts**
    - **Validates: Requirements 10.5, 11.1**

  - [ ]* 14.20 Write property test for public API brand scoping (Property 20)
    - **Property 20: Public API is brand-scoped**
    - **Validates: Requirements 11.1, 11.2**

  - [ ]* 14.21 Write property test for pagination and filters (Property 21)
    - **Property 21: Pagination and filter parameters are respected**
    - **Validates: Requirements 11.5, 12.3**

  - [ ]* 14.22 Write property test for limit clamping (Property 22)
    - **Property 22: Limit parameter is clamped**
    - **Validates: Requirements 11.6, 12.4**

  - [ ]* 14.23 Write property test for admin auth enforcement (Property 23)
    - **Property 23: Admin routes require authentication**
    - **Validates: Requirements 12.1**

  - [ ]* 14.24 Write property test for admin cross-brand visibility (Property 24)
    - **Property 24: Admin API returns posts across all brands and statuses**
    - **Validates: Requirements 12.2**

- [ ] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties across all inputs; unit tests validate specific examples and edge cases
- The `fast-check` library must be installed before running property tests: `npm install --save-dev fast-check` inside `Backend/`
