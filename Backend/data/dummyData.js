// Dummy Categories
export const categories = [
    {
        id: 1,
        name: "Woolen Socks",
        slug: "woolen-socks",
        description: "Warm and cozy woolen socks for cold weather",
        status: "active"
    },
    {
        id: 2,
        name: "Cotton Socks",
        slug: "cotton-socks",
        description: "Comfortable and breathable cotton socks",
        status: "active"
    },
    {
        id: 3,
        name: "Sports Socks",
        slug: "sports-socks",
        description: "Performance socks for athletic activities",
        status: "active"
    },
    {
        id: 4,
        name: "Fashion Socks",
        slug: "fashion-socks",
        description: "Stylish and trendy socks for everyday wear",
        status: "active"
    }
];

// Dummy Products
export const products = [
    {
        id: 1,
        name: "Premium Merino Wool Socks",
        slug: "premium-merino-wool-socks",
        description: "Luxurious merino wool socks for ultimate warmth and comfort. Perfect for cold weather and outdoor activities.",
        categoryId: 1,
        status: "active",
        badge: "new_arrival",
        variations: [
            {
                id: 1,
                price: 24.99,
                comparePrice: 29.99,
                stock: 100,
                sku: "MW-SOCKS-001",
                attributes: {
                    color: "Navy",
                    size: "M"
                }
            },
            {
                id: 2,
                price: 24.99,
                comparePrice: 29.99,
                stock: 85,
                sku: "MW-SOCKS-002",
                attributes: {
                    color: "Black",
                    size: "M"
                }
            },
            {
                id: 3,
                price: 24.99,
                comparePrice: 29.99,
                stock: 90,
                sku: "MW-SOCKS-003",
                attributes: {
                    color: "Gray",
                    size: "M"
                }
            }
        ],
        images: [
            {
                id: 1,
                image_url: "merino-wool-socks-1.jpg",
                alt_text: "Merino Wool Socks Navy",
                display_order: 1,
                is_primary: true
            },
            {
                id: 2,
                image_url: "merino-wool-socks-2.jpg",
                alt_text: "Merino Wool Socks Black",
                display_order: 2,
                is_primary: false
            }
        ]
    },
    {
        id: 2,
        name: "Organic Cotton Crew Socks",
        slug: "organic-cotton-crew-socks",
        description: "Soft and breathable organic cotton socks. Perfect for everyday wear and sensitive skin.",
        categoryId: 2,
        status: "active",
        badge: "hot_selling",
        variations: [
            {
                id: 4,
                price: 19.99,
                comparePrice: 24.99,
                stock: 150,
                sku: "OC-SOCKS-001",
                attributes: {
                    color: "White",
                    size: "L"
                }
            },
            {
                id: 5,
                price: 19.99,
                comparePrice: 24.99,
                stock: 120,
                sku: "OC-SOCKS-002",
                attributes: {
                    color: "Beige",
                    size: "L"
                }
            }
        ],
        images: [
            {
                id: 3,
                image_url: "cotton-crew-socks-1.jpg",
                alt_text: "Organic Cotton Crew Socks White",
                display_order: 1,
                is_primary: true
            },
            {
                id: 4,
                image_url: "cotton-crew-socks-2.jpg",
                alt_text: "Organic Cotton Crew Socks Beige",
                display_order: 2,
                is_primary: false
            }
        ]
    },
    {
        id: 3,
        name: "Performance Running Socks",
        slug: "performance-running-socks",
        description: "High-performance running socks with moisture-wicking technology and arch support.",
        categoryId: 3,
        status: "active",
        badge: "best_seller",
        variations: [
            {
                id: 6,
                price: 22.99,
                comparePrice: 27.99,
                stock: 200,
                sku: "PR-SOCKS-001",
                attributes: {
                    color: "Blue",
                    size: "S"
                }
            },
            {
                id: 7,
                price: 22.99,
                comparePrice: 27.99,
                stock: 180,
                sku: "PR-SOCKS-002",
                attributes: {
                    color: "Red",
                    size: "S"
                }
            },
            {
                id: 8,
                price: 22.99,
                comparePrice: 27.99,
                stock: 190,
                sku: "PR-SOCKS-003",
                attributes: {
                    color: "Black",
                    size: "S"
                }
            }
        ],
        images: [
            {
                id: 5,
                image_url: "running-socks-1.jpg",
                alt_text: "Performance Running Socks Blue",
                display_order: 1,
                is_primary: true
            },
            {
                id: 6,
                image_url: "running-socks-2.jpg",
                alt_text: "Performance Running Socks Red",
                display_order: 2,
                is_primary: false
            }
        ]
    },
    {
        id: 4,
        name: "Patterned Fashion Socks",
        slug: "patterned-fashion-socks",
        description: "Stylish patterned socks for a unique look. Perfect for adding personality to your outfit.",
        categoryId: 4,
        status: "active",
        badge: "new_arrival",
        variations: [
            {
                id: 9,
                price: 16.99,
                comparePrice: 21.99,
                stock: 120,
                sku: "PF-SOCKS-001",
                attributes: {
                    color: "Striped",
                    size: "M"
                }
            },
            {
                id: 10,
                price: 16.99,
                comparePrice: 21.99,
                stock: 100,
                sku: "PF-SOCKS-002",
                attributes: {
                    color: "Polka Dot",
                    size: "M"
                }
            },
            {
                id: 11,
                price: 16.99,
                comparePrice: 21.99,
                stock: 110,
                sku: "PF-SOCKS-003",
                attributes: {
                    color: "Geometric",
                    size: "M"
                }
            }
        ],
        images: [
            {
                id: 7,
                image_url: "fashion-socks-1.jpg",
                alt_text: "Patterned Fashion Socks Striped",
                display_order: 1,
                is_primary: true
            },
            {
                id: 8,
                image_url: "fashion-socks-2.jpg",
                alt_text: "Patterned Fashion Socks Polka Dot",
                display_order: 2,
                is_primary: false
            }
        ]
    }
]; 