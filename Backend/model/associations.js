// Import models
import { User } from './userModel.js';
import { Category } from './categoryModel.js';
import { Slider } from './sliderModel.js';
import { Product } from './productModel.js';
import { ProductVariation } from './productVariationModel.js';
import { Attribute } from './attributeModel.js';
import { AttributeValue } from './attributeValueModel.js';
import { ProductImage } from './productImageModel.js';
import { ProductSEO } from './productSEOModel.js';
import { Coupon } from './couponModel.js';
import { Wishlist } from './wishlistModel.js';
import { Cart } from './cartModel.js';
import { CartItem } from './cartItemModel.js';
import { Order } from './orderModel.js';
import { OrderItem } from './orderItemModel.js';
import { ShippingAddress } from './shippingAddressModel.js';
import { ShippingFee } from './shippingFeeModel.js';
import { OrderStatusHistory } from './orderStatusHistoryModel.js';
import { Payment } from './paymentModel.js';
import { Review } from './reviewModel.js';
import { ReviewImage } from './reviewImageModel.js';
import { SeoMetadata } from './seoMetadataModel.js';
import { CouponUsage } from './couponUsageModel.js';

// Export all models
export {
    User,
    Category,
    Slider,
    Product,
    ProductVariation,
    Attribute,
    AttributeValue,
    ProductImage,
    ProductSEO,
    Coupon,
    Wishlist,
    Cart,
    CartItem,
    Order,
    OrderItem,
    ShippingAddress,
    ShippingFee,
    OrderStatusHistory,
    Payment,
    Review,
    ReviewImage,
    SeoMetadata,
    CouponUsage
};

// User Associations
User.hasMany(Order, { 
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Order.belongsTo(User, { 
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Wishlist, { foreignKey: 'userId' });
Wishlist.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Cart, { 
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Cart.belongsTo(User, { 
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

// Category Associations
Category.hasMany(Product, { 
    foreignKey: 'categoryId',
    as: 'products',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Product.belongsTo(Category, { 
    foreignKey: 'categoryId',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

// Category self-referential association
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

// Product Associations
Product.hasMany(ProductVariation, { foreignKey: 'productId', as: 'ProductVariations' });
ProductVariation.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'ProductImages' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

Product.hasOne(ProductSEO, { foreignKey: 'product_id', as: 'ProductSEO' });
ProductSEO.belongsTo(Product, { foreignKey: 'product_id' });

// Product-Review association
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Product Variation and Attribute Associations
ProductVariation.belongsToMany(Attribute, { 
    through: AttributeValue,
    foreignKey: 'variationId',
    otherKey: 'attributeId'
});
Attribute.belongsToMany(ProductVariation, { 
    through: AttributeValue,
    foreignKey: 'attributeId',
    otherKey: 'variationId'
});

// Order Associations
Order.hasMany(OrderItem, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});
OrderItem.belongsTo(Order, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});

Order.hasMany(OrderStatusHistory, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});
OrderStatusHistory.belongsTo(Order, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});

Order.hasOne(Payment, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});
Payment.belongsTo(Order, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});

Order.hasOne(ShippingAddress, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});
ShippingAddress.belongsTo(Order, { 
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
});

// Cart Associations
Cart.hasMany(CartItem, { 
    foreignKey: 'cartId',
    onDelete: 'CASCADE'
});
CartItem.belongsTo(Cart, { 
    foreignKey: 'cartId',
    onDelete: 'CASCADE'
});

// Review Associations
Review.hasMany(ReviewImage, { 
    foreignKey: 'reviewId',
    onDelete: 'CASCADE'
});
ReviewImage.belongsTo(Review, { 
    foreignKey: 'reviewId',
    onDelete: 'CASCADE'
});

// Attribute Associations
Attribute.hasMany(AttributeValue, { 
    foreignKey: 'attributeId',
    onDelete: 'CASCADE'
});
AttributeValue.belongsTo(Attribute, { 
    foreignKey: 'attributeId',
    onDelete: 'CASCADE'
});
// Coupon Associations
Coupon.hasMany(CouponUsage, { foreignKey: 'couponId', as: 'CouponUsages' });
CouponUsage.belongsTo(Coupon, { foreignKey: 'couponId' });

User.hasMany(CouponUsage, { foreignKey: 'userId', as: 'CouponUsages' });
CouponUsage.belongsTo(User, { foreignKey: 'userId' });

// Wishlist <-> Product association
Wishlist.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(Wishlist, { foreignKey: 'productId' });
