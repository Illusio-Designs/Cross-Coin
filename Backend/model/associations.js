// Import models
const { User } = require("./userModel.js");
const { Category } = require("./categoryModel.js");
const { Slider } = require("./sliderModel.js");
const { Product } = require("./productModel.js");
const { ProductVariation } = require("./productVariationModel.js");
const { Attribute } = require("./attributeModel.js");
const { AttributeValue } = require("./attributeValueModel.js");
const { ProductImage } = require("./productImageModel.js");
const { ProductSEO } = require("./productSEOModel.js");
const { Coupon } = require("./couponModel.js");
const { Wishlist } = require("./wishlistModel.js");
const { Cart } = require("./cartModel.js");
const { CartItem } = require("./cartItemModel.js");
const { Order } = require("./orderModel.js");
const { OrderItem } = require("./orderItemModel.js");
const { ShippingAddress } = require("./shippingAddressModel.js");
const { ShippingFee } = require("./shippingFeeModel.js");
const { OrderStatusHistory } = require("./orderStatusHistoryModel.js");
const { Payment } = require("./paymentModel.js");
const { Review } = require("./reviewModel.js");
const { ReviewImage } = require("./reviewImageModel.js");
const { SeoMetadata } = require("./seoMetadataModel.js");
const { CouponUsage } = require("./couponUsageModel.js");
const { GuestUser } = require("./guestUserModel.js");
const FShipLabelDownload = require("./fshipLabelDownloadModel.js");

// Export all models
module.exports = {
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
  CouponUsage,
  GuestUser,
  FShipLabelDownload,
};

// User Associations
User.hasMany(Order, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Order.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

User.hasMany(Review, { foreignKey: "userId" });
Review.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Wishlist, { foreignKey: "userId" });
Wishlist.belongsTo(User, { foreignKey: "userId" });

User.hasOne(Cart, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Cart.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Category Associations
Category.hasMany(Product, {
  foreignKey: "categoryId",
  as: "products",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Product.belongsTo(Category, {
  foreignKey: "categoryId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Category self-referential association
Category.hasMany(Category, { as: "children", foreignKey: "parentId" });
Category.belongsTo(Category, { as: "parent", foreignKey: "parentId" });

// Product Associations
Product.hasMany(ProductVariation, {
  foreignKey: "productId",
  as: "ProductVariations",
});
ProductVariation.belongsTo(Product, { foreignKey: "productId" });

Product.hasMany(ProductImage, { foreignKey: "productId", as: "ProductImages" });
ProductImage.belongsTo(Product, { foreignKey: "productId" });
// Add association for variation images
ProductVariation.hasMany(ProductImage, {
  foreignKey: "product_variation_id",
  as: "VariationImages",
});
ProductImage.belongsTo(ProductVariation, {
  foreignKey: "product_variation_id",
  as: "ProductVariation",
});

Product.hasOne(ProductSEO, { foreignKey: "product_id", as: "ProductSEO" });
ProductSEO.belongsTo(Product, { foreignKey: "product_id", as: "Product" });

// Product-Review association
Product.hasMany(Review, { foreignKey: "productId", as: "reviews" });
Review.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Product Variation and Attribute Associations
ProductVariation.belongsToMany(Attribute, {
  through: AttributeValue,
  foreignKey: "variationId",
  otherKey: "attributeId",
});
Attribute.belongsToMany(ProductVariation, {
  through: AttributeValue,
  foreignKey: "attributeId",
  otherKey: "variationId",
});

// Order Associations
Order.hasMany(OrderItem, {
  foreignKey: "order_id",
  as: "OrderItems",
  onDelete: "CASCADE",
});
OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
  as: "Order",
  onDelete: "CASCADE",
});

Order.hasMany(OrderStatusHistory, {
  foreignKey: "order_id",
  as: "OrderStatusHistories",
  onDelete: "CASCADE",
});
OrderStatusHistory.belongsTo(Order, {
  foreignKey: "order_id",
  onDelete: "CASCADE",
});

Order.hasOne(Payment, {
  foreignKey: "order_id",
  onDelete: "CASCADE",
});
Payment.belongsTo(Order, {
  foreignKey: "order_id",
  onDelete: "CASCADE",
});

Order.belongsTo(ShippingAddress, {
  foreignKey: "shipping_address_id",
  as: "ShippingAddress",
  onDelete: "SET NULL",
});
ShippingAddress.hasMany(Order, {
  foreignKey: "shipping_address_id",
  as: "Orders",
  onDelete: "SET NULL",
});

// Cart Associations
Cart.hasMany(CartItem, {
  foreignKey: "cartId",
  as: "CartItems",
  onDelete: "CASCADE",
});
CartItem.belongsTo(Cart, {
  foreignKey: "cartId",
  onDelete: "CASCADE",
});

// CartItem <-> Product / ProductVariation associations
CartItem.belongsTo(Product, {
  foreignKey: "productId",
  onDelete: "CASCADE",
});
Product.hasMany(CartItem, {
  foreignKey: "productId",
  onDelete: "CASCADE",
});

CartItem.belongsTo(ProductVariation, {
  foreignKey: "variationId",
  onDelete: "SET NULL",
});
ProductVariation.hasMany(CartItem, {
  foreignKey: "variationId",
  onDelete: "SET NULL",
});

// Review Associations
Review.hasMany(ReviewImage, {
  foreignKey: "reviewId",
  onDelete: "CASCADE",
});
ReviewImage.belongsTo(Review, {
  foreignKey: "reviewId",
  onDelete: "CASCADE",
});

// Attribute Associations
Attribute.hasMany(AttributeValue, {
  foreignKey: "attributeId",
  onDelete: "CASCADE",
});
AttributeValue.belongsTo(Attribute, {
  foreignKey: "attributeId",
  onDelete: "CASCADE",
});
// Coupon Associations
Coupon.hasMany(CouponUsage, { foreignKey: "couponId", as: "CouponUsages" });
CouponUsage.belongsTo(Coupon, { foreignKey: "couponId" });

User.hasMany(CouponUsage, { foreignKey: "userId", as: "CouponUsages" });
CouponUsage.belongsTo(User, { foreignKey: "userId" });

// Wishlist <-> Product association
Wishlist.belongsTo(Product, { foreignKey: "productId" });
Product.hasMany(Wishlist, { foreignKey: "productId" });

// GuestUser Associations
GuestUser.hasMany(Order, {
  foreignKey: "guest_user_id",
  onDelete: "CASCADE",
  as: "GuestOrders",
});
Order.belongsTo(GuestUser, {
  foreignKey: "guest_user_id",
  as: "GuestUser",
});

GuestUser.hasMany(ShippingAddress, {
  foreignKey: "guest_user_id",
  onDelete: "CASCADE",
  as: "GuestShippingAddresses",
});
ShippingAddress.belongsTo(GuestUser, {
  foreignKey: "guest_user_id",
  as: "GuestUser",
});

GuestUser.hasMany(Payment, {
  foreignKey: "guest_user_id",
  onDelete: "CASCADE",
  as: "GuestPayments",
});
Payment.belongsTo(GuestUser, {
  foreignKey: "guest_user_id",
  as: "GuestUser",
});

// OrderItem -> Product / ProductVariation
OrderItem.belongsTo(Product, { 
  foreignKey: "product_id",
  as: "Product"
});
Product.hasMany(OrderItem, { 
  foreignKey: "product_id",
  as: "OrderItems"
});

OrderItem.belongsTo(ProductVariation, { 
  foreignKey: "variation_id",
  as: "ProductVariation"
});
ProductVariation.hasMany(OrderItem, { 
  foreignKey: "variation_id",
  as: "OrderItems"
});

// OrderStatusHistory -> User (removed due to guest orders - updated_by can be NULL)
// OrderStatusHistory.belongsTo(User, { as: 'UpdatedBy', foreignKey: 'updated_by' });
// User.hasMany(OrderStatusHistory, { foreignKey: 'updated_by' });

// FShip Label Download Associations
FShipLabelDownload.belongsTo(Order, {
  foreignKey: "order_id",
  as: "Order",
  onDelete: "CASCADE",
});
Order.hasMany(FShipLabelDownload, {
  foreignKey: "order_id",
  as: "LabelDownloads",
  onDelete: "CASCADE",
});

FShipLabelDownload.belongsTo(User, {
  foreignKey: "user_id",
  as: "DownloadedBy",
  onDelete: "CASCADE",
});
User.hasMany(FShipLabelDownload, {
  foreignKey: "user_id",
  as: "LabelDownloads",
  onDelete: "CASCADE",
});

// Order -> User (for label downloaded by)
Order.belongsTo(User, {
  foreignKey: "fship_label_downloaded_by",
  as: "LabelDownloadedBy",
  onDelete: "SET NULL",
});
User.hasMany(Order, {
  foreignKey: "fship_label_downloaded_by",
  as: "DownloadedLabels",
  onDelete: "SET NULL",
});
