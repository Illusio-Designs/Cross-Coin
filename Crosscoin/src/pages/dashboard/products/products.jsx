import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import Loader from "@/components/Loader";
import { productService } from "@/services";
import { categoryService } from "@/services";
import { attributeService } from "@/services";
import { debounce } from 'lodash';
import AttributeSelector from '@/components/products/AttributeSelector';
import ExistingImageSelector from '@/components/products/ExistingImageSelector';
import BrandTags from '@/components/Dashboard/BrandTags';
import BrandAssignment from '@/components/Dashboard/BrandAssignment';
import "../../../styles/dashboard/products.css";
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const ProductsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filterValue, setFilterValue] = useState("");
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
  const [attributes, setAttributes] = useState([]);

  // Test function to debug image URLs
  window.testImageUrl = (imagePath) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    console.log('Testing image URL construction:');
    console.log('Input path:', imagePath);
    console.log('Base URL:', baseUrl);
    
    let result;
    if (!imagePath.startsWith('http')) {
      if (imagePath.startsWith('/uploads/')) {
        result = `${baseUrl}${imagePath}`;
      } else {
        result = `${baseUrl}/uploads/products/${imagePath}`;
      }
    } else {
      result = imagePath;
    }
    
    console.log('Final URL:', result);
    return result;
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
      console.log('Raw categories response:', response);
      setCategories(response);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch attributes
  const fetchAttributes = async () => {
    console.log("Attempting to fetch attributes...");
    try {
      const response = await attributeService.getAllAttributes();
      console.log('Raw attribute service response:', response);
      // Correctly access `AttributeValues` from the backend response
      // And map them to an array of just the string values
      const formattedAttributes = response.reduce((acc, attribute) => {
        const attributeValues = attribute.AttributeValues?.map(val => val.value) || [];
        acc[attribute.name] = attributeValues;
        return acc;
      }, {});
      setAttributes(formattedAttributes);
      console.log('Attributes state after fetch:', formattedAttributes);
    } catch (err) {
      console.error("Error fetching attributes:", err);
    }
  };

  useEffect(() => {
    console.log("useEffect for fetchAttributes is running.");
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
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          color: style.color,
          backgroundColor: style.bgColor,
          display: 'inline-block',
          marginLeft: '8px'
        }}
      >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '500' }}>{row.name}</span>
          <BadgeDisplay badge={row.badge} />
        </div>
      )
    },
    {
      header: "Category",
      accessor: row => (
        <span style={{
          backgroundColor: '#F3F4F6',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
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
        <span style={{ fontWeight: '500' }}>
          {row.avg_rating ? `${Number(row.avg_rating).toFixed(1)} / 5` : 'N/A'}
        </span>
      )
    },
    {
      header: "Status",
      accessor: row => (
        <span style={{
          backgroundColor: row.status === 'active' ? '#D1FAE5' : '#FEE2E2',
          color: row.status === 'active' ? '#059669' : '#DC2626',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id, name }) => (
        <div className="action-buttons">
          <button
            className="action-btn edit"
            data-tooltip="Edit"
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
          </button>
          <button
            className="action-btn delete"
            data-tooltip="Delete"
            onClick={() => handleDelete(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
      
      console.log('=== PRODUCT EDIT DEBUG ===');
      console.log('Raw product response:', product);
      console.log('Product brands:', product.brands);
      console.log('Product images:', product.images);
      console.log('Product variations:', product.variations);
      console.log('Environment API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('Base URL being used:', process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in');
      if (product.variations) {
        product.variations.forEach((variation, index) => {
          console.log(`Variation ${index} images:`, variation.images);
        });
      }
      console.log('=== END PRODUCT EDIT DEBUG ===');
      
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
          console.log('Loading existing image:', img);
          
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
          canonicalUrl: product.seo?.canonicalUrl || `${window.location.origin}/products/${product.slug}`,
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
          console.log(`Loading variation images for variation ${vIndex}:`, variation.id, variation.images);
          const variationImages = variation.images?.map(img => {
            console.log('Processing variation image:', img);
            
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
            console.log('Processed variation image:', imageObj);
            return imageObj;
          }) || [];
          
          console.log(`Variation ${vIndex} final images:`, variationImages);
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        setLoading(true);
        await productService.deleteProduct(id);
        await fetchProducts();
      } catch (err) {
        setError(err.message || "Failed to delete product");
      } finally {
        setLoading(false);
      }
    }
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
    setFormData(prev => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          price: "",
          comparePrice: "",
          stock: "",
          sku: "",
          attributes: {}
        }
      ]
    }));
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
        console.log('=== FORM SUBMIT DEBUG ===');
        console.log('Form data images:', formData.images);
        console.log('Form data images length:', formData.images?.length || 0);
        if (formData.images) {
          formData.images.forEach((img, idx) => {
            console.log(`Image ${idx}:`, {
              id: img.id,
              existing: img.existing,
              fromLibrary: img.fromLibrary,
              isFile: img instanceof File,
              name: img.name
            });
          });
        }
        console.log('Images to delete:', formData.imagesToDelete);
        console.log('Variation images to delete:', formData.variationImagesToDelete);
        
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

        // Handle SEO data
        const seoData = {
            metaTitle: formData.seo.metaTitle || formData.name,
            metaDescription: formData.seo.metaDescription || formData.description,
            metaKeywords: formData.seo.metaKeywords || '',
            ogTitle: formData.seo.metaTitle || formData.name,
            ogDescription: formData.seo.metaDescription || formData.description,
            ogImage: firstImageUrl,
            canonicalUrl: formData.seo.canonicalUrl || `${window.location.origin}/products/${formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}`,
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
        formDataToSend.append('brandIds', JSON.stringify(formData.brandIds || [1]));

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
        
        console.log('=== SENDING TO BACKEND ===');
        console.log('New file uploads:', formData.images ? formData.images.filter(img => img instanceof File).length : 0);
        console.log('New library images:', libraryImages.length);
        console.log('Images to delete:', formData.imagesToDelete?.length || 0);
        console.log('Existing images will be preserved automatically');
        
        // Debug preserve IDs
        if (formData.id && formData.images) {
            const existingImageIds = formData.images
                .filter(img => img.existing === true && img.id)
                .map(img => img.id);
            console.log('Existing image IDs to preserve:', existingImageIds);
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
            console.log('Existing variation image IDs to preserve:', existingVariationImageIds);
        }
        
        console.log('=== END BACKEND DATA ===');

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
            console.log('Updating product with ID:', formData.id);
            response = await productService.updateProduct(formData.id, formDataToSend);
        } else {
            console.log('Creating new product');
            response = await productService.createProduct(formDataToSend);
        }

        console.log('=== API RESPONSE ===');
        console.log('Response:', response);
        console.log('Success:', response?.success);
        console.log('=== END API RESPONSE ===');

        if (response.success) {
            console.log('Product saved successfully, closing modal');
            setIsModalOpen(false);
            await fetchProducts();
        } else {
            console.error('Save failed:', response.message);
            throw new Error(response.message || 'Failed to save product');
        }
    } catch (err) {
        console.error('=== SAVE ERROR ===');
        console.error('Error object:', err);
        console.error('Error message:', err.message);
        console.error('Error response:', err.response?.data);
        console.error('=== END SAVE ERROR ===');
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
            <InputField
              label="Product Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <div className="input-field">
              <label>Description</label>
              <ReactQuill
                theme="snow"
                value={formData.description}
                onChange={val => setFormData(prev => ({ ...prev, description: val }))}
                style={{ minHeight: 150, marginBottom: 16 }}
              />
            </div>
            <div className="input-field">
              <label>Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  console.log('=== CATEGORY SELECTION DEBUG ===');
                  console.log('Direct select onChange event:', e);
                  console.log('Selected value:', e.target.value);
                  console.log('Event target:', e.target);
                  console.log('Current formData.categoryId before update:', formData.categoryId);
                  handleInputChange(e);
                  console.log('=== END CATEGORY SELECTION DEBUG ===');
                }}
                name="categoryId"
                required
                className="select-input"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <InputField
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
            <InputField
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
              <label>Product Images</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="file"
                  name="images"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setFormData(prev => ({
                      ...prev,
                      images: [...(prev.images || []), ...files]
                    }));
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowExistingImageSelector(true)}
                  style={{
                    padding: '8px 12px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Select Existing
                </button>
              </div>
              <div className="images-preview" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 8 }}>
                {formData.images && formData.images.map((img, imgIdx) => {
                  console.log(`Rendering product image ${imgIdx}:`, img);
                  const imageUrl = img instanceof File ? URL.createObjectURL(img) : (img.url || img.image_url);
                  console.log(`Product image URL ${imgIdx}:`, imageUrl);
                  
                  return (
                    <div key={imgIdx} style={{ position: 'relative' }}>
                      <img
                        src={imageUrl}
                        alt={`Product Image ${imgIdx + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                        onError={(e) => {
                          console.error(`Failed to load product image ${imgIdx}:`, imageUrl);
                          e.target.style.backgroundColor = '#f5f5f5';
                          e.target.style.display = 'flex';
                          e.target.style.alignItems = 'center';
                          e.target.style.justifyContent = 'center';
                          e.target.alt = 'Failed to load';
                        }}
                        onLoad={() => {
                          console.log(`Successfully loaded product image ${imgIdx}:`, imageUrl);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const imageToRemove = formData.images[imgIdx];
                          
                          setFormData(prev => {
                            const newState = {
                              ...prev,
                              images: prev.images.filter((_, index) => index !== imgIdx)
                            };
                            
                            // If this is an existing image (has id), track it for deletion
                            if (imageToRemove.existing && imageToRemove.id) {
                              newState.imagesToDelete = [...prev.imagesToDelete, imageToRemove.id];
                            }
                            
                            return newState;
                          });
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="weight-dimensions-section">
              <div className="weight-section">
                <InputField
                  label="Weight"
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="Enter weight"
                />
                <InputField
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
                  <InputField
                    label="Length"
                    type="number"
                    name="dimensions.length"
                    value={formData.dimensions.length}
                    onChange={handleInputChange}
                    placeholder="Length"
                  />
                  <InputField
                    label="Width"
                    type="number"
                    name="dimensions.width"
                    value={formData.dimensions.width}
                    onChange={handleInputChange}
                    placeholder="Width"
                  />
                  <InputField
                    label="Height"
                    type="number"
                    name="dimensions.height"
                    value={formData.dimensions.height}
                    onChange={handleInputChange}
                    placeholder="Height"
                  />
                  <InputField
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
              {formData.variations.map((variation, index) => (
                <div key={index} className="variation-item">
                  <div className="variation-header">
                    <h4>Variation {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeVariation(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <InputField
                    label="Price"
                    type="number"
                    name={`variations.${index}.price`}
                    value={variation.price}
                    onChange={handleInputChange}
                    required
                  />
                  <InputField
                    label="Compare Price"
                    type="number"
                    name={`variations.${index}.comparePrice`}
                    value={variation.comparePrice || ''}
                    onChange={handleInputChange}
                    placeholder="Enter compare price"
                  />
                  <InputField
                    label="Stock"
                    type="number"
                    name={`variations.${index}.stock`}
                    value={variation.stock}
                    onChange={handleInputChange}
                    required
                  />
                  <InputField
                    label="SKU"
                    type="text"
                    name={`variations.${index}.sku`}
                    value={variation.sku}
                    onChange={handleInputChange}
                    placeholder="Enter SKU"
                  />
                  <AttributeSelector
                    variationIndex={index}
                    attributes={{ ...attributes, material: ["Cotton"] }}
                    selectedAttributes={variation.attributes || {}}
                    onChange={handleAttributeChange}
                  />
                  {/* Variation Images Upload */}
                  <div className="variation-images-upload">
                    <label>Variation Images</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="file"
                        name={`variationImage.${index}`}
                        multiple
                        accept="image/*"
                        onChange={handleInputChange}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => openVariationImageSelector(index)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Select Existing
                      </button>
                    </div>
                    <div className="variation-images-preview" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 8 }}>
                      {(formData.variationImages && formData.variationImages[index] && formData.variationImages[index].length > 0) ? 
                        formData.variationImages[index].map((img, imgIdx) => {
                          console.log(`Rendering variation ${index} image ${imgIdx}:`, img);
                          const imageUrl = img instanceof File ? URL.createObjectURL(img) : (img.url || img.image_url);
                          console.log(`Image URL for variation ${index} image ${imgIdx}:`, imageUrl);
                          
                          return (
                            <div key={imgIdx} style={{ position: 'relative' }}>
                              <img
                                src={imageUrl}
                                alt={`Variation ${index + 1} Image ${imgIdx + 1}`}
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                                onError={(e) => {
                                  console.error(`Failed to load variation ${index} image ${imgIdx}:`, imageUrl);
                                  e.target.style.backgroundColor = '#f5f5f5';
                                  e.target.style.display = 'flex';
                                  e.target.style.alignItems = 'center';
                                  e.target.style.justifyContent = 'center';
                                  e.target.alt = 'Failed to load';
                                }}
                                onLoad={() => {
                                  console.log(`Successfully loaded variation ${index} image ${imgIdx}:`, imageUrl);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const imageToRemove = formData.variationImages[index][imgIdx];
                                  
                                  setFormData(prev => {
                                    const newVariationImages = [...(prev.variationImages || [])];
                                    if (newVariationImages[index]) {
                                      newVariationImages[index] = newVariationImages[index].filter((_, i) => i !== imgIdx);
                                    }
                                    
                                    // If this is an existing variation image (has id), track it for deletion
                                    const newState = { ...prev, variationImages: newVariationImages };
                                    if (imageToRemove && imageToRemove.existing && imageToRemove.id) {
                                      newState.variationImagesToDelete = [...(prev.variationImagesToDelete || []), imageToRemove.id];
                                    }
                                    
                                    return newState;
                                  });
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '-5px',
                                  right: '-5px',
                                  background: 'red',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        }) : (
                          <div style={{ color: '#999', fontStyle: 'italic', padding: '20px 0' }}>
                            No images for this variation yet
                          </div>
                        )
                      }
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                size="small"
                onClick={addVariation}
              >
                Add Variation
              </Button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h3>SEO Settings</h3>
            <InputField
              label="Meta Title"
              type="text"
              name="seo.metaTitle"
              value={formData.seo.metaTitle}
              onChange={handleInputChange}
              placeholder="Enter meta title"
            />
            <InputField
              label="Meta Description"
              type="text"
              name="seo.metaDescription"
              value={formData.seo.metaDescription}
              onChange={handleInputChange}
              placeholder="Enter meta description"
            />
            <InputField
              label="Meta Keywords"
              type="text"
              name="seo.metaKeywords"
              value={formData.seo.metaKeywords}
              onChange={handleInputChange}
              placeholder="Enter meta keywords (comma-separated)"
            />
            <InputField
              label="OG Title"
              type="text"
              name="seo.ogTitle"
              value={formData.seo.ogTitle}
              onChange={handleInputChange}
              placeholder="Enter OG title"
            />
            <InputField
              label="OG Description"
              type="text"
              name="seo.ogDescription"
              value={formData.seo.ogDescription}
              onChange={handleInputChange}
              placeholder="Enter OG description"
            />
            <InputField
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
            <InputField
              label="Canonical URL"
              type="text"
              name="seo.canonicalUrl"
              value={formData.seo.canonicalUrl}
              onChange={handleInputChange}
              placeholder="Enter canonical URL"
            />
            <InputField
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
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Products Management</h1>
        <div className="adding-button">
          <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
            <div className="modern-searchbar-group">
              <span className="modern-searchbar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                className="modern-searchbar-input"
                placeholder="Search products..."
                onChange={handleSearchChange}
                defaultValue={filterValue}
              />
            </div>
          </form>
          <Button onClick={handleAddNew} variant="primary" className="add-new-btn">Add New Product</Button>
        </div>
      </div>
      {/* Table Section */}
      <div className="seo-table-container products-table">
        {loading ? (
          <div style={{ position: 'relative', minHeight: '400px' }}>
            <Loader />
          </div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="seo-empty-state">
                {filterValue ? "No results found for your search" : "No products found"}
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
                  <div className="seo-pagination-container">
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
      >
        <form onSubmit={handleSubmit} className="seo-form">
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
    </div>
    </>
  );
};

export default ProductsPage;