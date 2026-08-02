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
const UTMTracking = require("./utmModel.js");
const { BrandSetting } = require("./brandSettingModel.js");
const Brand = require("./brandModel.js");
const { ProductBrand } = require("./productBrandModel.js");
const { CategoryBrand } = require("./categoryBrandModel.js");
const SliderBrand = require("./sliderBrandModel.js");
const { BlogCategory } = require("./blogCategoryModel.js");
const { BlogPost } = require("./blogPostModel.js");
const { BlogTag } = require("./blogTagModel.js");
const { BlogPostTag } = require("./blogPostTagModel.js");
const { BlogBrand } = require("./blogBrandModel.js");
const { BlogFeaturedProduct } = require("./blogFeaturedProductModel.js");
const { BlogSEO } = require("./blogSeoModel.js");
const { LoyaltyTransaction } = require("./loyaltyTransactionModel.js");
const { Lookbook } = require("./lookbookModel.js");
const { LookbookImage } = require("./lookbookImageModel.js");
const { LookbookHotspot } = require("./lookbookHotspotModel.js");
const { WhatsappConversation, WhatsappMessage } = require("./whatsappConversationModel.js");
const { OrderShipment } = require("./orderShipmentModel.js");
const { Faq } = require("./faqModel.js");
const { AddressQualityScore } = require("./addressQualityScoreModel.js");

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
  UTMTracking,
  BrandSetting,
  Brand,
  ProductBrand,
  CategoryBrand,
  SliderBrand,
  BlogCategory,
  BlogPost,
  BlogTag,
  BlogPostTag,
  BlogBrand,
  BlogFeaturedProduct,
  BlogSEO,
  LoyaltyTransaction,
  Lookbook,
  LookbookImage,
  LookbookHotspot,
  WhatsappConversation,
  WhatsappMessage,
  OrderShipment,
  Faq,
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

// Order -> Shipment (shipping provider data)
Order.hasOne(OrderShipment, {
  foreignKey: "order_id",
  as: "Shipment",
  onDelete: "CASCADE",
});
OrderShipment.belongsTo(Order, {
  foreignKey: "order_id",
  as: "Order",
  onDelete: "CASCADE",
});

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

// UTM Tracking Associations
UTMTracking.belongsTo(User, {
  foreignKey: "user_id",
  as: "User",
  onDelete: "SET NULL",
});
User.hasMany(UTMTracking, {
  foreignKey: "user_id",
  as: "UTMTrackings",
  onDelete: "SET NULL",
});

UTMTracking.belongsTo(GuestUser, {
  foreignKey: "guest_user_id",
  as: "GuestUser",
  onDelete: "SET NULL",
});
GuestUser.hasMany(UTMTracking, {
  foreignKey: "guest_user_id",
  as: "UTMTrackings",
  onDelete: "SET NULL",
});

// Order -> UTM Tracking
Order.belongsTo(UTMTracking, {
  foreignKey: "utm_tracking_id",
  as: "UTMTracking",
  onDelete: "SET NULL",
});
UTMTracking.hasMany(Order, {
  foreignKey: "utm_tracking_id",
  as: "Orders",
  onDelete: "SET NULL",
});

// Brand Associations - MANY-TO-MANY relationships
// Products can belong to multiple brands
Brand.belongsToMany(Product, {
  through: ProductBrand,
  foreignKey: "brand_id",
  otherKey: "product_id",
  as: "Products",
});
Product.belongsToMany(Brand, {
  through: ProductBrand,
  foreignKey: "product_id",
  otherKey: "brand_id",
  as: "Brands",
});

// Categories can belong to multiple brands
Brand.belongsToMany(Category, {
  through: CategoryBrand,
  foreignKey: "brand_id",
  otherKey: "category_id",
  as: "Categories",
});
Category.belongsToMany(Brand, {
  through: CategoryBrand,
  foreignKey: "category_id",
  otherKey: "brand_id",
  as: "Brands",
});

// Orders still belong to ONE brand (can't be shared)
Brand.hasMany(Order, {
  foreignKey: "brand_id",
  as: "Orders",
  onDelete: "CASCADE",
});
Order.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "Brand",
  onDelete: "CASCADE",
});

// Sliders can belong to multiple brands - MANY-TO-MANY
Brand.belongsToMany(Slider, {
  through: SliderBrand,
  foreignKey: "brand_id",
  otherKey: "slider_id",
  as: "Sliders",
});
Slider.belongsToMany(Brand, {
  through: SliderBrand,
  foreignKey: "slider_id",
  otherKey: "brand_id",
  as: "Brands",
});

// Keep the old brand_id for backward compatibility (optional)
Slider.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "PrimaryBrand",
  onDelete: "SET NULL",
});
Brand.hasMany(Slider, {
  foreignKey: "brand_id",
  as: "PrimarySliders",
  onDelete: "SET NULL",
});

// Coupons can belong to multiple brands (optional - uncomment if needed)
Brand.hasMany(Coupon, {
  foreignKey: "brand_id",
  as: "Coupons",
  onDelete: "CASCADE",
});
Coupon.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "Brand",
  onDelete: "CASCADE",
});

// Blog Associations
BlogPost.belongsTo(BlogCategory, { foreignKey: 'blog_category_id', as: 'BlogCategory', onDelete: 'SET NULL' });
BlogCategory.hasMany(BlogPost, { foreignKey: 'blog_category_id', as: 'BlogPosts' });

BlogPost.belongsToMany(Brand, { through: BlogBrand, foreignKey: 'blog_post_id', otherKey: 'brand_id', as: 'Brands' });
Brand.belongsToMany(BlogPost, { through: BlogBrand, foreignKey: 'brand_id', otherKey: 'blog_post_id', as: 'BlogPosts' });

BlogPost.belongsToMany(BlogTag, { through: BlogPostTag, foreignKey: 'blog_post_id', otherKey: 'blog_tag_id', as: 'Tags' });
BlogTag.belongsToMany(BlogPost, { through: BlogPostTag, foreignKey: 'blog_tag_id', otherKey: 'blog_post_id', as: 'BlogPosts' });

BlogPost.belongsToMany(Product, { through: BlogFeaturedProduct, foreignKey: 'blog_post_id', otherKey: 'product_id', as: 'FeaturedProducts' });
Product.belongsToMany(BlogPost, { through: BlogFeaturedProduct, foreignKey: 'product_id', otherKey: 'blog_post_id', as: 'BlogPosts' });

BlogPost.hasOne(BlogSEO, { foreignKey: 'blog_post_id', as: 'BlogSEO', onDelete: 'CASCADE' });
BlogSEO.belongsTo(BlogPost, { foreignKey: 'blog_post_id', as: 'BlogPost' });

// Loyalty Associations
User.hasMany(LoyaltyTransaction, {
  foreignKey: "user_id",
  as: "LoyaltyTransactions",
  onDelete: "CASCADE",
});
LoyaltyTransaction.belongsTo(User, {
  foreignKey: "user_id",
  as: "User",
  onDelete: "CASCADE",
});

Order.hasMany(LoyaltyTransaction, {
  foreignKey: "order_id",
  as: "LoyaltyTransactions",
  onDelete: "SET NULL",
});
LoyaltyTransaction.belongsTo(Order, {
  foreignKey: "order_id",
  as: "Order",
  onDelete: "SET NULL",
});

Brand.hasMany(LoyaltyTransaction, {
  foreignKey: "brand_id",
  as: "LoyaltyTransactions",
  onDelete: "CASCADE",
});
LoyaltyTransaction.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "Brand",
  onDelete: "CASCADE",
});

// Lookbook Associations
Brand.hasMany(Lookbook, {
  foreignKey: "brand_id",
  as: "Lookbooks",
  onDelete: "CASCADE",
});
Lookbook.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "Brand",
  onDelete: "CASCADE",
});

Lookbook.hasMany(LookbookImage, {
  foreignKey: "lookbook_id",
  as: "Images",
  onDelete: "CASCADE",
});
LookbookImage.belongsTo(Lookbook, {
  foreignKey: "lookbook_id",
  as: "Lookbook",
  onDelete: "CASCADE",
});

LookbookImage.hasMany(LookbookHotspot, {
  foreignKey: "lookbook_image_id",
  as: "Hotspots",
  onDelete: "CASCADE",
});
LookbookHotspot.belongsTo(LookbookImage, {
  foreignKey: "lookbook_image_id",
  as: "LookbookImage",
  onDelete: "CASCADE",
});

Product.hasMany(LookbookHotspot, {
  foreignKey: "product_id",
  as: "LookbookHotspots",
  onDelete: "CASCADE",
});
LookbookHotspot.belongsTo(Product, {
  foreignKey: "product_id",
  as: "Product",
  onDelete: "CASCADE",
});

