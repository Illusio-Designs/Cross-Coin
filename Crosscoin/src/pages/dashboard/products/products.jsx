import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { productService } from "../../../services";
import { categoryService } from "../../../services";
import { attributeService } from "../../../services";
import { brandService } from "../../../services";
import { debounce } from 'lodash';
import AttributeSelector from '../../../components/products/AttributeSelector';
import ExistingImageSelector from '../../../components/products/ExistingImageSelector';
import BrandTags from '../../../components/Dashboard/BrandTags';
import BrandAssignment from '../../../components/Dashboard/BrandAssignment';
import ProductFilterDrawer from '../../../components/products/ProductFilterDrawer';
import SerpPreview from '../../../components/common/SerpPreview';
import SeoLengthMeter from '../../../components/common/SeoLengthMeter';
import { showSuccess, showError } from '../../../utils/toastNotification';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon, PencilEdit02Icon, Delete02Icon, ArrowUp01Icon, ArrowDown01Icon, Search01Icon, Add01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
const Editor = dynamic(() => import('../../../components/common/Editor'), {
  ssr: false,
  loading: () => <div style={{ height: 150, border: '1px solid var(--ds-color-border)', borderRadius: 6 }} />
});

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
  // Separate from `loading` (which gates the table skeleton) so opening the
  // edit panel doesn't flash/reload the whole products table.
  const [editLoading, setEditLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  // Brand filter — empty string means "All brands". When a slug is set,
  // the productService sends X-Brand-Name so the listing is scoped server-side.
  const [brands, setBrands] = useState([]);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState('');
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
    brandIds: [], // Will be set by BrandAssignment component
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
      const response = await productService.getAllProducts(
        currentPage,
        itemsPerPage,
        filterValue,
        null,            // signal
        false,           // forceRefresh
        selectedBrandSlug, // brandSlug — '' means all brands
        true             // listMode — lean columns for the table (full data loads on Edit)
      );
      if (response && response.products) {
        setProducts(response.products);
        // productService.getAllProducts returns the count under `total`
        // (mapped from validatePaginatedResponse.total). Fall back to a
        // few likely shapes so future service tweaks don't silently
        // hide the pagination bar again.
        setTotalProducts(
          response.total ??
          response.totalProducts ??
          response.pagination?.total ??
          0
        );
      } else {
        setError('Invalid response format');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filterValue, selectedBrandSlug]);

  // Fetch brands once for the filter dropdown. Includes only active brands.
  useEffect(() => {
    let alive = true;
    brandService.getAllBrands(false).then((res) => {
      if (!alive) return;
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBrands(list);
    }).catch(() => { /* dropdown stays empty */ });
    return () => { alive = false; };
  }, []);

  // Reset to first page when brand filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrandSlug]);

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

  // Monogram initials for the product thumbnail — first two words' initials,
  // else the first two letters (deterministic, no external image needed).
  const initials = (s = '') => {
    const w = String(s).trim().split(/\s+/).filter(Boolean);
    const t = w.length >= 2 ? (w[0][0] + w[1][0]) : (w[0] || '').slice(0, 2);
    return t.toUpperCase() || '·';
  };

  // Update columns definition to include badge and avg_rating
  const columns = [
    {
      header: "#",
      width: 48,
      sortable: false,
      accessor: row => <span className="obz-sn">{row.serial_number}</span>
    },
    {
      header: "Product",
      accessor: row => (
        <div className="obz-prod-cell">
          <div className="obz-thumb">{initials(row.brands?.[0]?.display_name || row.brands?.[0]?.name || row.name)}</div>
          <div className="obz-prod-meta">
            <span className="obz-prod-name">{row.name}</span>
            <BadgeDisplay badge={row.badge} />
          </div>
        </div>
      )
    },
    {
      header: "Category",
      accessor: row => (
        <span className="obz-cat">
          {row.category?.name || 'Uncategorized'}
        </span>
      )
    },
    {
      header: "Brands",
      sortable: false,
      accessor: row => <BrandTags brands={row.brands || []} />
    },
    {
      header: "Avg. Rating",
      accessor: row => (
        row.avg_rating
          ? <span className="obz-rating"><HugeiconsIcon icon={StarIcon} size={16} strokeWidth={2} />{Number(row.avg_rating).toFixed(1)}</span>
          : <span className="obz-na">N/A</span>
      )
    },
    {
      header: "Status",
      accessor: row => (
        <span className={`obz-pill ${row.status === 'active' ? 'on' : 'off'}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      align: "right",
      sortable: false,
      cell: ({ id }) => (
        <div className="obz-acts">
          <button className="obz-ico" title="Edit" disabled={editLoading} onClick={() => handleEdit(id)}>
            <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />
          </button>
          <button className="obz-ico del" title="Delete" onClick={() => handleDelete(id)}>
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
          </button>
        </div>
      )
    }
  ];

  // Update handleEdit to include badge
  const handleEdit = async (id) => {
    // Open the panel immediately (with a loader) so it doesn't feel like the
    // click did nothing while the product details are fetched.
    setCurrentStep(1);
    setEditLoading(true);
    setIsModalOpen(true);
    try {
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
        brandIds: product.brands?.map(b => Number(b.id)).filter(Boolean) || [], // Extract brand IDs as numbers
        imagesToDelete: [], // Reset deletion tracking
        variationImagesToDelete: [], // Reset deletion tracking
        images: product.images?.map(img => {
          // Get the base URL
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
          const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';
          
          // Construct the proper image URL
          let imageUrl = img.image_url;
          if (!imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/products') || imageUrl.startsWith('/categories') || imageUrl.startsWith('/sliders')) {
              imageUrl = `${imageKitEndpoint}${imageUrl}`;
            } else if (imageUrl.startsWith('/uploads/')) {
              imageUrl = `${baseUrl}${imageUrl}`;
            } else {
              imageUrl = `${imageKitEndpoint}/products/${imageUrl}`;
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
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
            const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';
            
            let imageUrl = img.image_url;
            if (!imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/products') || imageUrl.startsWith('/categories') || imageUrl.startsWith('/sliders')) {
                imageUrl = `${imageKitEndpoint}${imageUrl}`;
              } else if (imageUrl.startsWith('/uploads/')) {
                imageUrl = `${baseUrl}${imageUrl}`;
              } else {
                imageUrl = `${imageKitEndpoint}/products/${imageUrl}`;
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
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching product details");
      setIsModalOpen(false); // close the panel if the fetch failed
    } finally {
      setEditLoading(false);
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
              <Editor
                value={formData.description}
                onChange={val => setFormData(prev => ({ ...prev, description: val }))}
                placeholder="Write product description..."
              />
            </div>
            <div className="obz-form-row3">
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
            </div>

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
                const isOpen = openVariations[index] === true; // default closed (keeps the step compact)
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
                          <HugeiconsIcon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={14} strokeWidth={2} />
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
                          attributes={attributes}
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
          <ProductSeoStep
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            editingProductId={formData.id}
          />
        );
    }
  };

  return (
    <>
    <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
    <div className="dashboard-page">
      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', padding: '12px 16px', margin: '16px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}
      <div className="obz-prod-head">
        <div className="obz-prod-headL">
          <h1 className="obz-prod-title">Products</h1>
          <p className="obz-prod-sub">{totalProducts} products · manage your catalog</p>
        </div>
        <div className="obz-prod-headR">
          <div className="obz-search">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
            <input type="text" placeholder="Search products…"
              onChange={handleSearchChange} defaultValue={filterValue} />
          </div>
          <div style={{ minWidth: 170 }}>
            <Select
              options={[
                { value: '', label: 'All Brands' },
                ...brands.map((b) => ({ value: b.slug, label: b.display_name || b.name })),
              ]}
              value={selectedBrandSlug}
              onChange={setSelectedBrandSlug}
              placeholder="All Brands"
            />
          </div>
          <button className="obz-add-btn" onClick={handleAddNew}>
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
            Add Product
          </button>
        </div>
      </div>
      {/* Table Section */}
      <div className="sl-table-wrap">
        {loading ? (
          <div style={{ padding: '20px' }}>
            <TableSkeleton rows={itemsPerPage} columns={6} />
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
                  striped={false}
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
        footer={
          <>
            {currentStep > 1 && (
              <Button variant="secondary" size="medium" onClick={handlePrevStep} disabled={loading} type="button">Previous</Button>
            )}
            {currentStep < 3 ? (
              <Button variant="primary" size="medium" onClick={handleNextStep} disabled={loading || editLoading} type="button">Next</Button>
            ) : (
              <>
                <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
                <Button variant="primary" size="medium" onClick={handleSubmit} disabled={loading || editLoading} type="button">{loading ? "Saving..." : "Save"}</Button>
              </>
            )}
          </>
        }
      >
        <form onSubmit={handleSubmit} className="seo-form">
          {/* Step indicator — sticky at the top of the scrollable body */}
          <div className="prod-steps">
            {['Basic Info', 'Variations', 'SEO'].map((label, i) => {
              const step = i + 1;
              const isActive = currentStep === step;
              const isDone = currentStep > step;
              return (
                <div key={step} className={`prod-step ${isActive ? 'prod-step--active' : ''} ${isDone ? 'prod-step--done' : ''}`}>
                  <div className="prod-step-circle">
                    {isDone ? (
                      <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} />
                    ) : step}
                  </div>
                  <span className="prod-step-label">{label}</span>
                  {i < 2 && <div className={`prod-step-line ${isDone ? 'prod-step-line--done' : ''}`} />}
                </div>
              );
            })}
          </div>
          {editLoading
            ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 260 }}><Loader /></div>
            : renderModalStep()}
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

/**
 * SEO tab for the product edit modal.
 *
 * Fields:
 *   - All ProductSEO columns (title / description / keywords / og_* / canonical / structured_data)
 *   - Live SERP preview + length meters for title and description
 *   - "Regenerate from product data" button: calls the backend helper that
 *     auto-fills every field from the product's name, brand, description,
 *     variations, reviews and brand SEO settings. Skips persisting — admin
 *     reviews the result first.
 *
 * Defensive: editingProductId is only available when editing an existing
 * product (formData.id). The "Regenerate" button is hidden for new products
 * because there's nothing to regenerate from yet — backend auto-fills on
 * first save.
 */
function ProductSeoStep({ formData, setFormData, handleInputChange, editingProductId }) {
  const [regenerating, setRegenerating] = useState(false);

  const previewUrl = formData.seo?.canonicalUrl
    || `https://crosscoin.in/products/${formData.slug || formData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product'}`;

  const handleRegenerate = async () => {
    if (!editingProductId) {
      showError('noProduct', 'Save the product first, then regenerate SEO.');
      return;
    }
    if (!window.confirm('Replace all SEO fields with auto-generated values from the product name, brand, description and variations? Your manual edits will be lost in this form (you can still cancel before saving).')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await productService.regenerateSeo(editingProductId, false);
      if (res?.success && res.seo) {
        setFormData(prev => ({
          ...prev,
          seo: {
            ...prev.seo,
            metaTitle:       res.seo.metaTitle ?? '',
            metaDescription: res.seo.metaDescription ?? '',
            metaKeywords:    res.seo.metaKeywords ?? '',
            ogTitle:         res.seo.ogTitle ?? '',
            ogDescription:   res.seo.ogDescription ?? '',
            ogImage:         res.seo.ogImage ?? '',
            canonicalUrl:    res.seo.canonicalUrl ?? '',
            structuredData:  res.seo.structuredData ?? '',
          },
        }));
        showSuccess('regenerated', 'SEO fields refreshed from product data. Review then click Save.');
      }
    } catch (err) {
      showError('regenerateFailed', typeof err === 'string' ? err : (err.message || 'Failed to regenerate SEO'));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>SEO Settings</h3>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating || !editingProductId}
          title={editingProductId
            ? 'Re-runs the auto-fill based on the product name, brand, description, variations and reviews'
            : 'Save the product first'}
          style={{
            padding: '6px 12px',
            background: 'var(--ds-color-surface)',
            border: '1px solid var(--ds-color-border)',
            borderRadius: 6,
            cursor: editingProductId ? 'pointer' : 'not-allowed',
            fontSize: 13,
            color: 'var(--ds-color-text)',
            opacity: editingProductId ? 1 : 0.5,
          }}
        >
          {regenerating ? 'Regenerating…' : '↻ Regenerate from product data'}
        </button>
      </div>

      <div style={{
        background: 'var(--ds-color-surface-soft)',
        border: '1px solid var(--ds-color-border)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 13,
        color: 'var(--ds-color-text-muted)',
      }}>
        Leave any field empty to use the auto-fill default. The defaults come from
        the product name, brand, description, variations and your global SEO settings.
        Only fill fields here when you want to override.
      </div>

      <Input
        label="Meta Title"
        type="text"
        name="seo.metaTitle"
        value={formData.seo.metaTitle}
        onChange={handleInputChange}
        placeholder="Auto: {Product Name} | CrossCoin"
      />
      <SeoLengthMeter value={formData.seo.metaTitle || ''} type="title" />

      <Input
        label="Meta Description"
        type="textarea"
        name="seo.metaDescription"
        value={formData.seo.metaDescription}
        onChange={handleInputChange}
        placeholder="Auto: trimmed from product description, 160 char target"
      />
      <SeoLengthMeter value={formData.seo.metaDescription || ''} type="description" />

      <Input
        label="Meta Keywords"
        type="text"
        name="seo.metaKeywords"
        value={formData.seo.metaKeywords}
        onChange={handleInputChange}
        placeholder="comma-separated; auto: name, brand, buy online, india"
      />

      <Input
        label="OG Title"
        type="text"
        name="seo.ogTitle"
        value={formData.seo.ogTitle}
        onChange={handleInputChange}
        placeholder="Auto: same as Meta Title"
      />

      <Input
        label="OG Description"
        type="textarea"
        name="seo.ogDescription"
        value={formData.seo.ogDescription}
        onChange={handleInputChange}
        placeholder="Auto: same as Meta Description"
      />

      <Input
        label="OG Image URL"
        type="text"
        name="seo.ogImage"
        value={formData.seo.ogImage}
        onChange={handleInputChange}
        placeholder="Full URL or filename. Auto: first product image (1200×630 ideal)"
      />

      <Input
        label="Canonical URL"
        type="text"
        name="seo.canonicalUrl"
        value={formData.seo.canonicalUrl}
        onChange={handleInputChange}
        placeholder={`Auto: https://crosscoin.in/products/${formData.slug || '<slug>'}`}
      />

      <Input
        label="Structured Data (JSON-LD)"
        type="textarea"
        name="seo.structuredData"
        value={formData.seo.structuredData}
        onChange={handleInputChange}
        placeholder="Auto: schema.org/Product with brand, sku, offers, returns, shipping, aggregateRating"
      />

      <div style={{ marginTop: 24 }}>
        <h4 style={{ marginBottom: 12, color: 'var(--ds-color-text)' }}>Live Search Preview</h4>
        <SerpPreview
          title={formData.seo.metaTitle || `${formData.name || 'Product'} | CrossCoin`}
          description={formData.seo.metaDescription || formData.description?.slice(0, 160) || ''}
          url={previewUrl}
          variant="both"
        />
      </div>
    </>
  );
}


