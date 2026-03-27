const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { sequelize } = require('../config/db.js');
const {
  Lookbook,
  LookbookImage,
  LookbookHotspot,
  Product,
  ProductImage,
  ProductVariation,
} = require('../model/associations.js');
const imagekitService = require('../services/imagekitService.js');

const resolveBrandId = (req, explicitBrandId = null) =>
  explicitBrandId || req.brandId || (req.brand && req.brand.id) || 1;

const withOptimizedImage = (imagePath) => imagekitService.getOptimizedUrl(imagePath, 'large');

const normalizeLookbookPayload = (payload) => {
  payload.Images = (payload.Images || []).map((img) => ({
    ...img,
    image_url: withOptimizedImage(img.image_url),
    Hotspots: (img.Hotspots || []).map((hs) => {
      const product = hs.Product || {};
      const firstImage = (product.ProductImages || [])[0];
      const primaryImagePath = firstImage ? (firstImage.image_url || firstImage.fileName) : null;
      const firstVariation = (product.ProductVariations || [])[0];
      const resolvedPrice = firstVariation?.price !== undefined && firstVariation?.price !== null
        ? firstVariation.price
        : 0;
      return {
        ...hs,
        Product: {
          ...product,
          price: resolvedPrice,
          primary_image: primaryImagePath ? imagekitService.getOptimizedUrl(primaryImagePath, 'thumbnail') : null,
        },
      };
    }),
  }));
  return payload;
};

const parsePosition = (value) => Number.parseFloat(value);

const isValidHotspotPosition = (position) =>
  Number.isFinite(position) && position >= 0 && position <= 100;

async function generateUniqueSlug(title, excludeId = null) {
  const base = slugify(title || 'lookbook', { lower: true, strict: true }) || 'lookbook';
  let candidate = base;
  let counter = 1;

  while (true) {
    const where = excludeId ? { slug: candidate, id: { [require('sequelize').Op.ne]: excludeId } } : { slug: candidate };
    const exists = await Lookbook.findOne({ where });
    if (!exists) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

module.exports.createLookbook = async (req, res) => {
  try {
    const { title, description, status = 'draft', display_order = 0, brand_id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const lookbook = await Lookbook.create({
      title,
      slug: await generateUniqueSlug(title),
      description: description || null,
      status,
      display_order: Number.parseInt(display_order, 10) || 0,
      brand_id: resolveBrandId(req, brand_id),
    });

    return res.status(201).json({ success: true, data: lookbook });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create lookbook', error: error.message });
  }
};

module.exports.updateLookbook = async (req, res) => {
  try {
    const lookbook = await Lookbook.findByPk(req.params.id);
    if (!lookbook) return res.status(404).json({ success: false, message: 'Lookbook not found' });

    const updates = {};
    if (req.body.title && req.body.title !== lookbook.title) {
      updates.title = req.body.title;
      updates.slug = await generateUniqueSlug(req.body.title, lookbook.id);
    }
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.status) updates.status = req.body.status;
    if (req.body.display_order !== undefined) updates.display_order = Number.parseInt(req.body.display_order, 10) || 0;
    if (req.body.brand_id) updates.brand_id = resolveBrandId(req, req.body.brand_id);

    await lookbook.update(updates);
    return res.json({ success: true, data: lookbook });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update lookbook', error: error.message });
  }
};

module.exports.deleteLookbook = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const lookbook = await Lookbook.findByPk(req.params.id, {
      include: [{ model: LookbookImage, as: 'Images' }],
      transaction,
    });
    if (!lookbook) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lookbook not found' });
    }

    // Best effort cleanup of ImageKit files.
    for (const image of lookbook.Images || []) {
      try {
        await imagekitService.deleteImage(image.image_url);
      } catch (_) {}
    }

    await lookbook.destroy({ transaction });
    await transaction.commit();
    return res.json({ success: true, message: 'Lookbook deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to delete lookbook', error: error.message });
  }
};

module.exports.uploadLookbookImage = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const lookbook = await Lookbook.findByPk(id, { transaction });
    if (!lookbook) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lookbook not found' });
    }
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'image file is required' });
    }

    const { display_order = 0, alt_text } = req.body;
    const buffer = fs.readFileSync(req.file.path);
    const uploadResult = await imagekitService.uploadImage(buffer, path.basename(req.file.path), '/lookbooks');

    const image = await LookbookImage.create(
      {
        lookbook_id: lookbook.id,
        image_url: uploadResult.filePath,
        display_order: Number.parseInt(display_order, 10) || 0,
        alt_text: alt_text || null,
      },
      { transaction }
    );

    fs.unlink(req.file.path, () => {});
    await transaction.commit();
    return res.status(201).json({ success: true, data: image });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to upload lookbook image', error: error.message });
  }
};

module.exports.deleteLookbookImage = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const image = await LookbookImage.findByPk(req.params.imageId, { transaction });
    if (!image) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lookbook image not found' });
    }

    try {
      await imagekitService.deleteImage(image.image_url);
    } catch (_) {}

    await image.destroy({ transaction });
    await transaction.commit();
    return res.json({ success: true, message: 'Lookbook image deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to delete lookbook image', error: error.message });
  }
};

module.exports.addHotspot = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { product_id, position_x, position_y, label } = req.body;

    const x = parsePosition(position_x);
    const y = parsePosition(position_y);
    if (!isValidHotspotPosition(x) || !isValidHotspotPosition(y)) {
      return res.status(400).json({ success: false, message: 'position_x and position_y must be between 0 and 100' });
    }

    const image = await LookbookImage.findByPk(imageId);
    if (!image) return res.status(404).json({ success: false, message: 'Lookbook image not found' });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const hotspot = await LookbookHotspot.create({
      lookbook_image_id: image.id,
      product_id,
      position_x: x,
      position_y: y,
      label: label || null,
    });

    return res.status(201).json({ success: true, data: hotspot });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add hotspot', error: error.message });
  }
};

module.exports.updateHotspot = async (req, res) => {
  try {
    const hotspot = await LookbookHotspot.findByPk(req.params.hotspotId);
    if (!hotspot) return res.status(404).json({ success: false, message: 'Hotspot not found' });

    const updates = {};
    if (req.body.product_id !== undefined) updates.product_id = req.body.product_id;
    if (req.body.label !== undefined) updates.label = req.body.label;
    if (req.body.position_x !== undefined) {
      const x = parsePosition(req.body.position_x);
      if (!isValidHotspotPosition(x)) {
        return res.status(400).json({ success: false, message: 'position_x must be between 0 and 100' });
      }
      updates.position_x = x;
    }
    if (req.body.position_y !== undefined) {
      const y = parsePosition(req.body.position_y);
      if (!isValidHotspotPosition(y)) {
        return res.status(400).json({ success: false, message: 'position_y must be between 0 and 100' });
      }
      updates.position_y = y;
    }

    await hotspot.update(updates);
    return res.json({ success: true, data: hotspot });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update hotspot', error: error.message });
  }
};

module.exports.deleteHotspot = async (req, res) => {
  try {
    const hotspot = await LookbookHotspot.findByPk(req.params.hotspotId);
    if (!hotspot) return res.status(404).json({ success: false, message: 'Hotspot not found' });
    await hotspot.destroy();
    return res.json({ success: true, message: 'Hotspot deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete hotspot', error: error.message });
  }
};

module.exports.getLookbooks = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const lookbooks = await Lookbook.findAll({
      where: { status: 'active', brand_id: brandId },
      include: [
        {
          model: LookbookImage,
          as: 'Images',
          include: [
            {
              model: LookbookHotspot,
              as: 'Hotspots',
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
            },
          ],
        },
      ],
      order: [
        ['display_order', 'ASC'],
        [{ model: LookbookImage, as: 'Images' }, 'display_order', 'ASC'],
      ],
    });

    const data = lookbooks.map((lb) => normalizeLookbookPayload(lb.toJSON()));

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lookbooks', error: error.message });
  }
};

module.exports.getLookbookBySlug = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const lookbook = await Lookbook.findOne({
      where: { slug: req.params.slug, status: 'active', brand_id: brandId },
      include: [
        {
          model: LookbookImage,
          as: 'Images',
          include: [
            {
              model: LookbookHotspot,
              as: 'Hotspots',
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
            },
          ],
        },
      ],
      order: [[{ model: LookbookImage, as: 'Images' }, 'display_order', 'ASC']],
    });

    if (!lookbook) return res.status(404).json({ success: false, message: 'Lookbook not found' });

    const data = normalizeLookbookPayload(lookbook.toJSON());

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lookbook', error: error.message });
  }
};

