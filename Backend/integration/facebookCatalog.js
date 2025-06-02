import express from "express";
import { sequelize } from '../config/db.js';  // Use default import

const router = express.Router();

router.get("/facebook-catalog", async (req, res) => {
    const products = await sequelize.query("SELECT id, name, price, image FROM products");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0"><channel>`;
    xml += `<title>My Store Products</title>`;

    products.forEach(product => {
        xml += `<item>`;
        xml += `<g:id>${product.id}</g:id>`;
        xml += `<g:title>${product.name}</g:title>`;
        xml += `<g:price>${product.price} INR</g:price>`;
        xml += `<g:image_link>https://yourwebsite.com/images/${product.image}</g:image_link>`;
        xml += `</item>`;
    });

    xml += `</channel></rss>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
});

export default router;
