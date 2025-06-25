const express = require('express');
const { Product } = require('../model/productModel.js');
const { ProductImage } = require('../model/productImageModel.js');
const { Category } = require('../model/categoryModel.js');
const { sequelize } = require('../config/db.js');

const router = express.Router();

// Facebook Catalog Feed Endpoint
router.get("/feed", async (req, res) => {
    // Fetch all active products with their category and primary image
    const products = await Product.findAll({
        where: { status: 'active' },
        include: [
            { model: Category, as: 'category', attributes: ['name'] },
            { model: ProductImage, as: 'images', where: { is_primary: true }, required: false }
        ]
    });

    let xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>`;
    xml += `<rss xmlns:g=\"http://base.google.com/ns/1.0\"><channel>`;
    xml += `<title>Cross Coin Product Feed</title>`;

    for (const product of products) {
        // Get price from first variation (if you have a variations table, fetch it here)
        // For now, use a placeholder or 0 if not available
        let price = 0;
        if (product.variations && product.variations.length > 0) {
            price = product.variations[0].price;
        } else if (product.price) {
            price = product.price;
        }
        // Get image URL
        let imageUrl = '';
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].image_url.startsWith('http')
                ? product.images[0].image_url
                : `https://yourdomain.com/uploads/products/${product.images[0].image_url}`;
        }
        // Get category name
        const categoryName = product.category ? product.category.name : '';
        // Build product link
        const productLink = `https://yourdomain.com/products/${product.slug}`;
        // XML item
        xml += `<item>`;
        xml += `<g:id>${product.id}</g:id>`;
        xml += `<g:title><![CDATA[${product.name}]]></g:title>`;
        xml += `<g:description><![CDATA[${product.description || ''}]]></g:description>`;
        xml += `<g:link>${productLink}</g:link>`;
        xml += `<g:image_link>${imageUrl}</g:image_link>`;
        xml += `<g:price>${price} INR</g:price>`;
        xml += `<g:availability>in stock</g:availability>`;
        xml += `<g:brand>Cross Coin</g:brand>`;
        xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
        xml += `</item>`;
    }

    xml += `</channel></rss>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
});

module.exports = router;
