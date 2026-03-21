# Requirements Document

## Introduction

The Blog Management feature adds a full-featured blogging system to the multi-brand e-commerce backend. Each blog post belongs to one or more brands (via a junction table, consistent with the existing ProductBrand / SliderBrand pattern), has rich structured content stored as JSON, supports tags and blog-specific categories, links to existing products as featured items, carries per-post SEO metadata, and has a hero image uploaded via ImageKit. Public APIs are scoped by brand through the `X-Brand-Name` header; admin APIs see all posts across all brands.

## Glossary

- **Blog_Post**: A single blog article with a title, slug, hero image, structured content sections, tags, status, and publish date.
- **Blog_Category**: A brand-scoped taxonomy label for grouping blog posts (distinct from product categories).
- **Blog_Tag**: A free-form keyword associated with one or more blog posts.
- **Blog_Section**: A JSON object representing one content block inside a blog post (heading, body text, optional sub-sections, tips, hacks, etc.).
- **Blog_SEO**: Per-post SEO record (meta title, description, keywords, OG image, canonical URL), modelled after the existing `ProductSEO` table.
- **BlogBrand**: Junction table linking Blog_Post records to Brand records (many-to-many).
- **BlogFeaturedProduct**: Junction table linking a Blog_Post to existing Product records.
- **Blog_Controller**: The Express controller that handles all blog HTTP requests.
- **Blog_Service**: Optional service layer encapsulating business logic for blog operations.
- **ImageKit_Service**: The existing `imagekitService.js` used for image upload and optimisation.
- **Slug_Generator**: The existing `slugify`-based utility that produces URL-safe slugs from titles.
- **Brand_Middleware**: The existing middleware that resolves the active brand from the `X-Brand-Name` request header.
- **Admin**: An authenticated user with admin privileges who can manage all brands' content.
- **Public_Client**: An unauthenticated or authenticated storefront consumer that reads brand-scoped content.
- **Author_Name**: A plain string field on Blog_Post that credits the human author of the article; it is not a foreign key to the users table.
- **Setup_Script**: The `Backend/scripts/setupDatabase.js` Node.js script that provisions all database tables on first run.
- **Blog_Migration**: The standalone SQL file at `Backend/migrations/blog_tables.sql` containing `CREATE TABLE IF NOT EXISTS` DDL for all blog-related tables.

---

## Requirements

### Requirement 1: Blog Post CRUD

**User Story:** As an Admin, I want to create, read, update, and delete blog posts, so that I can manage editorial content across all brands.

#### Acceptance Criteria

1. THE Blog_Controller SHALL expose a `POST /api/admin/blogs` endpoint that creates a new Blog_Post record inside a database transaction.
2. THE Blog_Controller SHALL expose a `GET /api/admin/blogs` endpoint that returns all Blog_Post records with their associated brands, Blog_Category, tags, and Blog_SEO.
3. THE Blog_Controller SHALL expose a `GET /api/admin/blogs/:id` endpoint that returns a single Blog_Post by primary key, including all associations.
4. THE Blog_Controller SHALL expose a `PUT /api/admin/blogs/:id` endpoint that updates an existing Blog_Post record inside a database transaction.
5. THE Blog_Controller SHALL expose a `DELETE /api/admin/blogs/:id` endpoint that soft-deletes or hard-deletes a Blog_Post record.
6. WHEN a Blog_Post is created or updated, THE Slug_Generator SHALL derive the `slug` field from the `title` field using the same `slugify` configuration used for products.
7. IF a generated slug already exists in the `blog_posts` table, THEN THE Blog_Controller SHALL append a numeric suffix to produce a unique slug.
8. WHEN a Blog_Post is deleted, THE Blog_Controller SHALL also delete its associated Blog_SEO record, BlogBrand rows, BlogFeaturedProduct rows, and Blog_Tag junction rows within the same transaction.
9. THE Blog_Post model SHALL include an `author_name` column of type `VARCHAR(255)` that is nullable and stores a plain string crediting the author of the post.

---

### Requirement 2: Multi-Brand Association

**User Story:** As an Admin, I want to assign a blog post to one or more brands, so that the same post can appear on multiple brand storefronts.

#### Acceptance Criteria

1. THE Blog_Controller SHALL accept a `brand_ids` array in the create and update request body and persist the associations in the `blog_brands` junction table.
2. WHEN a Blog_Post is created with an empty or missing `brand_ids` array, THE Blog_Controller SHALL return HTTP 400 with a descriptive validation error.
3. THE Blog_Controller SHALL replace all existing BlogBrand rows for a post on update (delete-then-insert within the same transaction), consistent with the SliderBrand update pattern.
4. WHEN the Admin queries `GET /api/admin/blogs`, THE Blog_Controller SHALL include the associated Brand records (id, name, slug) in each Blog_Post response.

---

### Requirement 3: Blog Categories

**User Story:** As an Admin, I want to manage blog-specific categories, so that I can organise posts independently of product categories.

#### Acceptance Criteria

1. THE Blog_Controller SHALL expose `POST /api/admin/blog-categories`, `GET /api/admin/blog-categories`, `PUT /api/admin/blog-categories/:id`, and `DELETE /api/admin/blog-categories/:id` endpoints for Blog_Category CRUD.
2. THE Blog_Post model SHALL include a nullable `blog_category_id` foreign key referencing the `blog_categories` table.
3. WHEN a Blog_Category is deleted, THE Blog_Controller SHALL set `blog_category_id` to NULL on all associated Blog_Post records (`ON DELETE SET NULL`).
4. WHEN the Public_Client queries a blog post, THE Blog_Controller SHALL include the Blog_Category name and slug in the response.

---

### Requirement 4: Tags Support

**User Story:** As an Admin, I want to attach multiple tags to a blog post, so that readers can discover related content by tag.

#### Acceptance Criteria

1. THE Blog_Post model SHALL support a many-to-many relationship with Blog_Tag records through a `blog_post_tags` junction table.
2. THE Blog_Controller SHALL accept a `tags` string array in the create and update request body.
3. WHEN a tag string is provided that does not exist in the `blog_tags` table, THE Blog_Controller SHALL create the Blog_Tag record using `findOrCreate` before associating it with the Blog_Post.
4. WHEN a Blog_Post is updated, THE Blog_Controller SHALL replace all existing tag associations within the same transaction.
5. THE Blog_Controller SHALL expose a `GET /api/blogs/tags` public endpoint that returns all Blog_Tag records with their post counts.

---

### Requirement 5: Rich Content Sections

**User Story:** As an Admin, I want to store structured content sections as JSON, so that the frontend can render complex layouts including sub-sections, tips, and hacks without a fixed schema.

#### Acceptance Criteria

1. THE Blog_Post model SHALL include a `sections` column of type `JSON` (MySQL JSON type) that stores an array of Blog_Section objects.
2. THE Blog_Controller SHALL accept and persist any valid JSON array in the `sections` field without enforcing a fixed sub-schema at the database level.
3. WHEN the `sections` field is provided and is not a valid JSON array, THE Blog_Controller SHALL return HTTP 400 with a descriptive validation error.
4. THE Blog_Controller SHALL return the `sections` field as a parsed JSON array (not a raw string) in all read responses.

---

### Requirement 6: Featured Products Linking

**User Story:** As an Admin, I want to link existing products to a blog post as featured items, so that readers can discover and purchase products mentioned in the article.

#### Acceptance Criteria

1. THE Blog_Post model SHALL support a many-to-many relationship with the existing Product model through a `blog_featured_products` junction table that includes an optional `lifestyle_tag` string column.
2. THE Blog_Controller SHALL accept a `featured_products` array of objects (each with `product_id` and optional `lifestyle_tag`) in the create and update request body.
3. WHEN a `product_id` in the `featured_products` array does not reference an existing Product record, THE Blog_Controller SHALL return HTTP 422 with a descriptive error identifying the invalid product ID.
4. WHEN a Blog_Post is updated, THE Blog_Controller SHALL replace all existing BlogFeaturedProduct rows within the same transaction.
5. WHEN the Public_Client fetches a blog post, THE Blog_Controller SHALL include featured products with their id, name, slug, hero image, and `lifestyle_tag`.

---

### Requirement 7: Per-Post SEO Metadata

**User Story:** As an Admin, I want to set SEO metadata per blog post, so that each article is individually optimised for search engines.

#### Acceptance Criteria

1. THE Blog_Post model SHALL have a one-to-one association with a `Blog_SEO` record stored in a `blog_seo` table, modelled after the existing `product_seo` table.
2. THE `blog_seo` table SHALL include columns: `blog_post_id` (FK), `meta_title`, `meta_description`, `meta_keywords`, `og_title`, `og_description`, `og_image`, `canonical_url`, and `structured_data` (JSON).
3. THE Blog_Controller SHALL accept a nested `seo` object in the create and update request body and upsert the Blog_SEO record within the same transaction.
4. WHEN a Blog_Post is fetched, THE Blog_Controller SHALL include the associated Blog_SEO record in the response under a `seo` key.
5. IF no `seo` object is provided on create, THEN THE Blog_Controller SHALL create a Blog_SEO record with all fields set to NULL.

---

### Requirement 8: Hero Image Upload via ImageKit

**User Story:** As an Admin, I want to upload a hero image for each blog post via ImageKit, so that images are optimised and served from a CDN.

#### Acceptance Criteria

1. THE Blog_Controller SHALL expose a `POST /api/admin/blogs/:id/hero-image` endpoint that accepts a `multipart/form-data` request with a single image file.
2. WHEN a hero image is uploaded, THE ImageKit_Service SHALL upload the file to the `/blogs` folder in ImageKit and return a CDN URL.
3. THE Blog_Controller SHALL store the returned CDN URL in the `hero_image` column of the Blog_Post record.
4. WHEN the uploaded file is not an image MIME type (image/jpeg, image/png, image/webp), THE Blog_Controller SHALL return HTTP 400 with a descriptive error.
5. WHEN a new hero image is uploaded for a Blog_Post that already has a `hero_image` URL, THE ImageKit_Service SHALL delete the previous image from ImageKit before storing the new URL.

---

### Requirement 9: Slug Auto-Generation

**User Story:** As an Admin, I want slugs to be automatically generated from the blog post title, so that URLs are human-readable without manual input.

#### Acceptance Criteria

1. WHEN a Blog_Post is created without an explicit `slug` field, THE Slug_Generator SHALL produce a slug from the `title` using the same `slugify` options applied to products (lowercase, hyphen separator).
2. WHEN a Blog_Post is created with an explicit `slug` field, THE Blog_Controller SHALL use the provided value after applying `slugify` normalisation.
3. THE Blog_Post model SHALL enforce a unique index on the `slug` column.
4. WHEN a slug collision is detected at the database level, THE Blog_Controller SHALL catch the unique constraint error and return HTTP 409 with a descriptive message.

---

### Requirement 10: Status and Published Date

**User Story:** As an Admin, I want to control the publish status and date of each blog post, so that I can schedule and manage content visibility.

#### Acceptance Criteria

1. THE Blog_Post model SHALL include a `status` column of type `ENUM('draft', 'published', 'archived')` with a default value of `'draft'`.
2. THE Blog_Post model SHALL include a `published_at` column of type `DATETIME` that is nullable.
3. WHEN a Blog_Post `status` is set to `'published'` and `published_at` is NULL, THE Blog_Controller SHALL automatically set `published_at` to the current UTC timestamp.
4. WHEN a Blog_Post `status` is changed from `'published'` to `'draft'` or `'archived'`, THE Blog_Controller SHALL retain the existing `published_at` value unchanged.
5. WHILE a Blog_Post has `status = 'draft'` or `status = 'archived'`, THE Blog_Controller SHALL exclude it from all public-facing API responses.

---

### Requirement 11: Brand-Scoped Public API

**User Story:** As a Public_Client, I want to fetch blog posts filtered by the current brand, so that I only see content relevant to the storefront I am visiting.

#### Acceptance Criteria

1. THE Blog_Controller SHALL expose a `GET /api/blogs` public endpoint that returns only Blog_Post records with `status = 'published'` that are associated with the brand resolved from the `X-Brand-Name` request header via Brand_Middleware.
2. THE Blog_Controller SHALL expose a `GET /api/blogs/:slug` public endpoint that returns a single published Blog_Post by slug, scoped to the resolved brand.
3. WHEN the `X-Brand-Name` header is absent or resolves to no brand, THE Blog_Controller SHALL return HTTP 400 with a descriptive error.
4. WHEN no published Blog_Post records exist for the resolved brand, THE Blog_Controller SHALL return HTTP 200 with an empty array.
5. THE `GET /api/blogs` endpoint SHALL support optional query parameters: `category` (Blog_Category slug), `tag` (Blog_Tag slug), `page` (integer, default 1), and `limit` (integer, default 10, max 50) for filtering and pagination.
6. WHEN `limit` exceeds 50, THE Blog_Controller SHALL clamp the value to 50 and proceed without returning an error.

---

### Requirement 12: Admin Cross-Brand API

**User Story:** As an Admin, I want to view and manage blog posts across all brands without brand filtering, so that I have full editorial control from the admin panel.

#### Acceptance Criteria

1. THE Blog_Controller SHALL apply authentication middleware to all `/api/admin/blogs*` and `/api/admin/blog-categories*` routes, consistent with the existing admin route protection pattern.
2. THE `GET /api/admin/blogs` endpoint SHALL return all Blog_Post records regardless of brand or status, with full associations.
3. THE `GET /api/admin/blogs` endpoint SHALL support optional query parameters: `brand_id`, `status`, `category_id`, `page` (default 1), and `limit` (default 20, max 100) for filtering and pagination.
4. WHEN `limit` exceeds 100, THE Blog_Controller SHALL clamp the value to 100 and proceed without returning an error.

---

### Requirement 13: Author Attribution

**User Story:** As an Admin, I want to record a plain-text author name on each blog post, so that I can credit any author without requiring a user account.

#### Acceptance Criteria

1. THE Blog_Post model SHALL include an `author_name` column of type `VARCHAR(255)` that is nullable, storing a free-form string with no foreign-key constraint to the users table.
2. THE Blog_Controller SHALL accept an optional `author_name` string in the create and update request body and persist it on the Blog_Post record.
3. WHEN `author_name` is not provided on create, THE Blog_Controller SHALL store NULL in the `author_name` column without returning an error.
4. WHEN a Blog_Post is fetched by the Public_Client or Admin, THE Blog_Controller SHALL include the `author_name` field in the response.

---

### Requirement 14: Database Setup Integration

**User Story:** As a Developer, I want all blog tables created through the existing setup infrastructure, so that a fresh environment can be provisioned with a single command and the schema is version-controlled.

#### Acceptance Criteria

1. THE Setup_Script SHALL contain a `createBlogTables()` async function that creates the `blog_categories`, `blog_posts`, `blog_tags`, `blog_post_tags`, `blog_brands`, `blog_featured_products`, and `blog_seo` tables using `CREATE TABLE IF NOT EXISTS` raw SQL queries executed via `sequelize.query()`.
2. WHEN `setupDatabase()` runs, THE Setup_Script SHALL call `createBlogTables()` after the `sequelize.sync()` step, consistent with the pattern used for other raw-SQL table creation functions in the script.
3. THE Blog_Migration file (`Backend/migrations/blog_tables.sql`) SHALL contain the complete `CREATE TABLE IF NOT EXISTS` DDL statements for all seven blog-related tables (`blog_categories`, `blog_posts`, `blog_tags`, `blog_post_tags`, `blog_brands`, `blog_featured_products`, `blog_seo`), so that a developer can apply the schema manually against any environment.
4. THE `blog_posts` DDL in both the Setup_Script and the Blog_Migration SHALL include an `author_name VARCHAR(255) NULL` column.
5. THE `associations.js` file SHALL import all blog models (`BlogPost`, `BlogCategory`, `BlogTag`, `BlogPostTag`, `BlogBrand`, `BlogFeaturedProduct`, `BlogSEO`) and register the following Sequelize associations: BlogPost `belongsToMany` Brand through BlogBrand, BlogPost `belongsToMany` BlogTag through BlogPostTag, BlogPost `belongsToMany` Product through BlogFeaturedProduct, BlogPost `hasOne` BlogSEO, and BlogPost `belongsTo` BlogCategory.
6. THE `associations.js` file SHALL add all blog models to its `module.exports` object, following the same pattern as existing models such as `ProductBrand`, `SliderBrand`, and `CategoryBrand`.
7. WHEN `setupDatabase()` completes without error, THE Setup_Script SHALL log a confirmation message indicating that blog tables were created successfully.
