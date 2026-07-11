const { Op } = require('sequelize');
const instagramService = require('../services/instagramService');
const { InstagramPostProduct, Product, ProductImage, ProductVariation } = require('../model/associations');
const imagekitService = require('../services/imagekitService');

const toPositiveInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveBrandId = (req) => req.brandId || (req.brand && req.brand.id) || 1;

module.exports.getFeed = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const feed = await instagramService.getCachedFeed(brandId);
    const posts = feed.data || [];
    const postIds = posts.map((p) => p.id);

    let tagRows = [];
    if (postIds.length) {
      tagRows = await InstagramPostProduct.findAll({
        where: {
          brand_id: brandId,
          instagram_post_id: { [Op.in]: postIds },
        },
        include: [
          {
            model: Product,
            as: 'Product',
            attributes: ['id', 'name', 'slug'],
            include: [
              { model: ProductImage, as: 'ProductImages', attributes: ['id', 'image_url', 'is_primary'] },
              { model: ProductVariation, as: 'ProductVariations', attributes: ['id', 'price'] },
            ],
          },
        ],
      });
    }

    const tagsByPost = new Map();
    for (const row of tagRows) {
      const key = row.instagram_post_id;
      if (!tagsByPost.has(key)) tagsByPost.set(key, []);
      const product = row.Product;
      const firstImage = product?.ProductImages?.[0];
      const firstVariation = product?.ProductVariations?.[0];
      const resolvedPrice = firstVariation?.price !== undefined && firstVariation?.price !== null
        ? firstVariation.price
        : 0;
      tagsByPost.get(key).push({
        id: product?.id,
        name: product?.name,
        price: resolvedPrice,
        slug: product?.slug,
        primary_image: firstImage
          ? imagekitService.getOptimizedUrl(firstImage.image_url, 'thumbnail')
          : null,
      });
    }

    const data = posts.map((post) => ({
      ...post,
      tagged_products: tagsByPost.get(post.id) || [],
    }));

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
    return res.json({ success: true, stale: !!feed.stale, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Instagram feed',
      error: error.message,
    });
  }
};

module.exports.refreshFeed = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const data = await instagramService.refreshFeed(brandId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh Instagram feed',
      error: error.message,
    });
  }
};

module.exports.tagPost = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const { instagram_post_id, product_id } = req.body;
    const productId = toPositiveInt(product_id);
    if (!instagram_post_id || !productId) {
      return res.status(400).json({
        success: false,
        message: 'instagram_post_id and valid product_id are required',
      });
    }

    const [record] = await InstagramPostProduct.findOrCreate({
      where: {
        instagram_post_id,
        product_id: productId,
        brand_id: brandId,
      },
      defaults: {
        instagram_post_id,
        product_id: productId,
        brand_id: brandId,
      },
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to tag Instagram post',
      error: error.message,
    });
  }
};

