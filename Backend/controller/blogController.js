const {
  BlogPost, BlogCategory, BlogTag, BlogPostTag, BlogBrand,
  BlogFeaturedProduct, BlogSEO, Brand, Product
} = require('../model/associations.js');
const slugify = require('slugify');
const { sequelize } = require('../config/db.js');
const { Op } = require('sequelize');
const fs = require('fs/promises');
const imagekitService = require('../services/imagekitService.js');

// Format a blog post's hero_image to a full optimized ImageKit URL
const formatPostImage = (post) => {
  const data = post.toJSON ? post.toJSON() : { ...post };
  if (data.hero_image) {
    data.hero_image = imagekitService.getOptimizedUrl(data.hero_image, 'large');
  }
  return data;
};

// Full include array for blog posts
const fullPostInclude = () => [
  { model: BlogCategory, as: 'BlogCategory' },
  { model: Brand, as: 'Brands', through: { attributes: [] } },
  { model: BlogTag, as: 'Tags', through: { attributes: [] } },
  {
    model: Product, as: 'FeaturedProducts',
    through: { attributes: ['lifestyle_tag'] },
    attributes: ['id', 'name', 'slug']
  },
  { model: BlogSEO, as: 'BlogSEO' }
];

// Generate unique slug for blog posts
const generateUniqueSlug = async (base, excludeId = null) => {
  const where = { slug: { [Op.like]: `${base}%` } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await BlogPost.findAll({ where, attributes: ['slug'] });
  if (!existing.length) return base;
  return `${base}-${existing.length + 1}`;
};

// Generate unique slug for blog categories
const generateUniqueCategorySlug = async (base, excludeId = null) => {
  const where = { slug: { [Op.like]: `${base}%` } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await BlogCategory.findAll({ where, attributes: ['slug'] });
  if (!existing.length) return base;
  return `${base}-${existing.length + 1}`;
};

// ─── Category CRUD ────────────────────────────────────────────────────────────

const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const base = slugify(name, { lower: true, strict: true });
    const slug = await generateUniqueCategorySlug(base);
    const category = await BlogCategory.create({ name, slug, description, status });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('getAllCategories error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const category = await BlogCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Blog category not found' });
    }
    const updates = { description, status };
    if (name && name !== category.name) {
      updates.name = name;
      const base = slugify(name, { lower: true, strict: true });
      updates.slug = await generateUniqueCategorySlug(base, id);
    }
    await category.update(updates);
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BlogCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Blog category not found' });
    }
    await category.destroy();
    return res.status(200).json({ success: true, message: 'Blog category deleted successfully' });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─── Blog Post CRUD (Admin) ───────────────────────────────────────────────────

const createPost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      title, author_name, status = 'draft', brand_ids,
      tags = [], sections, seo, featured_products = []
    } = req.body;

    // Validate required fields
    if (!title) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    if (!Array.isArray(brand_ids) || brand_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'brand_ids is required and must be a non-empty array' });
    }

    // Validate sections
    let parsedSections = null;
    if (sections !== undefined && sections !== null) {
      const sectionsValue = typeof sections === 'string' ? (() => { try { return JSON.parse(sections); } catch { return null; } })() : sections;
      if (!Array.isArray(sectionsValue)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'sections must be a valid JSON array' });
      }
      parsedSections = sectionsValue;
    }

    // Generate slug
    const base = slugify(title, { lower: true, strict: true });
    const slug = await generateUniqueSlug(base);

    // Handle published_at
    let published_at = req.body.published_at || null;
    if (status === 'published' && !published_at) {
      published_at = new Date();
    }

    // Create post
    const post = await BlogPost.create(
      { title, slug, author_name, status, published_at, sections: parsedSections },
      { transaction: t }
    );

    // Associate brands
    const brandRows = brand_ids.map(brand_id => ({ blog_post_id: post.id, brand_id }));
    await BlogBrand.bulkCreate(brandRows, { transaction: t });

    // Upsert SEO
    const seoData = seo || {};
    await BlogSEO.create({
      blog_post_id: post.id,
      meta_title: seoData.meta_title || null,
      meta_description: seoData.meta_description || null,
      meta_keywords: seoData.meta_keywords || null,
      og_title: seoData.og_title || null,
      og_description: seoData.og_description || null,
      og_image: seoData.og_image || null,
      canonical_url: seoData.canonical_url || null,
      structured_data: seoData.structured_data || null,
    }, { transaction: t });

    // Handle tags (findOrCreate)
    if (tags.length > 0) {
      const tagIds = [];
      for (const tagName of tags) {
        const tagSlug = slugify(tagName, { lower: true, strict: true });
        const [tag] = await BlogTag.findOrCreate({
          where: { name: tagName },
          defaults: { name: tagName, slug: tagSlug },
          transaction: t
        });
        tagIds.push(tag.id);
      }
      const tagRows = tagIds.map(blog_tag_id => ({ blog_post_id: post.id, blog_tag_id }));
      await BlogPostTag.bulkCreate(tagRows, { transaction: t });
    }

    // Handle featured products
    if (featured_products.length > 0) {
      for (const fp of featured_products) {
        const product = await Product.findByPk(fp.product_id, { transaction: t });
        if (!product) {
          await t.rollback();
          return res.status(422).json({ success: false, message: `Product with id ${fp.product_id} does not exist` });
        }
      }
      const fpRows = featured_products.map(fp => ({
        blog_post_id: post.id,
        product_id: fp.product_id,
        lifestyle_tag: fp.lifestyle_tag || null
      }));
      await BlogFeaturedProduct.bulkCreate(fpRows, { transaction: t });
    }

    await t.commit();

    const fullPost = await BlogPost.findByPk(post.id, { include: fullPostInclude() });
    return res.status(201).json({ success: true, data: formatPostImage(fullPost) });
  } catch (error) {
    await t.rollback();
    console.error('createPost error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getAllPostsAdmin = async (req, res) => {
  try {
    const { brand_id, status, category_id, page = 1, limit = 20 } = req.query;
    const clampedLimit = Math.min(parseInt(limit) || 20, 100);
    const offset = (parseInt(page) - 1) * clampedLimit;

    const where = {};
    if (status) where.status = status;
    if (category_id) where.blog_category_id = category_id;

    const include = fullPostInclude();
    if (brand_id) {
      // Filter by brand via the Brands include
      const brandsInclude = include.find(i => i.as === 'Brands');
      brandsInclude.where = { id: brand_id };
      brandsInclude.required = true;
    }

    const { count, rows } = await BlogPost.findAndCountAll({
      where,
      include,
      limit: clampedLimit,
      offset,
      distinct: true,
      order: [['id', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: rows.map(formatPostImage),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: clampedLimit,
        totalPages: Math.ceil(count / clampedLimit)
      }
    });
  } catch (error) {
    console.error('getAllPostsAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getPostByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id, { include: fullPostInclude() });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    return res.status(200).json({ success: true, data: formatPostImage(post) });
  } catch (error) {
    console.error('getPostByIdAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const updatePost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id, { transaction: t });
    if (!post) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const {
      title, author_name, status, brand_ids,
      tags, sections, seo, featured_products,
      blog_category_id
    } = req.body;

    // Validate brand_ids if provided
    if (brand_ids !== undefined) {
      if (!Array.isArray(brand_ids) || brand_ids.length === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'brand_ids is required and must be a non-empty array' });
      }
    }

    // Validate sections if provided
    let parsedSections = undefined;
    if (sections !== undefined && sections !== null) {
      const sectionsValue = typeof sections === 'string' ? (() => { try { return JSON.parse(sections); } catch { return null; } })() : sections;
      if (!Array.isArray(sectionsValue)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'sections must be a valid JSON array' });
      }
      parsedSections = sectionsValue;
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (author_name !== undefined) updateData.author_name = author_name;
    if (blog_category_id !== undefined) updateData.blog_category_id = blog_category_id;
    if (parsedSections !== undefined) updateData.sections = parsedSections;

    // Regenerate slug if title changed
    if (title && title !== post.title) {
      const base = slugify(title, { lower: true, strict: true });
      updateData.slug = await generateUniqueSlug(base, id);
    }

    // Handle status and published_at
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && !post.published_at) {
        updateData.published_at = new Date();
      }
      // Retain existing published_at on all other status changes
    }

    await post.update(updateData, { transaction: t });

    // Update brands if provided
    if (brand_ids !== undefined) {
      await BlogBrand.destroy({ where: { blog_post_id: id }, transaction: t });
      const brandRows = brand_ids.map(brand_id => ({ blog_post_id: id, brand_id }));
      await BlogBrand.bulkCreate(brandRows, { transaction: t });
    }

    // Upsert SEO if provided
    if (seo !== undefined) {
      await BlogSEO.destroy({ where: { blog_post_id: id }, transaction: t });
      await BlogSEO.create({
        blog_post_id: id,
        meta_title: seo.meta_title || null,
        meta_description: seo.meta_description || null,
        meta_keywords: seo.meta_keywords || null,
        og_title: seo.og_title || null,
        og_description: seo.og_description || null,
        og_image: seo.og_image || null,
        canonical_url: seo.canonical_url || null,
        structured_data: seo.structured_data || null,
      }, { transaction: t });
    }

    // Update tags if provided
    if (tags !== undefined) {
      await BlogPostTag.destroy({ where: { blog_post_id: id }, transaction: t });
      if (Array.isArray(tags) && tags.length > 0) {
        const tagIds = [];
        for (const tagName of tags) {
          const tagSlug = slugify(tagName, { lower: true, strict: true });
          const [tag] = await BlogTag.findOrCreate({
            where: { name: tagName },
            defaults: { name: tagName, slug: tagSlug },
            transaction: t
          });
          tagIds.push(tag.id);
        }
        const tagRows = tagIds.map(blog_tag_id => ({ blog_post_id: id, blog_tag_id }));
        await BlogPostTag.bulkCreate(tagRows, { transaction: t });
      }
    }

    // Update featured products if provided
    if (featured_products !== undefined) {
      await BlogFeaturedProduct.destroy({ where: { blog_post_id: id }, transaction: t });
      if (Array.isArray(featured_products) && featured_products.length > 0) {
        for (const fp of featured_products) {
          const product = await Product.findByPk(fp.product_id, { transaction: t });
          if (!product) {
            await t.rollback();
            return res.status(422).json({ success: false, message: `Product with id ${fp.product_id} does not exist` });
          }
        }
        const fpRows = featured_products.map(fp => ({
          blog_post_id: id,
          product_id: fp.product_id,
          lifestyle_tag: fp.lifestyle_tag || null
        }));
        await BlogFeaturedProduct.bulkCreate(fpRows, { transaction: t });
      }
    }

    await t.commit();

    const fullPost = await BlogPost.findByPk(id, { include: fullPostInclude() });
    return res.status(200).json({ success: true, data: formatPostImage(fullPost) });
  } catch (error) {
    await t.rollback();
    console.error('updatePost error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const deletePost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id, { transaction: t });
    if (!post) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    await post.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('deletePost error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

const getPublicPosts = async (req, res) => {
  try {
    if (!req.brandId) {
      return res.status(400).json({ success: false, message: 'Brand identifier required. Please provide X-Brand-Name header' });
    }

    const { category, tag, page = 1, limit = 10 } = req.query;
    const clampedLimit = Math.min(parseInt(limit) || 10, 50);
    const offset = (parseInt(page) - 1) * clampedLimit;

    const include = [
      { model: BlogCategory, as: 'BlogCategory' },
      {
        model: Brand, as: 'Brands',
        through: { attributes: [] },
        where: { id: req.brandId },
        required: true
      },
      { model: BlogTag, as: 'Tags', through: { attributes: [] } },
      {
        model: Product, as: 'FeaturedProducts',
        through: { attributes: ['lifestyle_tag'] },
        attributes: ['id', 'name', 'slug']
      },
      { model: BlogSEO, as: 'BlogSEO' }
    ];

    // Filter by category slug
    if (category) {
      const blogCategoryInclude = include.find(i => i.as === 'BlogCategory');
      blogCategoryInclude.where = { slug: category };
      blogCategoryInclude.required = true;
    }

    // Filter by tag slug
    if (tag) {
      const tagsInclude = include.find(i => i.as === 'Tags');
      tagsInclude.where = { slug: tag };
      tagsInclude.required = true;
    }

    const { count, rows } = await BlogPost.findAndCountAll({
      where: { status: 'published' },
      include,
      limit: clampedLimit,
      offset,
      distinct: true,
      order: [['published_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: rows.map(formatPostImage),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: clampedLimit,
        totalPages: Math.ceil(count / clampedLimit)
      }
    });
  } catch (error) {
    console.error('getPublicPosts error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getPublicPostBySlug = async (req, res) => {
  try {
    if (!req.brandId) {
      return res.status(400).json({ success: false, message: 'Brand identifier required. Please provide X-Brand-Name header' });
    }

    const { slug } = req.params;
    const post = await BlogPost.findOne({
      where: { slug, status: 'published' },
      include: [
        { model: BlogCategory, as: 'BlogCategory' },
        {
          model: Brand, as: 'Brands',
          through: { attributes: [] },
          where: { id: req.brandId },
          required: true
        },
        { model: BlogTag, as: 'Tags', through: { attributes: [] } },
        {
          model: Product, as: 'FeaturedProducts',
          through: { attributes: ['lifestyle_tag'] },
          attributes: ['id', 'name', 'slug']
        },
        { model: BlogSEO, as: 'BlogSEO' }
      ]
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    return res.status(200).json({ success: true, data: formatPostImage(post) });
  } catch (error) {
    console.error('getPublicPostBySlug error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getAllTags = async (req, res) => {
  try {
    const tags = await BlogTag.findAll({
      include: [{
        model: BlogPost,
        as: 'BlogPosts',
        through: { attributes: [] },
        where: { status: 'published' },
        required: false,
        attributes: []
      }],
      attributes: {
        include: [[sequelize.fn('COUNT', sequelize.col('BlogPosts.id')), 'post_count']]
      },
      group: ['BlogTag.id'],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error('getAllTags error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─── Hero Image Upload ────────────────────────────────────────────────────────

const uploadHeroImage = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only image/jpeg, image/png, and image/webp are accepted' });
    }

    // Read file from disk (same pattern as categoryController)
    const fileBuffer = await fs.readFile(req.file.path);

    // Upload to ImageKit
    const result = await imagekitService.uploadImage(
      fileBuffer,
      `blog-hero-${Date.now()}.webp`,
      '/blogs'
    );

    if (!result.success) {
      throw new Error('Failed to upload image to ImageKit');
    }

    // Delete temp file from disk
    await fs.unlink(req.file.path).catch(() => {});

    // Delete old image from ImageKit if exists (best-effort)
    if (post.hero_image && typeof imagekitService.deleteImage === 'function') {
      try { await imagekitService.deleteImage(post.hero_image); } catch {}
    }

    await post.update({ hero_image: result.filePath });

    const updatedPost = await BlogPost.findByPk(id, { include: fullPostInclude() });
    return res.status(200).json({ success: true, data: formatPostImage(updatedPost) });
  } catch (error) {
    console.error('uploadHeroImage error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createCategory, getAllCategories, updateCategory, deleteCategory,
  createPost, getAllPostsAdmin, getPostByIdAdmin, updatePost, deletePost,
  getPublicPosts, getPublicPostBySlug, getAllTags,
  uploadHeroImage
};
