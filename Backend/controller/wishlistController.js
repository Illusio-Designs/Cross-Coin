const { Wishlist, Product, ProductImage, ProductVariation, Cart } = require('../model/associations.js');

// Add product to wishlist
module.exports.addToWishlist = async (req, res) => {
    console.log('addToWishlist called:', {
        userId: req.user?.id,
        productId: req.params.productId,
        body: req.body
    });
    try {
        const productId = req.params.productId;
        const userId = req.user.id; // From auth middleware

        // Check if product exists
        const product = await Product.findByPk(productId, {
            include: [
                {
                    model: ProductImage,
                    as: 'ProductImages',
                    attributes: ['id', 'image_url', 'alt_text', 'is_primary']
                },
                {
                    model: ProductVariation,
                    as: 'ProductVariations',
                    attributes: ['id', 'price', 'comparePrice', 'sku', 'stock', 'status']
                }
            ]
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already in wishlist
        const existingWishlistItem = await Wishlist.findOne({
            where: {
                userId,
                productId
            }
        });

        if (existingWishlistItem) {
            return res.status(400).json({
                message: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        const wishlistItem = await Wishlist.create({
            userId,
            productId,
            addedAt: new Date()
        });

        // Prepare images array for frontend
        let images = [];
        if (product.ProductImages && product.ProductImages.length > 0) {
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
                Product: {
                    ...product.get({ plain: true }),
                    images
                }
            }
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            message: 'Failed to add product to wishlist',
            error: error.message
        });
    }
};

// Get user's wishlist
module.exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware

        const wishlistItems = await Wishlist.findAll({
            where: { userId },
            include: [
                {
                    model: Product,
                    attributes: ['id', 'name', 'slug', 'description', 'status'],
                    include: [
                        {
                            model: ProductImage,
                            as: 'ProductImages',
                            attributes: ['id', 'image_url', 'alt_text', 'is_primary'],
                            limit: 1,
                            where: { is_primary: true },
                            required: false
                        },
                        {
                            model: ProductVariation,
                            as: 'ProductVariations',
                            attributes: ['id', 'price', 'comparePrice', 'sku', 'stock', 'status'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Map to always provide an image
        const mappedWishlist = wishlistItems.map(item => {
            const plainItem = item.get({ plain: true });
            const product = plainItem.Product;
            let image = null;
            let images = [];
            // 1. Try ProductImages
            if (product?.ProductImages && product.ProductImages.length > 0) {
                images = product.ProductImages.map(img => ({
                    image_url: img.image_url,
                    is_primary: img.is_primary,
                    alt_text: img.alt_text,
                    id: img.id
                }));
                image = product.ProductImages[0].image_url;
            }
            // 2. Fallback to product.image (if exists and not already set)
            else if (product?.image) {
                images = [{ image_url: product.image, is_primary: true }];
                image = product.image;
            }
            // 3. Fallback to demo image
            else {
                images = [{ image_url: '/assets/demo-product.jpg', is_primary: true }];
                image = '/assets/demo-product.jpg';
            }
            return {
                ...plainItem,
                Product: {
                    ...product,
                    image, // always set image
                    images // new: always set images array
                }
            };
        });

        res.status(200).json({
            count: mappedWishlist.length,
            wishlist: mappedWishlist
        });

        console.log('Wishlist Response Sent:', {
            count: mappedWishlist.length,
            wishlist: mappedWishlist
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({
            message: 'Failed to fetch wishlist',
            error: error.message
        });
    }
};

// Check if a product is in the user's wishlist
module.exports.checkWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id; // From auth middleware

        const wishlistItem = await Wishlist.findOne({
            where: {
                userId,
                productId
            }
        });

        res.status(200).json({
            isInWishlist: !!wishlistItem,
            wishlistItem
        });
    } catch (error) {
        console.error('Error checking wishlist:', error);
        res.status(500).json({
            message: 'Failed to check wishlist status',
            error: error.message
        });
    }
};

// Remove product from wishlist
module.exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id; // From auth middleware

        const wishlistItem = await Wishlist.findOne({
            where: {
                userId,
                productId
            }
        });

        if (!wishlistItem) {
            return res.status(404).json({
                message: 'Product not found in wishlist'
            });
        }

        await wishlistItem.destroy();

        res.status(200).json({
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            message: 'Failed to remove product from wishlist',
            error: error.message
        });
    }
};

// Clear entire wishlist
module.exports.clearWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware

        await Wishlist.destroy({
            where: { userId }
        });

        res.status(200).json({
            message: 'Wishlist cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        res.status(500).json({
            message: 'Failed to clear wishlist',
            error: error.message
        });
    }
};

// Move product from wishlist to cart
module.exports.moveToCart = async (req, res) => {
    try {
        const { productId } = req.params; // Assuming the product ID is passed as a URL parameter
        const userId = req.user.id; // Assuming user ID is available in the request

        // Find the product in the wishlist
        const wishlistItem = await Wishlist.findOne({
            where: {
                userId,
                productId
            }
        });

        if (!wishlistItem) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }

        // Add the product to the cart
        const cartItem = await Cart.create({
            userId,
            productId,
            quantity: 1 // Assuming default quantity is 1
        });

        // Remove the product from the wishlist
        await wishlistItem.destroy();

        res.status(200).json({
            message: 'Product moved to cart successfully',
            cartItem
        });
    } catch (error) {
        console.error('Error moving product to cart:', error);
        res.status(500).json({ message: 'Failed to move product to cart', error: error.message });
    }
}; 