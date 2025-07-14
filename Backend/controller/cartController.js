const { Cart, CartItem, Product, ProductImage, ProductVariation } = require('../model/associations.js');
const { sequelize } = require('../config/db.js');

// Get user's cart
module.exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({
            where: { user_id: req.user.id },
            include: [{
                model: CartItem,
                as: 'CartItems',
                include: [
                    { 
                        model: Product,
                        include: [
                            { model: ProductImage, as: 'ProductImages' },
                            { model: ProductVariation, as: 'ProductVariations' }
                        ]
                    },
                    { model: ProductVariation }
                ]
            }]
        });

        if (!cart) {
            return res.json({ cart: [] });
        }

        const formattedCart = cart.CartItems.map(item => {
            const product = item.Product;
            let variation = item.ProductVariation;
            
            // If cart item lacks a specific variation, use the first one from the product as a default.
            if (!variation && product && product.ProductVariations && product.ProductVariations.length > 0) {
                variation = product.ProductVariations[0];
            }

            // Determine attributes, image, and price
            const attributes = variation && variation.attributes ? JSON.parse(variation.attributes) : {};
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            
            let image = '/placeholder.png'; // Fallback image
            // Prefer variation image if available
            if (variation && variation.VariationImages && variation.VariationImages.length > 0) {
                image = `${baseUrl}${variation.VariationImages[0].image_url}`;
            } else if (product && product.ProductImages && product.ProductImages.length > 0) {
                image = `${baseUrl}${product.ProductImages[0].image_url}`;
            }

            const price = variation ? variation.price : (product ? product.price : 0);

            return {
                id: item.id,
                productId: product ? product.id : null,
                variationId: variation ? variation.id : null,
                name: product ? product.name : 'Product not found',
                image: image,
                price: price,
                quantity: item.quantity,
                size: attributes.size || null,
                color: attributes.color || null,
                stock: variation ? variation.stock : (product ? product.stock_quantity : 0),
                weight: product ? product.weight : null,
                weightUnit: product ? product.weightUnit : null,
                dimensions: product ? product.dimensions : null,
                dimensionUnit: product ? product.dimensionUnit : null
            };
        });

        res.json({ cart: formattedCart });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
    }
};

// Add item to cart
module.exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variationId, quantity } = req.body;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
      cart = await Cart.create({ user_id: userId });
    }
    // Check if item already exists (by product and variation)
    let where = { cartId: cart.id, productId: productId, variationId: variationId || null };
    console.log('[Cart] addToCart where:', where);
    let item = await CartItem.findOne({ where });
    console.log('[Cart] addToCart found item:', item);
    let stockAvailable = 0;
    if (variationId) {
      const variation = await ProductVariation.findByPk(variationId);
      stockAvailable = variation ? variation.stock : 0;
    } else {
      const variation = await ProductVariation.findOne({ where: { productId } });
      stockAvailable = variation ? variation.stock : 0;
    }
    const requestedQuantity = item ? item.quantity + quantity : quantity;
    if (typeof stockAvailable !== 'number' || stockAvailable < requestedQuantity) {
      return res.status(400).json({ message: 'Product is out of stock or insufficient quantity' });
    }
    if (item) {
      item.quantity += quantity;
      await item.save();
      console.log('[Cart] Updated existing CartItem:', item.id, 'quantity:', item.quantity);
    } else {
      // Get price from variation or product
      let price = 0;
      if (variationId) {
        const variation = await ProductVariation.findByPk(variationId);
        price = variation ? variation.price : 0;
      } else {
        const variation = await ProductVariation.findOne({ where: { productId } });
        price = variation ? variation.price : 0;
      }
      item = await CartItem.create({
        cartId: cart.id,
        productId: productId,
        variationId: variationId || null,
        quantity,
        price
      });
      console.log('[Cart] Created new CartItem:', item.id, 'product:', productId, 'variation:', variationId, 'quantity:', quantity);
    }
    res.json({ success: true, item });
  } catch (error) {
    console.error('[Cart] Error in addToCart:', error);
    res.status(500).json({ message: 'Failed to add to cart', error: error.message });
  }
};

// Update cart item
module.exports.updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity, variationId } = req.body;
        const userId = req.user.id;

        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }

        const cart = await Cart.findOne({ where: { user_id: userId } });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        const whereClause = {
            cartId: cart.id,
            productId: productId
        };
        if (variationId) {
            whereClause.variationId = variationId;
        }
        
        let cartItem = await CartItem.findOne({ where: whereClause });

        if (!cartItem) {
            // If not found, try finding without variationId, in case the item is basic
            const fallbackCartItem = await CartItem.findOne({ where: { cartId: cart.id, productId: productId, variationId: null } });
            if (!fallbackCartItem) {
                return res.status(404).json({ success: false, message: 'Cart item not found.' });
            }
            cartItem = fallbackCartItem;
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        res.json({ success: true, message: 'Cart item updated.', item: cartItem });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart item.', error: error.message });
    }
};

// Remove item from cart
module.exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    const deleted = await CartItem.destroy({ where: { cartId: cart.id, productId: productId } });
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove cart item', error: error.message });
  }
};

// Clear cart
module.exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    await CartItem.destroy({ where: { cartId: cart.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
}; 