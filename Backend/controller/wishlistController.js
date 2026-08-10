const { Wishlist, Product, ProductImage, ProductVariation, Cart } = require('../model/associations.js');
const { logger } = require('../config/logging.js');

// Build a where clause for the current owner — userId for signed-in users,
// guestToken for visitors. Returns null if neither is available so the
// caller can respond 400.
function ownerWhere(req, extra = {}) {
    if (req.user?.id) return { userId: req.user.id, ...extra };
    const token = req.header('X-Guest-Token') || req.header('x-guest-token');
    if (token) return { guestToken: String(token).slice(0, 64), ...extra };
    return null;
}

function ownerFields(req) {
    if (req.user?.id) return { userId: req.user.id, guestToken: null };
    const token = req.header('X-Guest-Token') || req.header('x-guest-token');
    if (token) return { userId: null, guestToken: String(token).slice(0, 64) };
    return null;
}

// Add product to wishlist
module.exports.addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const owner = ownerFields(req);
        if (!owner) {
            return res.status(400).json({ message: 'Missing X-Guest-Token header for guest wishlist' });
        }

        const product = await Product.findByPk(productId, {
            include: [
                { model: ProductImage,     as: 'ProductImages',     attributes: ['id', 'image_url', 'alt_text', 'is_primary'] },
                { model: ProductVariation, as: 'ProductVariations', attributes: ['id', 'price', 'comparePrice', 'sku', 'stock', 'status'] }
            ]
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const existing = await Wishlist.findOne({ where: { ...owner, productId } });
        if (existing) {
            return res.status(200).json({ message: 'Product already in wishlist', wishlistItem: existing });
        }

        const wishlistItem = await Wishlist.create({ ...owner, productId, addedAt: new Date() });

        let images = [];
        if (product.ProductImages?.length) {
            images = product.ProductImages.map(img => ({
                image_url: img.image_url,
                is_primary: img.is_primary,
                alt_text: img.alt_text,
                id: img.id
            }));
        } else if (product.image) {
            images = [{ image_url: product.image, is_primary: true }];
        } else {
            images = [{ image_url: '/assets/demo-product.jpg', is_primary: true }];
        }

        res.status(201).json({
            message: 'Product added to wishlist',
            wishlistItem: {
                ...wishlistItem.get({ plain: true }),
                Product: { ...product.get({ plain: true }), images }
            }
        });
    } catch (error) {
        logger.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Failed to add product to wishlist', error: error.message });
    }
};

// Get wishlist (user OR guest)
module.exports.getWishlist = async (req, res) => {
    try {
        const where = ownerWhere(req);
        if (!where) {
            return res.status(200).json({ count: 0, wishlist: [] });
        }

        const wishlistItems = await Wishlist.findAll({
            where,
            include: [
                {
                    model: Product,
                    attributes: ['id', 'name', 'slug', 'description', 'status'],
                    include: [
                        {
                            model: ProductImage, as: 'ProductImages',
                            attributes: ['id', 'image_url', 'alt_text', 'is_primary'],
                            limit: 1, where: { is_primary: true }, required: false
                        },
                        {
                            model: ProductVariation, as: 'ProductVariations',
                            attributes: ['id', 'price', 'comparePrice', 'sku', 'stock', 'status'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const mapped = wishlistItems.map(item => {
            const plain = item.get({ plain: true });
            const product = plain.Product;
            let image = null;
            let images = [];
            if (product?.ProductImages?.length) {
                images = product.ProductImages.map(img => ({
                    image_url: img.image_url,
                    is_primary: img.is_primary,
                    alt_text: img.alt_text,
                    id: img.id
                }));
                image = product.ProductImages[0].image_url;
            } else if (product?.image) {
                images = [{ image_url: product.image, is_primary: true }];
                image = product.image;
            } else {
                images = [{ image_url: '/assets/demo-product.jpg', is_primary: true }];
                image = '/assets/demo-product.jpg';
            }
            return { ...plain, Product: { ...product, image, images } };
        });

        res.status(200).json({ count: mapped.length, wishlist: mapped });
    } catch (error) {
        logger.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Failed to fetch wishlist', error: error.message });
    }
};

// Check if a product is in the wishlist
module.exports.checkWishlist = async (req, res) => {
    try {
        const where = ownerWhere(req, { productId: req.params.productId });
        if (!where) return res.status(200).json({ isInWishlist: false });
        const wishlistItem = await Wishlist.findOne({ where });
        res.status(200).json({ isInWishlist: !!wishlistItem, wishlistItem });
    } catch (error) {
        logger.error('Error checking wishlist:', error);
        res.status(500).json({ message: 'Failed to check wishlist status', error: error.message });
    }
};

// Remove product from wishlist
module.exports.removeFromWishlist = async (req, res) => {
    try {
        const where = ownerWhere(req, { productId: req.params.productId });
        if (!where) return res.status(404).json({ message: 'Product not found in wishlist' });
        const wishlistItem = await Wishlist.findOne({ where });
        if (!wishlistItem) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }
        await wishlistItem.destroy();
        res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (error) {
        logger.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Failed to remove product from wishlist', error: error.message });
    }
};

// Clear entire wishlist
module.exports.clearWishlist = async (req, res) => {
    try {
        const where = ownerWhere(req);
        if (!where) return res.status(200).json({ message: 'Wishlist cleared successfully' });
        await Wishlist.destroy({ where });
        res.status(200).json({ message: 'Wishlist cleared successfully' });
    } catch (error) {
        logger.error('Error clearing wishlist:', error);
        res.status(500).json({ message: 'Failed to clear wishlist', error: error.message });
    }
};

