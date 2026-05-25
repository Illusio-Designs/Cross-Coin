const express = require("express");
const {
  Product,
  ProductVariation,
  ProductImage,
  Category,
  Brand,
  BrandSetting,
} = require("../model/associations.js");
const imagekitService = require("../services/imagekitService");
const router = express.Router();

/**
 * Resolve a stored image_url to a full ImageKit public URL.
 * Handles: ImageKit filePaths, legacy /uploads/ paths, and already-full URLs.
 */
function resolveImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return imagekitService.getOptimizedUrl(imagePath, "large");
}

/**
 * Resolve which brand this feed request is for.
 * Priority:
 *   1. ?brand=<slug>          — explicit brand slug
 *   2. ?brand_id=<id>         — explicit brand id
 *   3. ?catalog_id=<fbCatId>  — look up brand whose FB_CATALOG_ID setting matches
 *   4. null                   — no brand scoping (legacy: all products)
 */
async function resolveBrand(req) {
  const { brand: brandSlug, brand_id: brandIdParam, catalog_id: catalogId } =
    req.query;

  if (brandSlug) {
    return await Brand.findOne({
      where: { slug: String(brandSlug).toLowerCase(), status: "active" },
    });
  }

  if (brandIdParam) {
    return await Brand.findOne({
      where: { id: parseInt(brandIdParam, 10), status: "active" },
    });
  }

  if (catalogId) {
    const setting = await BrandSetting.findOne({
      where: { key: "FB_CATALOG_ID", value: String(catalogId) },
    });
    if (setting) {
      return await Brand.findOne({
        where: { id: setting.brand_id, status: "active" },
      });
    }
  }

  return null;
}

// Facebook Catalog Feed Endpoint
router.get("/feed", async (req, res) => {
  const brand = await resolveBrand(req);

  const frontendUrl =
    (brand && brand.domain) ||
    process.env.FRONTEND_URL ||
    "https://crosscoin.in";

  const brandName = brand ? brand.display_name || brand.name : "Cross Coin";

  // Build include options — when a brand is resolved, inner-join through the
  // Brands m2m association so only that brand's products are returned.
  const includeOptions = [
    {
      model: Category,
      as: "Category",
      attributes: ["name"],
    },
    {
      model: ProductVariation,
      as: "ProductVariations",
      attributes: ["id", "price", "comparePrice", "stock", "sku"],
      order: [["price", "ASC"]],
      include: [
        {
          model: ProductImage,
          as: "VariationImages",
          required: false,
          attributes: [
            "image_url",
            "alt_text",
            "is_primary",
            "display_order",
          ],
          order: [
            ["is_primary", "DESC"],
            ["display_order", "ASC"],
          ],
        },
      ],
    },
    {
      model: ProductImage,
      as: "ProductImages",
      required: false,
      attributes: ["image_url", "alt_text", "is_primary", "display_order"],
      order: [
        ["is_primary", "DESC"],
        ["display_order", "ASC"],
      ],
    },
  ];

  if (brand) {
    includeOptions.push({
      model: Brand,
      as: "Brands",
      required: true,
      attributes: ["id", "name", "slug", "display_name"],
      where: { id: brand.id },
      through: {
        attributes: ["status"],
        where: { status: "active" },
      },
    });
  }

  const products = await Product.findAll({
    where: { status: "active" },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<rss xmlns:g="http://base.google.com/ns/1.0"><channel>`;
  xml += `<title>${brandName} Product Feed</title>`;

  for (const product of products) {
    // Get the lowest price and compare price from variations
    let price = 0;
    let comparePrice = 0;
    let availability = "out of stock";

    if (product.ProductVariations && product.ProductVariations.length > 0) {
      // Find the variation with the lowest price that has stock
      const availableVariations = product.ProductVariations.filter(
        (v) => v.stock > 0
      );
      if (availableVariations.length > 0) {
        price = Math.min(
          ...availableVariations.map((v) => parseFloat(v.price))
        );
        availability = "in stock";

        // Get the compare price from the variation with the lowest price
        const lowestPriceVariation = availableVariations.find(
          (v) => parseFloat(v.price) === price
        );
        if (lowestPriceVariation && lowestPriceVariation.comparePrice) {
          comparePrice = parseFloat(lowestPriceVariation.comparePrice);
        }
      } else {
        // If no stock, use the lowest price anyway
        price = Math.min(
          ...product.ProductVariations.map((v) => parseFloat(v.price))
        );

        // Get the compare price from the variation with the lowest price
        const lowestPriceVariation = product.ProductVariations.find(
          (v) => parseFloat(v.price) === price
        );
        if (lowestPriceVariation && lowestPriceVariation.comparePrice) {
          comparePrice = parseFloat(lowestPriceVariation.comparePrice);
        }
      }
    }

    // Get primary image URL - prioritize variation images, then product images
    let imageUrl = null;
    let imagePath = "";

    // First, try to get image from variations
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

    imageUrl = resolveImageUrl(imagePath);

    // Get category name
    const categoryName = product.Category ? product.Category.name : "";

    // Build correct product link pointing to frontend
    // URL encode the slug to handle special characters like parentheses, spaces, etc.
    const productLink = `${frontendUrl}/ProductDetails?slug=${encodeURIComponent(
      product.slug
    )}`;

    // Clean and format description - remove HTML tags for clean text
    let description = product.description || "";

    // Remove HTML tags and clean up the text
    description = description
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .replace(/&amp;/g, "&") // Replace &amp; with &
      .replace(/&lt;/g, "<") // Replace &lt; with <
      .replace(/&gt;/g, ">") // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // If description is empty or just whitespace, provide a default
    if (!description || description.trim() === "") {
      description = `Discover ${product.name} - Premium quality product from ${brandName}.`;
    }

    // Generate items for each variation (if multiple variations exist)
    let hasIncludedVariation = false;
    if (product.ProductVariations && product.ProductVariations.length > 0) {
      for (const variation of product.ProductVariations) {
        // Include all variations, regardless of stock status

        // Get variation-specific image
        let variationImageUrl = imageUrl; // Default to product image
        if (variation.VariationImages && variation.VariationImages.length > 0) {
          variationImageUrl = resolveImageUrl(variation.VariationImages[0].image_url) || imageUrl;
        }

        // Build variation-specific attributes
        let variationAttributes = "";
        if (variation.attributes && typeof variation.attributes === "object") {
          for (const [key, value] of Object.entries(variation.attributes)) {
            if (value && value.toString().trim()) {
              variationAttributes += ` ${key}: ${value}`;
            }
          }
        }

        // Create variation-specific title
        const variationTitle = variationAttributes
          ? `${product.name} - ${variationAttributes.trim()}`
          : product.name;

        // XML item for this variation
        xml += `<item>`;
        xml += `<g:id>${product.id}_${variation.id}</g:id>`;
        xml += `<g:item_group_id>${product.id}</g:item_group_id>`;
        xml += `<g:title><![CDATA[${variationTitle}]]></g:title>`;
        xml += `<g:description><![CDATA[${description}]]></g:description>`;
        xml += `<g:link>${productLink}</g:link>`;
        xml += `<g:image_link>${variationImageUrl}</g:image_link>`;
        xml += `<g:price>${variation.price} INR</g:price>`;
        // Add compare price if available
        if (
          variation.comparePrice &&
          variation.comparePrice > variation.price
        ) {
          xml += `<g:compare_at_price>${variation.comparePrice} INR</g:compare_at_price>`;
        }
        xml += `<g:availability>${
          variation.stock > 0 ? "in stock" : "out of stock"
        }</g:availability>`;
        xml += `<g:brand>${brandName}</g:brand>`;
        xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
        xml += `<g:sku>${variation.sku}</g:sku>`;
        xml += `<g:condition>New</g:condition>`;

        // Add variation attributes as custom fields
        if (variation.attributes && typeof variation.attributes === "object") {
          for (const [key, value] of Object.entries(variation.attributes)) {
            if (value && value.toString().trim()) {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "_");
              xml += `<g:${cleanKey}><![CDATA[${value}]]></g:${cleanKey}>`;
            }
          }
        }

        xml += `</item>`;
        hasIncludedVariation = true;
      }
    }

    // If no variations were included (all out of stock), include the first variation anyway
    if (
      product.ProductVariations &&
      product.ProductVariations.length > 0 &&
      !hasIncludedVariation
    ) {
      const firstVariation = product.ProductVariations[0];
      // Include the first variation even if out of stock
      let variationImageUrl = imageUrl;
      if (
        firstVariation.VariationImages &&
        firstVariation.VariationImages.length > 0
      ) {
        variationImageUrl = resolveImageUrl(firstVariation.VariationImages[0].image_url) || imageUrl;
      }

      xml += `<item>`;
      xml += `<g:id>${product.id}_${firstVariation.id}</g:id>`;
      xml += `<g:item_group_id>${product.id}</g:item_group_id>`;
      xml += `<g:title><![CDATA[${product.name}]]></g:title>`;
      xml += `<g:description><![CDATA[${description}]]></g:description>`;
      xml += `<g:link>${productLink}</g:link>`;
      xml += `<g:image_link>${variationImageUrl}</g:image_link>`;
      xml += `<g:price>${firstVariation.price} INR</g:price>`;
      if (
        firstVariation.comparePrice &&
        firstVariation.comparePrice > firstVariation.price
      ) {
        xml += `<g:compare_at_price>${firstVariation.comparePrice} INR</g:compare_at_price>`;
      }
      xml += `<g:availability>${
        firstVariation.stock > 0 ? "in stock" : "out of stock"
      }</g:availability>`;
      xml += `<g:brand>${brandName}</g:brand>`;
      xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
      xml += `<g:sku>${firstVariation.sku}</g:sku>`;
      xml += `<g:condition>New</g:condition>`;
      xml += `</item>`;
    } else if (
      !product.ProductVariations ||
      product.ProductVariations.length === 0
    ) {
      // Fallback: single item if no variations
      xml += `<item>`;
      xml += `<g:id>${product.id}</g:id>`;
      xml += `<g:item_group_id>${product.id}</g:item_group_id>`;
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
      xml += `<g:brand>${brandName}</g:brand>`;
      xml += `<g:product_type><![CDATA[${categoryName}]]></g:product_type>`;
      xml += `<g:condition>New</g:condition>`;
      xml += `</item>`;
    }
  }

  xml += `</channel></rss>`;
  res.set("Content-Type", "application/xml");
  res.send(xml);
});

module.exports = router;
