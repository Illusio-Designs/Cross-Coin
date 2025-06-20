import { Cart, CartItem, Product, ProductVariation } from '../model/associations.js';

// Get user's cart and items
export const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
      cart = await Cart.create({ user_id: userId });
    }
    const items = await CartItem.findAll({
      where: { cart_id: cart.id },
      include: [
        { model: Product },
        { model: ProductVariation, required: false }
      ]
    });
    console.log('[Cart] getUserCart for user:', userId, 'cartId:', cart.id, 'items:', items.length);
    res.json({ success: true, cart: items });
  } catch (error) {
    console.error('[Cart] Error in getUserCart:', error);
    res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variationId, quantity } = req.body;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
      cart = await Cart.create({ user_id: userId });
    }
    // Check if item already exists (by product and variation)
    let where = { cart_id: cart.id, product_id: productId };
    if (variationId) where.variation_id = variationId;
    let item = await CartItem.findOne({ where });
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
        cart_id: cart.id,
        product_id: productId,
        variation_id: variationId || null,
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

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    let item = await CartItem.findOne({ where: { cart_id: cart.id, product_id: productId } });
    if (!item) return res.status(404).json({ message: 'Cart item not found' });
    item.quantity = quantity;
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart item', error: error.message });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    const deleted = await CartItem.destroy({ where: { cart_id: cart.id, product_id: productId } });
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove cart item', error: error.message });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    await CartItem.destroy({ where: { cart_id: cart.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
}; 