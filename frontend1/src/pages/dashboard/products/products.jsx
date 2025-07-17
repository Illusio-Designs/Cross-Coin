import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { productService } from "@/services";
import { categoryService } from "@/services";
import { attributeService } from "@/services";
import { debounce } from 'lodash';
import AttributeSelector from '@/components/products/AttributeSelector';
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    status: "active",
    price: "",
    stock: "",
    images: [],
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
    variationImages: [], // Array of arrays, one per variation
  });
  const [attributes, setAttributes] = useState([]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilterValue(searchTerm);
    }, 300),
    []
  );

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
      cell: ({ id }) => (
        <div className="adding-button">
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
            Edit
          </button>
          <button
            className="action-btn delete"
            title="Delete"
            onClick={() => handleDelete(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
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
      
      // Format the data for the form
      const formData = {
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        status: product.status,
        badge: product.badge || 'none',
        total_sold: product.total_sold || 0,
        images: product.images?.map(img => ({
          name: img.image_url.split('/').pop(),
          url: `${process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in'}${img.image_url}`,
          type: 'image/jpeg'
        })) || [],
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
          ogImage: product.seo?.ogImage || (product.images?.[0] ? `${process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in'}${product.images[0].image_url}` : null),
          canonicalUrl: product.seo?.canonicalUrl || `${window.location.origin}/products/${product.slug}`,
          structuredData: product.seo?.structuredData || JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description,
            "image": product.images?.[0] ? `${process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in'}${product.images[0].image_url}` : null,
            "offers": {
              "@type": "Offer",
              "price": product.variations?.[0]?.price || 0,
              "priceCurrency": "INR",
              "availability": product.variations?.[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
          })
        },
        variationImages: product.variations?.map(variation => variation.images?.map(img => ({
          name: img.image_url.split('/').pop(),
          url: `${process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in'}${img.image_url}`,
          type: 'image/jpeg'
        }))) || []
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
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      status: "active",
      price: "",
      stock: "",
      images: [],
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

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    console.log('=== handleInputChange DEBUG ===');
    console.log('Event details:', { name, value, type, target: e.target });

    if (!name) {
      console.log('No name provided, returning');
      return;
    }
    
    // Debug category selection
    if (name === 'categoryId') {
      console.log('=== CATEGORY ID UPDATE DEBUG ===');
      console.log('Category selection event:', { name, value, type });
      console.log('Previous formData.categoryId:', formData.categoryId);
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
        newVariationImages[variationIndex] = files;
        return { ...prev, variationImages: newVariationImages };
      });
      return;
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        // Debug categoryId updates
        if (name === 'categoryId') {
          console.log('=== CATEGORY ID UPDATED ===');
          console.log('Updated formData with categoryId:', updated.categoryId);
          console.log('Full updated formData:', updated);
        }
        return updated;
      });
    }
    
    console.log('=== END handleInputChange DEBUG ===');
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
    console.log('=== FORM SUBMISSION STARTED ===');
    setLoading(true);
    setError(null);

    try {
        // Debug form data
        console.log('=== FORM DATA DEBUG ===');
        console.log('Complete formData:', formData);
        console.log('Categories available:', categories);
        console.log('Selected categoryId:', formData.categoryId);
        console.log('CategoryId type:', typeof formData.categoryId);
        console.log('CategoryId is empty:', formData.categoryId === '');
        console.log('CategoryId is null:', formData.categoryId === null);
        console.log('CategoryId is undefined:', formData.categoryId === undefined);
        console.log('Category options:', categories.map(cat => ({ value: cat.id, label: cat.name })));

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

        // === VALIDATION ADDED ===
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
        // === END VALIDATION ===

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

        // Add variations
        formDataToSend.append('variations', JSON.stringify(variationsWithAttributes));

        // Add SEO data
        formDataToSend.append('seo', JSON.stringify(seoData));

        // Debug FormData contents
        console.log('=== FORMDATA DEBUG ===');
        console.log('FormData entries:');
        for (let [key, value] of formDataToSend.entries()) {
            console.log(`${key}:`, value);
        }
        console.log('CategoryId in FormData:', formDataToSend.get('categoryId'));
        console.log('CategoryId type in FormData:', typeof formDataToSend.get('categoryId'));

        // Add images
        if (formData.images && formData.images.length > 0) {
            formData.images.forEach((image, index) => {
                if (image instanceof File) {
                    formDataToSend.append(`images`, image);
                }
            });
        }

        // Add variation images
        if (formData.variationImages && formData.variationImages.length > 0) {
          formData.variationImages.forEach((images, vIdx) => {
            if (images && images.length > 0) {
              images.forEach((img, imgIdx) => {
                if (img instanceof File) {
                  formDataToSend.append(`variation_${vIdx}_image`, img);
                }
              });
            }
          });
        }

        let response;
        if (formData.id) {
            console.log('=== UPDATING EXISTING PRODUCT ===');
            response = await productService.updateProduct(formData.id, formDataToSend);
        } else {
            console.log('=== CREATING NEW PRODUCT ===');
            response = await productService.createProduct(formDataToSend);
        }

        console.log('=== API RESPONSE ===');
        console.log('Response:', response);

        if (response.success) {
            console.log('=== PRODUCT CREATED/UPDATED SUCCESSFULLY ===');
            setIsModalOpen(false);
            await fetchProducts();
        } else {
            console.log('=== API RETURNED ERROR ===');
            console.log('Response message:', response.message);
            throw new Error(response.message || 'Failed to save product');
        }
    } catch (err) {
        console.log('=== ERROR IN HANDLESUBMIT ===');
        console.log('Error object:', err);
        console.log('Error message:', err.message);
        console.log('Error response data:', err.response?.data);
        setError(err.message || err.response?.data?.message || "Error saving product");
    } finally {
        console.log('=== FORM SUBMISSION ENDED ===');
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
                    attributes={attributes}
                    selectedAttributes={variation.attributes || {}}
                    onChange={handleAttributeChange}
                  />
                  {/* Variation Images Upload */}
                  <div className="variation-images-upload">
                    <label>Variation Images</label>
                    <input
                      type="file"
                      name={`variationImage.${index}`}
                      multiple
                      accept="image/*"
                      onChange={handleInputChange}
                    />
                    <div className="variation-images-preview" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 8 }}>
                      {(formData.variationImages && formData.variationImages[index]) && formData.variationImages[index].map((img, imgIdx) => (
                        <div key={imgIdx} style={{ position: 'relative' }}>
                          <img
                            src={img instanceof File ? URL.createObjectURL(img) : img.url}
                            alt={`Variation ${index + 1} Image ${imgIdx + 1}`}
                            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                          />
                        </div>
                      ))}
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
      <div className="seo-table-container">
        {loading ? (
          <div className="seo-loading">Loading...</div>
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
    </div>
    </>
  );
};

export default ProductsPage;