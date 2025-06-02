import { Wishlist, Product, ProductImage, Cart } from '../model/associations.js';

// Add product to wishlist
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id; // From auth middleware

        // Check if product exists
        const product = await Product.findByPk(productId);
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

        res.status(201).json({
            message: 'Product added to wishlist',
            wishlistItem
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
export const getWishlist = async (req, res) => {
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
                            attributes: ['id', 'imageName', 'altText', 'isDefault'],
                            limit: 1,
                            where: { isDefault: true },
                            required: false
                        }
                    ]
                }
            ],
            order: [['addedAt', 'DESC']]
        });

        res.status(200).json({
            count: wishlistItems.length,
            wishlist: wishlistItems
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
export const checkWishlist = async (req, res) => {
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
export const removeFromWishlist = async (req, res) => {
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
export const clearWishlist = async (req, res) => {
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
export const moveToCart = async (req, res) => {
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