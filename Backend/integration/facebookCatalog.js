const express = require('express');
const { Product, ProductVariation, ProductImage, Category } = require('../model/associations.js');
const { sequelize } = require('../config/db.js');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create DOMPurify instance for server-side HTML sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const router = express.Router();

// Facebook Catalog Feed Endpoint
router.get("/feed", async (req, res) => {
    const baseUrl = process.env.BASE_URL || 'https://api.crosscoin.in';
    const frontendUrl = process.env.FRONTEND_URL || 'https://crosscoin.in';
    
    // Fetch all active products with their variations, images, and category
    const products = await Product.findAll({
        where: { status: 'active' },
        include: [
            { 
                model: Category, 
                as: 'Category', 
                attributes: ['name'] 
            },
            { 
                model: ProductVariation, 
                as: 'ProductVariations',
                attributes: ['id', 'price', 'comparePrice', 'stock', 'sku'],
                order: [['price', 'ASC']], // Get the lowest price first
                include: [
                    {
                        model: ProductImage,
                        as: 'VariationImages',
                        required: false,
                        attributes: ['image_url', 'alt_text', 'is_primary', 'display_order'],
                        order: [['is_primary', 'DESC'], ['display_order', 'ASC']]
                    }
                ]
            },
            { 
                model: ProductImage, 
                as: 'ProductImages',
                required: false,
                attributes: ['image_url', 'alt_text', 'is_primary', 'display_order'],
                order: [['is_primary', 'DESC'], ['display_order', 'ASC']] // Primary images first, then by display order
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0"><channel>`;
    xml += `<title>Cross Coin Product Feed</title>`;

    for (const product of products) {
        // Get the lowest price and compare price from variations
        let price = 0;
        let comparePrice = 0;
        let availability = 'out of stock';
        
        if (product.ProductVariations && product.ProductVariations.length > 0) {
            // Find the variation with the lowest price that has stock
            const availableVariations = product.ProductVariations.filter(v => v.stock > 0);
            if (availableVariations.length > 0) {
                price = Math.min(...availableVariations.map(v => parseFloat(v.price)));
                availability = 'in stock';
                
                // Get the compare price from the variation with the lowest price
                const lowestPriceVariation = availableVariations.find(v => parseFloat(v.price) === price);
                if (lowestPriceVariation && lowestPriceVariation.comparePrice) {
                    comparePrice = parseFloat(lowestPriceVariation.comparePrice);
                }
            } else {
                // If no stock, use the lowest price anyway
                price = Math.min(...product.ProductVariations.map(v => parseFloat(v.price)));
                
                // Get the compare price from the variation with the lowest price
                const lowestPriceVariation = product.ProductVariations.find(v => parseFloat(v.price) === price);
                if (lowestPriceVariation && lowestPriceVariation.comparePrice) {
                    comparePrice = parseFloat(lowestPriceVariation.comparePrice);
                }
            }
        }
        
        // Get primary image URL - prioritize variation images, then product images
        let imageUrl = '';
        let imagePath = '';
        
        // First, try to get image from variations (these are often the main product images)
        if (product.ProductVariations && product.ProductVariations.length > 0) {
            for (const variation of product.ProductVariations) {
                if (variation.VariationImages && variation.VariationImages.length > 0) {
                    imagePath = variation.VariationImages[0].image_url;
                    break;
                }
            }
        }
        
        // If no variation image found, try product-level images
        if (!imagePath && product.ProductImages && product.ProductImages.length > 0) {
            imagePath = product.ProductImages[0].image_url;
        }
        
        // Construct the full image URL
        if (imagePath) {
            if (imagePath.startsWith('http')) {
                imageUrl = imagePath;
            } else {
                // Handle both /uploads/products/ and direct filename formats
                if (imagePath.startsWith('/uploads/products/')) {
                    imageUrl = `${baseUrl}${imagePath}`;
                } else {
                    // For filenames like "variation_0_image-1752823428947-828439301.png"
                    imageUrl = `${baseUrl}/uploads/products/${imagePath}`;
                }
            }
        } else {
            // Fallback to a default product image if no image is found
            imageUrl = `${frontendUrl}/assets/card1-left.webp`;
        }
        
        // Get category name
        const categoryName = product.Category ? product.Category.name : '';
        
        // Build correct product link pointing to frontend
        // Use the original slug format - the frontend will handle URL decoding
        const productLink = `${frontendUrl}/ProductDetails?slug=${product.slug}`;
        
        // Debug logging to help troubleshoot URL issues
        if (product.slug.includes('elite-striped-crew-socks')) {
            console.log('=== BACKEND URL DEBUG ===');
            console.log('Product slug:', product.slug);
            console.log('Generated URL:', productLink);
            console.log('========================');
        }
        
        // Clean and format description - remove HTML tags for clean text
        let description = product.description || '';
        
        // Remove HTML tags and clean up the text
        description = description
            .replace(/<[^>]*>/g, '') // Remove all HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .replace(/&lt;/g, '<') // Replace &lt; with <
            .replace(/&gt;/g, '>') // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/&#39;/g, "'") // Replace &#39; with '
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
        
        // If description is empty or just whitespace, provide a default
        if (!description || description.trim() === '') {
            description = `Discover ${product.name} - Premium quality product from Cross Coin.`;
        }
        
        // Generate items for each variation (if multiple variations exist)
        if (product.ProductVariations && product.ProductVariations.length > 0) {
            for (const variation of product.ProductVariations) {
                // Skip variations with no stock
                if (variation.stock <= 0) continue;
                
                // Get variation-specific image
                let variationImageUrl = imageUrl; // Default to product image
                if (variation.VariationImages && variation.VariationImages.length > 0) {
                    const variationImagePath = variation.VariationImages[0].image_url;
                    if (variationImagePath.startsWith('http')) {
                        variationImageUrl = variationImagePath;
                    } else if (variationImagePath.startsWith('/uploads/products/')) {
                        variationImageUrl = `${baseUrl}${variationImagePath}`;
                    } else {
                        variationImageUrl = `${baseUrl}/uploads/products/${variationImagePath}`;
                    }
                }
                
                // Build variation-specific attributes
                let variationAttributes = '';
                if (variation.attributes && typeof variation.attributes === 'object') {
                    for (const [key, value] of Object.entries(variation.attributes)) {
                        if (value && value.toString().trim()) {
                            variationAttributes += ` ${key}: ${value}`;
                        }
                    }
                }
                
                // Create variation-specific title
                const variationTitle = variationAttributes ? 
                    `${product.name} - ${variationAttributes.trim()}` : 
                    product.name;
                
                // XML item for this variation
                xml += `<item>`;
                xml += `<g:id>${product.id}_${variation.id}</g:id>`; // Unique ID for each variation
                xml += `<g:title><![CDATA[${variationTitle}]]></g:title>`;
                xml += `<g:description><![CDATA[${description}]]></g:description>`;
                xml += `<g:link>${productLink}</g:link>`;
                xml += `<g:image_link>${variationImageUrl}</g:image_link>`;
                xml += `<g:price>${variation.price} INR</g:price>`;
                // Add compare price if available
                if (variation.comparePrice && variation.comparePrice > variation.price) {
                    xml += `<g:compare_at_price>${variation.comparePrice} INR</g:compare_at_price>`;
                }
                xml += `<g:availability>${variation.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>`;
                xml += `<g:brand>Cross Coin</g:brand>`;
                xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
                xml += `<g:sku>${variation.sku}</g:sku>`;
                
                // Add variation attributes as custom fields
                if (variation.attributes && typeof variation.attributes === 'object') {
                    for (const [key, value] of Object.entries(variation.attributes)) {
                        if (value && value.toString().trim()) {
                            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
                            xml += `<g:${cleanKey}><![CDATA[${value}]]></g:${cleanKey}>`;
                        }
                    }
                }
                
                xml += `</item>`;
            }
        } else {
            // Fallback: single item if no variations
        xml += `<item>`;
        xml += `<g:id>${product.id}</g:id>`;
        xml += `<g:title><![CDATA[${product.name}]]></g:title>`;
            xml += `<g:description><![CDATA[${description}]]></g:description>`;
        xml += `<g:link>${productLink}</g:link>`;
        xml += `<g:image_link>${imageUrl}</g:image_link>`;
        xml += `<g:price>${price} INR</g:price>`;
            // Add compare price if available (for platforms that support it)
            if (comparePrice > 0 && comparePrice > price) {
                xml += `<g:compare_at_price>${comparePrice} INR</g:compare_at_price>`;
            }
            xml += `<g:availability>${availability}</g:availability>`;
        xml += `<g:brand>Cross Coin</g:brand>`;
        xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
        xml += `</item>`;
        }
    }

    xml += `</channel></rss>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
});

module.exports = router;
