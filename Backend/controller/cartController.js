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
                    { 
                        model: ProductVariation,
                        include: [
                            { model: ProductImage, as: 'VariationImages' }
                        ]
                    }
                ]
            }]
        });

        if (!cart) {
            return res.json({ cart: [], summary: { subtotal: 0, shipping: 0, discount: 0, total: 0 } });
        }

        // Calculate subtotal
        let subtotal = 0;
        cart.CartItems.forEach(item => {
            subtotal += (item.price || 0) * (item.quantity || 1);
        });

        // Calculate shipping fee (simple example, you may want to use your real logic)
        let shipping = 0;
        if (subtotal > 0) {
            shipping = 0; // Free shipping logic, or set your fee
        }

        // Calculate discount if coupon is provided
        let discount = 0;
        let couponCode = req.query.coupon || req.body?.coupon || null;
        if (couponCode) {
            // You may want to use your coupon validation logic here
            // For now, just a placeholder: 10% off for any coupon
            discount = subtotal * 0.1;
        }

        // Final total
        const total = Math.max(0, subtotal - discount + shipping);

        const formattedCart = cart.CartItems.map(item => {
            console.log('Processing cart item:', { 
                itemId: item.id, 
                productId: item.productId, 
                variationId: item.variationId,
                quantity: item.quantity 
            });
            
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
            let images = []; // Array to store all images for this variation
            
            // First, try to get variation-specific images
            if (variation && variation.VariationImages && variation.VariationImages.length > 0) {
                image = `${baseUrl}${variation.VariationImages[0].image_url}`;
                images = variation.VariationImages.map(img => ({
                    image_url: `${baseUrl}${img.image_url}`,
                    alt_text: img.alt_text
                }));
            } else if (product && product.ProductImages && product.ProductImages.length > 0) {
                // If no variation-specific images, try to find product images that match the variation's color
                const color = attributes.color;
                if (color && Array.isArray(color) && color.length > 0) {
                    const colorLower = color[0].toLowerCase();
                    const matchingImages = product.ProductImages.filter(img => 
                        (img.alt_text && img.alt_text.toLowerCase().includes(colorLower)) ||
                        (img.image_url && img.image_url.toLowerCase().includes(colorLower))
                    );
                    
                    if (matchingImages.length > 0) {
                        image = `${baseUrl}${matchingImages[0].image_url}`;
                        images = matchingImages.map(img => ({
                            image_url: `${baseUrl}${img.image_url}`,
                            alt_text: img.alt_text
                        }));
                    } else {
                        // Fallback to first product image
                        image = `${baseUrl}${product.ProductImages[0].image_url}`;
                        images = product.ProductImages.map(img => ({
                            image_url: `${baseUrl}${img.image_url}`,
                            alt_text: img.alt_text
                        }));
                    }
                } else {
                    // No color info, use first product image
                    image = `${baseUrl}${product.ProductImages[0].image_url}`;
                    images = product.ProductImages.map(img => ({
                        image_url: `${baseUrl}${img.image_url}`,
                        alt_text: img.alt_text
                    }));
                }
            }

            const price = variation ? variation.price : (product ? product.price : 0);

            return {
                id: item.id,
                productId: product ? product.id : null,
                variationId: variation ? variation.id : null,
                name: product ? product.name : 'Product not found',
                image: image,
                images: images,
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

        res.json({
            cart: formattedCart,
            summary: {
                subtotal,
                shipping,
                discount,
                total
            }
        });
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
      console.log('[Cart] Created new CartItem:', {
        id: item.id, 
        productId: productId, 
        variationId: variationId || null, 
        quantity: quantity,
        price: price
      });
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
    const { productId, variationId } = req.params;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    
    console.log('Remove from cart params:', { productId, variationId });
    
    const whereClause = { cartId: cart.id, productId: productId };
    
    // Handle variationId parameter
    if (variationId && variationId !== 'null' && variationId !== '0' && variationId !== 0) {
      whereClause.variationId = parseInt(variationId);
    } else {
      whereClause.variationId = null;
    }
    
    console.log('Remove from cart whereClause:', whereClause);
    
    // First, try to find the exact item to make sure it exists
    const cartItem = await CartItem.findOne({ where: whereClause });
    if (!cartItem) {
      console.log('Cart item not found with exact criteria, trying alternative search');
      
      // If not found with exact criteria, try to find by productId only
      const alternativeItem = await CartItem.findOne({ 
        where: { cartId: cart.id, productId: productId } 
      });
      
      if (!alternativeItem) {
        return res.status(404).json({ message: 'Cart item not found' });
      }
      
      // Delete the alternative item
      await alternativeItem.destroy();
      console.log('Deleted alternative cart item:', alternativeItem.id);
    } else {
      // Delete the exact item
      await cartItem.destroy();
      console.log('Deleted exact cart item:', cartItem.id);
    }
    
    res.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error('Error removing from cart:', error);
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