const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/db.js');
const { Reel, ReelProduct, Product, ProductImage, ProductVariation } = require('../model/associations.js');
const imagekitService = require('../services/imagekitService.js');

const resolveBrandId = (req, explicitBrandId = null) =>
  explicitBrandId || req.brandId || (req.brand && req.brand.id) || 1;

const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeReel = (reel) => {
  const data = reel.toJSON ? reel.toJSON() : reel;
  const products = (data.Products || []).map((product) => {
    const firstImage = (product.ProductImages || [])[0];
    const firstVariation = (product.ProductVariations || [])[0];
    const resolvedPrice = firstVariation?.price !== undefined && firstVariation?.price !== null
      ? firstVariation.price
      : 0;
    return {
      ...product,
      price: resolvedPrice,
      primary_image: firstImage?.image_url
        ? imagekitService.getOptimizedUrl(firstImage.image_url, 'thumbnail')
        : null,
    };
  });
  return {
    ...data,
    video_url: imagekitService.getOptimizedUrl(data.video_url, 'large'),
    thumbnail_url: data.thumbnail_url
      ? imagekitService.getOptimizedUrl(data.thumbnail_url, 'medium')
      : null,
    Products: products,
  };
};

module.exports.createReel = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, status = 'draft', display_order = 0, brand_id } = req.body;
    if (!title) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (!videoFile) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'video file is required' });
    }

    const videoBuffer = fs.readFileSync(videoFile.path);
    const videoUpload = await imagekitService.uploadImage(
      videoBuffer,
      path.basename(videoFile.path),
      '/reels'
    );

    let thumbnailPath = null;
    if (thumbnailFile) {
      const thumbnailBuffer = fs.readFileSync(thumbnailFile.path);
      const thumbnailUpload = await imagekitService.uploadImage(
        thumbnailBuffer,
        path.basename(thumbnailFile.path),
        '/reels'
      );
      thumbnailPath = thumbnailUpload.filePath;
    }

    const reel = await Reel.create(
      {
        title,
        video_url: videoUpload.filePath,
        thumbnail_url: thumbnailPath,
        status,
        brand_id: resolveBrandId(req, brand_id),
        display_order: toInt(display_order, 0),
      },
      { transaction }
    );

    [videoFile, thumbnailFile].filter(Boolean).forEach((file) => fs.unlink(file.path, () => {}));
    await transaction.commit();
    return res.status(201).json({ success: true, data: reel });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to create reel', error: error.message });
  }
};

module.exports.updateReel = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const reel = await Reel.findByPk(req.params.id, { transaction });
    if (!reel) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.display_order !== undefined) updates.display_order = toInt(req.body.display_order, 0);
    if (req.body.brand_id !== undefined) updates.brand_id = resolveBrandId(req, req.body.brand_id);

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (videoFile) {
      const videoBuffer = fs.readFileSync(videoFile.path);
      const videoUpload = await imagekitService.uploadImage(
        videoBuffer,
        path.basename(videoFile.path),
        '/reels'
      );
      if (reel.video_url) {
        await imagekitService.deleteImage(reel.video_url).catch(() => {});
      }
      updates.video_url = videoUpload.filePath;
    }

    if (thumbnailFile) {
      const thumbnailBuffer = fs.readFileSync(thumbnailFile.path);
      const thumbnailUpload = await imagekitService.uploadImage(
        thumbnailBuffer,
        path.basename(thumbnailFile.path),
        '/reels'
      );
      if (reel.thumbnail_url) {
        await imagekitService.deleteImage(reel.thumbnail_url).catch(() => {});
      }
      updates.thumbnail_url = thumbnailUpload.filePath;
    }

    [videoFile, thumbnailFile].filter(Boolean).forEach((file) => fs.unlink(file.path, () => {}));
    await reel.update(updates, { transaction });
    await transaction.commit();
    return res.json({ success: true, data: reel });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to update reel', error: error.message });
  }
};

module.exports.deleteReel = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const reel = await Reel.findByPk(req.params.id, { transaction });
    if (!reel) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    if (reel.video_url) await imagekitService.deleteImage(reel.video_url).catch(() => {});
    if (reel.thumbnail_url) await imagekitService.deleteImage(reel.thumbnail_url).catch(() => {});

    await ReelProduct.destroy({ where: { reel_id: reel.id }, transaction });
    await reel.destroy({ transaction });
    await transaction.commit();
    return res.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to delete reel', error: error.message });
  }
};

module.exports.assignProducts = async (req, res) => {
  try {
    const reelId = toInt(req.params.id, null);
    const productIds = Array.isArray(req.body.product_ids) ? req.body.product_ids : [];
    if (!reelId || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'reel id and product_ids[] are required' });
    }

    const uniqueProductIds = [...new Set(productIds.map((p) => toInt(p, null)).filter(Boolean))];
    const existing = await ReelProduct.findAll({ where: { reel_id: reelId } });
    const existingSet = new Set(existing.map((e) => e.product_id));

    const rows = uniqueProductIds
      .filter((productId) => !existingSet.has(productId))
      .map((productId, idx) => ({
        reel_id: reelId,
        product_id: productId,
        display_order: idx,
      }));

    if (rows.length) {
      await ReelProduct.bulkCreate(rows);
    }

    return res.json({ success: true, message: 'Products assigned to reel successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to assign products', error: error.message });
  }
};

module.exports.removeProduct = async (req, res) => {
  try {
    const reelId = toInt(req.params.id, null);
    const productId = toInt(req.params.productId, null);
    if (!reelId || !productId) {
      return res.status(400).json({ success: false, message: 'reel id and productId are required' });
    }
    await ReelProduct.destroy({ where: { reel_id: reelId, product_id: productId } });
    return res.json({ success: true, message: 'Product removed from reel successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove product', error: error.message });
  }
};

module.exports.getReels = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const reels = await Reel.findAll({
      where: { status: 'active', brand_id: brandId },
      include: [
        {
          model: Product,
          as: 'Products',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: ['display_order'] },
          include: [
            { model: ProductImage, as: 'ProductImages', attributes: ['id', 'image_url', 'is_primary'] },
            { model: ProductVariation, as: 'ProductVariations', attributes: ['id', 'price'] },
          ],
        },
      ],
      order: [['display_order', 'ASC']],
    });

    return res.json({ success: true, data: reels.map(normalizeReel) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reels', error: error.message });
  }
};

module.exports.incrementViewCount = async (req, res) => {
  try {
    const reelId = toInt(req.params.id, null);
    if (!reelId) return res.status(400).json({ success: false, message: 'Invalid reel id' });

    const reel = await Reel.findByPk(reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    await Reel.increment('view_count', { by: 1, where: { id: reelId } });
    await reel.reload();

    return res.json({
      success: true,
      data: { id: reel.id, view_count: reel.view_count },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to increment view count', error: error.message });
  }
};

