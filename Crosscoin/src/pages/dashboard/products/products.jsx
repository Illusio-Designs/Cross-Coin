import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { productService } from "../../../services";
import { categoryService } from "../../../services";
import { attributeService } from "../../../services";
import { debounce } from 'lodash';
import AttributeSelector from '../../../components/products/AttributeSelector';
import ExistingImageSelector from '../../../components/products/ExistingImageSelector';
import BrandTags from '../../../components/Dashboard/BrandTags';
import BrandAssignment from '../../../components/Dashboard/BrandAssignment';
import ProductFilterDrawer from '../../../components/products/ProductFilterDrawer';
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const ProductsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filterValue, setFilterValue] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 10000 },
    status: [],
    badge: [],
    attributes: {}
  });
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showExistingImageSelector, setShowExistingImageSelector] = useState(false);
  const [showVariationImageSelector, setShowVariationImageSelector] = useState(false);
  const [currentVariationIndex, setCurrentVariationIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    status: "active",
    price: "",
    stock: "",
    images: [],
    imagesToDelete: [], // Track images to delete
    variationImagesToDelete: [], // Track variation images to delete
    weight: "",
    weightUnit: "g",
    dimensions: { length: "", width: "", height: "" },
    dimensionUnit: "cm",
    brandIds: [1], // Default to CrossCoin brand
    variations: [{
      price: "",
      comparePrice: "",
      stock: "",
      sku: "",
      attributes: {}
    }],
    seo: {
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      canonicalUrl: "",
      structuredData: ""
    },
    variationImages: [], // Array of arrays, one per variation
  });
  const [openVariations, setOpenVariations] = useState({});
  const [attributes, setAttributes] = useState({});

  const toggleVariation = (index) => {
    setOpenVariations(prev => ({ ...prev, [index]: !prev[index] }));
  };



  // Debounced search function
  const debouncedSearch = useCallback((searchTerm) => {
    const timeoutId = setTimeout(() => {
      setFilterValue(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response);
    } catch (err) {
      }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch attributes
  const fetchAttributes = async () => {
    try {
      const response = await attributeService.getAllAttributes();
      // Correctly access `AttributeValues` from the backend response
      // And map them to an array of just the string values
      const formattedAttributes = response.reduce((acc, attribute) => {
        const attributeValues = attribute.AttributeValues?.map(val => val.value) || [];
        acc[attribute.name] = attributeValues;
        return acc;
      }, {});
      setAttributes(formattedAttributes);
      } catch (err) {
      }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Fetch products data
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getAllProducts(currentPage, itemsPerPage, filterValue);
      if (response && response.products) {
        setProducts(response.products);
        setTotalProducts(response.totalProducts);
      } else {
        setError('Invalid response format');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filterValue]);

  // Initial data fetch for products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle filter application
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Backend handles filtering and pagination
  const filteredData = products;

  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const currentItems = filteredData;

  // Add serial number to each row
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: (currentPage - 1) * itemsPerPage + idx + 1
  }));

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  // Add badge display component
  const BadgeDisplay = ({ badge }) => {
    if (!badge || badge === 'none') return null;

    const badgeStyles = {
      new_arrival: { color: '#10B981', bgColor: '#D1FAE5' },
      hot_selling: { color: '#EF4444', bgColor: '#FEE2E2' },
      low_stock: { color: '#F59E0B', bgColor: '#FEF3C7' }
    };

    const badgeLabels = {
      new_arrival: 'New Arrival',
      hot_selling: 'Hot Selling',
      low_stock: 'Low Stock'
    };

    const style = badgeStyles[badge] || { color: '#6B7280', bgColor: '#F3F4F6' };

    return (
      <span className={`prod-badge prod-badge--${badge}`}>
        {badgeLabels[badge] || badge}
      </span>
    );
  };

  // Update columns definition to include badge and avg_rating
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    {
      header: "Product",
      accessor: row => (
        <div className="prod-name-cell">
          <span className="prod-name">{row.name}</span>
          <BadgeDisplay badge={row.badge} />
        </div>
      )
    },
    {
      header: "Category",
      accessor: row => (
        <span className="sl-cat-badge">
          {row.category?.name || 'Uncategorized'}
        </span>
      )
    },
    {
      header: "Brands",
      accessor: row => <BrandTags brands={row.brands || []} />
    },
    {
      header: "Avg. Rating",
      accessor: row => (
        <span className="prod-rating">
          {row.avg_rating ? `${Number(row.avg_rating).toFixed(1)} / 5` : <span className="sl-na">N/A</span>}
        </span>
      )
    },
    {
      header: "Status",
      accessor: row => (
        <span className={`sl-status-badge ${row.status === 'active' ? 'sl-status-active' : 'sl-status-inactive'}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id, name }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" onClick={() => handleEdit(id)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
          </button>
          <button className="sl-btn-delete" onClick={() => handleDelete(id)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  // Update handleEdit to include badge
  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const response = await productService.getProduct(id);
      const product = response;
      
      if (product.variations) {
        product.variations.forEach((variation, index) => {
          });
      }
      // Format the data for the form
      const formData = {
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        status: product.status,
        badge: product.badge || 'none',
        total_sold: product.total_sold || 0,
        brandIds: product.brands?.map(b => b.id) || [1], // Extract brand IDs or default to CrossCoin
        imagesToDelete: [], // Reset deletion tracking
        variationImagesToDelete: [], // Reset deletion tracking
        images: product.images?.map(img => {
          // Get the base URL
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
          
          // Construct the proper image URL
          let imageUrl = img.image_url;
          if (!imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/uploads/')) {
              imageUrl = `${baseUrl}${imageUrl}`;
            } else {
              imageUrl = `${baseUrl}/uploads/products/${imageUrl}`;
            }
          }
          
          return {
            id: img.id,
            name: imageUrl.split('/').pop(),
            image_url: imageUrl, // Use the full URL
            url: imageUrl, // Also provide url for compatibility
            type: 'image/jpeg',
            existing: true
          };
        }) || [],
        weight: product.weight || '',
        weightUnit: product.weightUnit || 'g',
        dimensions: product.dimensions || { length: '', width: '', height: '' },
        dimensionUnit: product.dimensionUnit || 'cm',
        variations: product.variations?.map(variation => {
          // Parse attributes if it's a string and ensure proper object structure
          let attributes = variation.attributes || {}; // Directly get attributes from attributes from variation
          if (typeof attributes === 'string') {
            try {
              attributes = JSON.parse(attributes);
            } catch (e) {
              attributes = {};
            }
          }
          const formattedAttributes = {};
          if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
              const formattedKey = key.toLowerCase();
              formattedAttributes[formattedKey] = Array.isArray(value) ? value : [String(value)];
            });
          }
          return {
            id: variation.id,
            price: variation.price,
            comparePrice: variation.comparePrice,
            stock: variation.stock,
            sku: variation.sku,
            attributes: formattedAttributes
          };
        }) || [],
        seo: {
          metaTitle: product.seo?.metaTitle || product.name,
          metaDescription: product.seo?.metaDescription || product.description,
          metaKeywords: product.seo?.metaKeywords || '',
          ogTitle: product.seo?.ogTitle || product.name,
          ogDescription: product.seo?.ogDescription || product.description,
          ogImage: product.seo?.ogImage || (product.images?.[0] ? `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}${product.images[0].image_url}` : null),
          canonicalUrl: product.seo?.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://crosscoin.in'}/products/${product.slug}`,
          structuredData: product.seo?.structuredData || JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description,
            "image": product.images?.[0] ? `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}${product.images[0].image_url}` : null,
            "offers": {
              "@type": "Offer",
              "price": product.variations?.[0]?.price || 0,
              "priceCurrency": "INR",
              "availability": product.variations?.[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
          })
        },
        variationImages: product.variations?.map((variation, vIndex) => {
          const variationImages = variation.images?.map(img => {
            // Get the base URL
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
            
            // Construct the proper image URL
            let imageUrl = img.image_url;
            if (!imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/uploads/')) {
                imageUrl = `${baseUrl}${imageUrl}`;
              } else {
                imageUrl = `${baseUrl}/uploads/products/${imageUrl}`;
              }
            }
            
            const imageObj = {
              id: img.id,
              name: imageUrl.split('/').pop(),
              url: imageUrl,
              image_url: imageUrl, // Also provide image_url for compatibility
              type: 'image/jpeg',
              existing: true
            };
            return imageObj;
          }) || [];
          
          return variationImages;
        }) || []
      };

      setFormData(formData);
      setIsModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching product details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Are you sure you want to delete this product?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await productService.deleteProduct(id);
        await fetchProducts();
      } catch (err) {
        setError(err.message || "Failed to delete product");
      } finally {
        setLoading(false);
      }
    }});
  };

  const handleAddNew = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      status: "active",
      price: "",
      stock: "",
      images: [],
      imagesToDelete: [], // Add missing array
      variationImagesToDelete: [], // Add missing array
      weight: "",
      weightUnit: "g",
      dimensions: { length: "", width: "", height: "" },
      dimensionUnit: "cm",
      brandIds: [],
      variations: [{
        price: "",
        comparePrice: "",
        stock: "",
        sku: "",
        attributes: {}
      }],
      seo: {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        canonicalUrl: "",
        structuredData: ""
      },
      variationImages: []
    });
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setShowExistingImageSelector(false); // Reset image selector
    setShowVariationImageSelector(false); // Reset variation image selector
    setCurrentVariationIndex(null); // Reset variation index
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      status: "active",
      price: "",
      stock: "",
      images: [],
      imagesToDelete: [], // Reset deletion tracking
      variationImagesToDelete: [], // Reset deletion tracking
      weight: "",
      weightUnit: "g",
      dimensions: { length: "", width: "", height: "" },
      dimensionUnit: "cm",
      variations: [{
        price: "",
        comparePrice: "",
        stock: "",
        sku: "",
        attributes: {}
      }],
      seo: {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        canonicalUrl: "",
        structuredData: ""
      },
      variationImages: []
    });
  };

  const handleExistingImagesSelect = (selectedImages) => {
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...selectedImages]
    }));
  };

  const handleVariationExistingImagesSelect = (selectedImages) => {
    if (currentVariationIndex !== null) {
      setFormData(prev => {
        const newVariationImages = [...(prev.variationImages || [])];
        // Initialize the array for this variation if it doesn't exist
        if (!newVariationImages[currentVariationIndex]) {
          newVariationImages[currentVariationIndex] = [];
        }
        // Add selected images to the variation
        newVariationImages[currentVariationIndex] = [
          ...(newVariationImages[currentVariationIndex] || []),
          ...selectedImages
        ];
        return { ...prev, variationImages: newVariationImages };
      });
    }
  };

  const openVariationImageSelector = (variationIndex) => {
    setCurrentVariationIndex(variationIndex);
    setShowVariationImageSelector(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (!name) {
      return;
    }
    
    if (name.startsWith('seo.')) {
      const seoField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        seo: {
          ...prev.seo,
          [seoField]: value
        }
      }));
    } else if (name.startsWith('variations.')) {
      const [_, index, ...fields] = name.split('.');
      const variationIndex = parseInt(index);

      setFormData(prev => {
        const newVariations = [...prev.variations];
        let current = newVariations[variationIndex];

        // Handle nested fields (attributes, dimensions, etc.)
        if (fields.length === 2) {
          // e.g., dimensions.length, attributes.color, etc.
          const [parent, child] = fields;
          if (parent === 'attributes' || parent === 'dimensions') {
            current = {
              ...current,
              [parent]: {
                ...current[parent],
                [child]: type === 'number' ? (value ? Number(value) : '') : value
              }
            };
          } else {
            current = {
              ...current,
              [parent]: type === 'number' ? (value ? Number(value) : '') : value
            };
          }
        } else if (fields.length === 1) {
          // e.g., price, stock, sku, weight, weightUnit, dimensionUnit
          const [field] = fields;
          current = {
            ...current,
            [field]: type === 'number' ? (value ? Number(value) : '') : value
          };
        }

        newVariations[variationIndex] = current;
        return {
          ...prev,
          variations: newVariations
        };
      });
    } else if (name.startsWith('dimensions.')) {
      const dimKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimKey]: type === 'number' ? (value ? Number(value) : '') : value
        }
      }));
    } else if (name.startsWith('weight')) {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value ? Number(value) : '') : value
      }));
    } else if (name.startsWith('dimensionUnit')) {
      setFormData(prev => ({
        ...prev,
        dimensionUnit: value
      }));
    } else if (name.startsWith('variationImage.')) {
      const variationIndex = parseInt(name.split('.')[1]);
      const files = Array.from(e.target.files);
      setFormData(prev => {
        const newVariationImages = [...(prev.variationImages || [])];
        // Initialize the array for this variation if it doesn't exist
        if (!newVariationImages[variationIndex]) {
          newVariationImages[variationIndex] = [];
        }
        // Add new files to existing images for this variation
        newVariationImages[variationIndex] = [...newVariationImages[variationIndex], ...files];
        return { ...prev, variationImages: newVariationImages };
      });
      return;
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        return updated;
      });
    }
  };

  // New handler for AttributeSelector changes
  const handleAttributeChange = (variationIndex, updatedAttributes) => {
    setFormData(prev => {
      const newVariations = [...prev.variations];
      newVariations[variationIndex] = {
        ...newVariations[variationIndex],
        attributes: updatedAttributes
      };
      return {
        ...prev,
        variations: newVariations
      };
    });
  };

  const addVariation = () => {
    setFormData(prev => {
      const newIndex = prev.variations.length;
      setOpenVariations(o => ({ ...o, [newIndex]: true }));
      return {
        ...prev,
        variations: [
          ...prev.variations,
          { price: "", comparePrice: "", stock: "", sku: "", attributes: {} }
        ]
      };
    });
  };

  const removeVariation = (index) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  };

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        if (formData.images) {
          formData.images.forEach((img, idx) => {
            });
        }
        // Get the first image URL for SEO
        let firstImageUrl = null;
        if (formData.images && formData.images.length > 0) {
            const firstImage = formData.images[0];
            if (firstImage instanceof File) {
                firstImageUrl = URL.createObjectURL(firstImage);
            } else if (firstImage.url) {
                firstImageUrl = firstImage.url;
            }
        }

        // Handle variations with attributes
        const variationsWithAttributes = formData.variations.map(variation => {
            // Process attributes: filter out empty, ensure values are arrays of strings
            const processedAttributes = {};
            if (variation.attributes) {
                Object.entries(variation.attributes).forEach(([key, value]) => {
                    // Normalize key to lowercase to ensure consistency
                    const normalizedKey = key.toLowerCase(); 
                    
                    let cleanedValues = [];
                    if (typeof value === 'string' && value.trim() !== '') {
                        cleanedValues = value.split(',').map(v => v.trim()).filter(v => v !== '');
                    } else if (Array.isArray(value)) {
                        cleanedValues = value.map(v => String(v).trim()).filter(v => v !== '');
                    }

                    if (cleanedValues.length > 0) {
                        processedAttributes[normalizedKey] = cleanedValues;
                    }
                });
            }

            return {
                id: variation.id,
            price: variation.price,
                comparePrice: variation.comparePrice || null,
            stock: variation.stock,
            sku: variation.sku,
                attributes: processedAttributes
            };
        });

        // === VALIDATION ===
        for (const v of variationsWithAttributes) {
          if (!v.price || isNaN(v.price) || Number(v.price) <= 0) {
            setError("Each variation must have a valid price.");
            setLoading(false);
            return;
          }
        }
        if (!formData.categoryId) {
          setError("Category is required.");
          setLoading(false);
          return;
        }
        if (!formData.brandIds || formData.brandIds.length === 0) {
          setError("Please assign the product to at least one brand.");
          setLoading(false);
          return;
        }

        // Handle SEO data
        const seoData = {
            metaTitle: formData.seo.metaTitle || formData.name,
            metaDescription: formData.seo.metaDescription || formData.description,
            metaKeywords: formData.seo.metaKeywords || '',
            ogTitle: formData.seo.metaTitle || formData.name,
            ogDescription: formData.seo.metaDescription || formData.description,
            ogImage: firstImageUrl,
            canonicalUrl: formData.seo.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://crosscoin.in'}/products/${formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}`,
            structuredData: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": formData.name,
                "description": formData.description,
                "image": firstImageUrl,
                "offers": {
                    "@type": "Offer",
                    "price": variationsWithAttributes[0]?.price || 0,
                    "priceCurrency": "INR",
                    "availability": variationsWithAttributes[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                }
            })
        };

        // Create FormData
        const formDataToSend = new FormData();

        // Add basic fields
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('categoryId', formData.categoryId);
        formDataToSend.append('status', formData.status);
        formDataToSend.append('badge', formData.badge || 'none');
        formDataToSend.append('total_sold', formData.total_sold || 0);
        formDataToSend.append('weight', formData.weight || '');
        formDataToSend.append('weightUnit', formData.weightUnit || 'g');
        formDataToSend.append('dimensions', JSON.stringify(formData.dimensions));
        formDataToSend.append('dimensionUnit', formData.dimensionUnit || 'cm');
        
        // Add brand IDs
        formDataToSend.append('brandIds', JSON.stringify(formData.brandIds || []));

        // Add variations
        formDataToSend.append('variations', JSON.stringify(variationsWithAttributes));

        // Add SEO data
        formDataToSend.append('seo', JSON.stringify(seoData));

        // Add images (ONLY new files and newly selected library images)
        const libraryImages = [];
        
        if (formData.images && formData.images.length > 0) {
            formData.images.forEach((image, index) => {
                if (image instanceof File) {
                    // New uploaded files
                    formDataToSend.append(`images`, image);
                } else if (image.fromLibrary === true) {
                    // Newly selected library images
                    libraryImages.push({
                        image_url: image.image_url || image.url,
                        url: image.url || image.image_url,
                        name: image.name
                    });
                }
                // Existing images (image.existing === true) are completely ignored
                // They will be preserved automatically by the backend
            });
        }
        
        // Debug preserve IDs
        if (formData.id && formData.images) {
            const existingImageIds = formData.images
                .filter(img => img.existing === true && img.id)
                .map(img => img.id);
            }
        if (formData.id && formData.variationImages) {
            const existingVariationImageIds = [];
            formData.variationImages.forEach(images => {
                if (images && images.length > 0) {
                    images.forEach(img => {
                        if (img.existing === true && img.id) {
                            existingVariationImageIds.push(img.id);
                        }
                    });
                }
            });
            }
        
        // Add library images data
        if (libraryImages.length > 0) {
            formDataToSend.append('libraryImages', JSON.stringify(libraryImages));
        }

        // Add images to delete (for updates)
        if (formData.id && formData.imagesToDelete && formData.imagesToDelete.length > 0) {
            formDataToSend.append('imagesToDelete', JSON.stringify(formData.imagesToDelete));
        }

        // Add variation images to delete (for updates)
        if (formData.id && formData.variationImagesToDelete && formData.variationImagesToDelete.length > 0) {
            formDataToSend.append('variationImagesToDelete', JSON.stringify(formData.variationImagesToDelete));
        }

        // Add existing image IDs to preserve (for updates)
        if (formData.id && formData.images) {
            const existingImageIds = formData.images
                .filter(img => img.existing === true && img.id)
                .map(img => img.id);
            if (existingImageIds.length > 0) {
                formDataToSend.append('preserveImageIds', JSON.stringify(existingImageIds));
            }
        }

        // Add existing variation image IDs to preserve (for updates)
        if (formData.id && formData.variationImages) {
            const existingVariationImageIds = [];
            formData.variationImages.forEach(images => {
                if (images && images.length > 0) {
                    images.forEach(img => {
                        if (img.existing === true && img.id) {
                            existingVariationImageIds.push(img.id);
                        }
                    });
                }
            });
            if (existingVariationImageIds.length > 0) {
                formDataToSend.append('preserveVariationImageIds', JSON.stringify(existingVariationImageIds));
            }
        }

        // Add variation images (ONLY new files and newly selected library images)
        const variationLibraryImages = [];
        
        if (formData.variationImages && formData.variationImages.length > 0) {
          formData.variationImages.forEach((images, vIdx) => {
            if (images && images.length > 0) {
              images.forEach((img, imgIdx) => {
                if (img instanceof File) {
                  formDataToSend.append(`variation_${vIdx}_image`, img);
                } else if (img.fromLibrary === true) {
                  // Newly selected library images for variation
                  if (!variationLibraryImages[vIdx]) {
                    variationLibraryImages[vIdx] = [];
                  }
                  variationLibraryImages[vIdx].push({
                    image_url: img.image_url || img.url,
                    url: img.url || img.image_url,
                    name: img.name
                  });
                }
                // Existing variation images (img.existing === true) are completely ignored
                // They will be preserved automatically by the backend
              });
            }
          });
        }

        // Add variation library images data
        if (variationLibraryImages.length > 0) {
          formDataToSend.append('variationLibraryImages', JSON.stringify(variationLibraryImages));
        }

        let response;
        if (formData.id) {
            response = await productService.updateProduct(formData.id, formDataToSend);
        } else {
            response = await productService.createProduct(formDataToSend);
        }

        if (response.success) {
            setIsModalOpen(false);
            await fetchProducts();
        } else {
            throw new Error(response.message || 'Failed to save product');
        }
    } catch (err) {
        setError(err.message || err.response?.data?.message || "Error saving product");
    } finally {
        setLoading(false);
    }
  };

  const renderModalStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Input
              label="Product Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <div className="dm-field">
              <label className="dm-label">Description</label>
              <ReactQuill
                theme="snow"
                value={formData.description}
                onChange={val => setFormData(prev => ({ ...prev, description: val }))}
                style={{ minHeight: 150, marginBottom: 16 }}
              />
            </div>
            <div className="dm-field">
              <label className="dm-label">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  handleInputChange(e);
                  }}
                name="categoryId"
                required
                className="dm-input dm-select"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Status"
              type="select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'draft', label: 'Draft' }
              ]}
              required
            />
            <Input
              label="Badge"
              type="select"
              name="badge"
              value={formData.badge}
              onChange={handleInputChange}
              options={[
                { value: 'none', label: 'No Badge' },
                { value: 'new_arrival', label: 'New Arrival' },
                { value: 'hot_selling', label: 'Hot Selling' },
                { value: 'low_stock', label: 'Low Stock' }
              ]}
            />
            
            {/* Brand Assignment */}
            <BrandAssignment
              selectedBrands={formData.brandIds || []}
              onChange={(brandIds) => setFormData(prev => ({ ...prev, brandIds }))}
              disabled={loading}
            />
            
            {/* Product Images Upload */}
            <div className="product-images-section">
              <label className="dm-label">Product Images</label>
              <div className="prd-upload-row">
                <input
                  type="file"
                  name="images"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...files] }));
                  }}
                />
                <button type="button" className="prd-select-btn" onClick={() => setShowExistingImageSelector(true)}>
                  Select Existing
                </button>
              </div>
              <div className="prd-img-grid">
                {formData.images && formData.images.map((img, imgIdx) => {
                  const imageUrl = img instanceof File ? URL.createObjectURL(img) : (img.url || img.image_url);
                  return (
                    <div key={imgIdx} className="prd-img-thumb">
                      <img src={imageUrl} alt={`Product Image ${imgIdx + 1}`} />
                      <button type="button" className="prd-img-remove" onClick={() => {
                        const imageToRemove = formData.images[imgIdx];
                        setFormData(prev => {
                          const newState = { ...prev, images: prev.images.filter((_, i) => i !== imgIdx) };
                          if (imageToRemove.existing && imageToRemove.id) newState.imagesToDelete = [...prev.imagesToDelete, imageToRemove.id];
                          return newState;
                        });
                      }}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="weight-dimensions-section">
              <div className="weight-section">
                <Input
                  label="Weight"
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="Enter weight"
                />
                <Input
                  label="Weight Unit"
                  type="select"
                  name="weightUnit"
                  value={formData.weightUnit}
                  onChange={handleInputChange}
                  options={[
                    { value: 'g', label: 'Grams (g)' },
                    { value: 'kg', label: 'Kilograms (kg)' },
                    { value: 'lb', label: 'Pounds (lb)' },
                    { value: 'oz', label: 'Ounces (oz)' }
                  ]}
                />
              </div>
              <div className="dimensions-section">
                <h6>Dimensions</h6>
                <div className="dimensions-inputs">
                  <Input
                    label="Length"
                    type="number"
                    name="dimensions.length"
                    value={formData.dimensions.length}
                    onChange={handleInputChange}
                    placeholder="Length"
                  />
                  <Input
                    label="Width"
                    type="number"
                    name="dimensions.width"
                    value={formData.dimensions.width}
                    onChange={handleInputChange}
                    placeholder="Width"
                  />
                  <Input
                    label="Height"
                    type="number"
                    name="dimensions.height"
                    value={formData.dimensions.height}
                    onChange={handleInputChange}
                    placeholder="Height"
                  />
                  <Input
                    label="Dimension Unit"
                    type="select"
                    name="dimensionUnit"
                    value={formData.dimensionUnit}
                    onChange={handleInputChange}
                    options={[
                      { value: 'cm', label: 'Centimeters (cm)' },
                      { value: 'm', label: 'Meters (m)' },
                      { value: 'in', label: 'Inches (in)' },
                      { value: 'ft', label: 'Feet (ft)' }
                    ]}
                  />
                </div>
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="variations-section">
              <div className="variations-header">
                <h3>Product Variations</h3>
              </div>
              {formData.variations.map((variation, index) => {
                const isOpen = openVariations[index] !== false; // default open
                const skuLabel = variation.sku ? ` — ${variation.sku}` : '';
                const priceLabel = variation.price ? ` · ₹${variation.price}` : '';
                const attrEntries = Object.entries(variation.attributes || {}).filter(([, v]) => {
                  const val = Array.isArray(v) ? v.join('') : String(v || '');
                  return val.trim() !== '';
                });
                const attrLabel = attrEntries.length > 0
                  ? ' · ' + attrEntries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
                  : '';
                return (
                  <div key={index} className={`variation-item variation-accordion${isOpen ? ' variation-accordion--open' : ''}`}>
                    <div className="variation-accordion-header" onClick={() => toggleVariation(index)}>
                      <div className="variation-accordion-title">
                        <span className="variation-accordion-num">Variation {index + 1}</span>
                        {!isOpen && (
                          <span className="variation-accordion-summary">
                            {skuLabel}{priceLabel}{attrLabel}
                          </span>
                        )}
                      </div>
                      <div className="variation-accordion-actions">
                        {index > 0 && (
                          <button
                            type="button"
                            className="variation-remove-btn"
                            onClick={(e) => { e.stopPropagation(); removeVariation(index); }}
                          >
                            Remove
                          </button>
                        )}
                        <span className="variation-accordion-chevron">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="variation-accordion-body">
                        <Input
                          label="SKU"
                          type="text"
                          name={`variations.${index}.sku`}
                          value={variation.sku}
                          onChange={handleInputChange}
                          placeholder="Enter SKU"
                        />
                        <div className="dm-2col">
                          <Input
                            label="Price"
                            type="number"
                            name={`variations.${index}.price`}
                            value={variation.price}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            label="Compare Price"
                            type="number"
                            name={`variations.${index}.comparePrice`}
                            value={variation.comparePrice || ''}
                            onChange={handleInputChange}
                            placeholder="Optional"
                          />
                        </div>
                        <Input
                          label="Stock"
                          type="number"
                          name={`variations.${index}.stock`}
                          value={variation.stock}
                          onChange={handleInputChange}
                          required
                        />
                        <AttributeSelector
                          variationIndex={index}
                          attributes={{ ...attributes, material: ["Cotton"] }}
                          selectedAttributes={variation.attributes || {}}
                          onChange={handleAttributeChange}
                        />
                        {/* Variation Images Upload */}
                        <div className="variation-images-upload">
                          <label className="dm-label">Variation Images</label>
                          <div className="prd-upload-row">
                            <input
                              type="file"
                              name={`variationImage.${index}`}
                              multiple
                              accept="image/*"
                              onChange={handleInputChange}
                            />
                            <button type="button" className="prd-select-btn" onClick={() => openVariationImageSelector(index)}>
                              Select Existing
                            </button>
                          </div>
                          <div className="prd-img-grid">
                            {(formData.variationImages?.[index]?.length > 0) ?
                              formData.variationImages[index].map((img, imgIdx) => {
                                const imageUrl = img instanceof File ? URL.createObjectURL(img) : (img.url || img.image_url);
                                return (
                                  <div key={imgIdx} className="prd-img-thumb">
                                    <img src={imageUrl} alt={`Variation ${index + 1} Image ${imgIdx + 1}`} />
                                    <button type="button" className="prd-img-remove" onClick={() => {
                                      const imageToRemove = formData.variationImages[index][imgIdx];
                                      setFormData(prev => {
                                        const newVariationImages = [...(prev.variationImages || [])];
                                        if (newVariationImages[index]) newVariationImages[index] = newVariationImages[index].filter((_, i) => i !== imgIdx);
                                        const newState = { ...prev, variationImages: newVariationImages };
                                        if (imageToRemove?.existing && imageToRemove.id) newState.variationImagesToDelete = [...(prev.variationImagesToDelete || []), imageToRemove.id];
                                        return newState;
                                      });
                                    }}>×</button>
                                  </div>
                                );
                              }) : (
                                <p className="prd-img-empty">No images for this variation yet</p>
                              )
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button variant="secondary" size="small" onClick={addVariation}>
                Add Variation
              </Button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h3>SEO Settings</h3>
            <Input
              label="Meta Title"
              type="text"
              name="seo.metaTitle"
              value={formData.seo.metaTitle}
              onChange={handleInputChange}
              placeholder="Enter meta title"
            />
            <Input
              label="Meta Description"
              type="text"
              name="seo.metaDescription"
              value={formData.seo.metaDescription}
              onChange={handleInputChange}
              placeholder="Enter meta description"
            />
            <Input
              label="Meta Keywords"
              type="text"
              name="seo.metaKeywords"
              value={formData.seo.metaKeywords}
              onChange={handleInputChange}
              placeholder="Enter meta keywords (comma-separated)"
            />
            <Input
              label="OG Title"
              type="text"
              name="seo.ogTitle"
              value={formData.seo.ogTitle}
              onChange={handleInputChange}
              placeholder="Enter OG title"
            />
            <Input
              label="OG Description"
              type="text"
              name="seo.ogDescription"
              value={formData.seo.ogDescription}
              onChange={handleInputChange}
              placeholder="Enter OG description"
            />
            <Input
              label="OG Image"
              type="file"
              name="seo.ogImage"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setFormData(prev => ({
                    ...prev,
                    seo: {
                      ...prev.seo,
                      ogImage: URL.createObjectURL(file)
                    }
                  }));
                }
              }}
            />
            <Input
              label="Canonical URL"
              type="text"
              name="seo.canonicalUrl"
              value={formData.seo.canonicalUrl}
              onChange={handleInputChange}
              placeholder="Enter canonical URL"
            />
            <Input
              label="Structured Data (JSON-LD)"
              type="textarea"
              name="seo.structuredData"
              value={formData.seo.structuredData}
              onChange={handleInputChange}
              placeholder="Enter structured data (JSON-LD)"
            />
          </>
        );
    }
  };

  return (
    <>
    <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div>
            <h1 className="sl-page-title">Products Management</h1>
            <p className="sl-page-sub">Manage your product catalog</p>
          </div>
        </div>
        <div className="sl-header-right">
          <div className="sl-search-wrap">
            <span className="sl-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" className="sl-search-input" placeholder="Search products..."
              onChange={handleSearchChange} defaultValue={filterValue} />
          </div>
          <button className="sl-add-btn" onClick={handleAddNew}>
            <span className="sl-add-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            Add Product
          </button>
        </div>
      </div>
      {/* Table Section */}
      <div className="sl-table-wrap">
        {loading ? (
          <div className="sl-loader-wrap">
            <Loader />
          </div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="sl-empty">
                <p>{filterValue ? "No results found for your search" : "No products found"}</p>
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  data={currentItemsWithSN}
                  loading={loading}
                  error={error}
                  className="w-full"
                  striped={true}
                  hoverable={true}
                />
                {totalProducts > itemsPerPage && (
                  <div className="sl-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={formData.id ? "Edit Product" : "Add New Product"}
        closeOnOverlayClick={false}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="seo-form">
          {/* Step indicator — sticky, outside scrollable body */}
          <div className="prod-steps">
            {['Basic Info', 'Variations', 'SEO'].map((label, i) => {
              const step = i + 1;
              const isActive = currentStep === step;
              const isDone = currentStep > step;
              return (
                <div key={step} className={`prod-step ${isActive ? 'prod-step--active' : ''} ${isDone ? 'prod-step--done' : ''}`}>
                  <div className="prod-step-circle">
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : step}
                  </div>
                  <span className="prod-step-label">{label}</span>
                  {i < 2 && <div className={`prod-step-line ${isDone ? 'prod-step-line--done' : ''}`} />}
                </div>
              );
            })}
          </div>
          <div className="modal-body">
            {renderModalStep()}
          </div>
          <div className="modal-footer">
            {currentStep > 1 && (
              <Button
                variant="secondary"
                size="medium"
                onClick={handlePrevStep}
                disabled={loading}
                type="button"
              >
                Previous
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                variant="primary"
                size="medium"
                onClick={handleNextStep}
                disabled={loading}
                type="button"
              >
                Next
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={handleModalClose}
                  disabled={loading}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </form>
      </Modal>

      {/* Existing Image Selector Modal */}
      <ExistingImageSelector
        isOpen={showExistingImageSelector}
        onClose={() => setShowExistingImageSelector(false)}
        onSelectImages={handleExistingImagesSelect}
        productId={formData.id} // Pass the product ID when editing
      />

      {/* Variation Image Selector Modal */}
      <ExistingImageSelector
        isOpen={showVariationImageSelector}
        onClose={() => {
          setShowVariationImageSelector(false);
          setCurrentVariationIndex(null);
        }}
        onSelectImages={handleVariationExistingImagesSelect}
        productId={formData.id} // Pass the product ID when editing
      />

      {/* Product Filter Drawer */}
      <ProductFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApplyFilters={handleApplyFilters}
        categories={categories}
        attributes={attributes}
      />
    </div>
    </>
  );
};

export default ProductsPage;


