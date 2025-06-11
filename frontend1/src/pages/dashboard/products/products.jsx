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
import "../../../styles/dashboard/products.css";

export default function Products() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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
    variations: [{
      price: "",
      comparePrice: "",
      stock: "",
      sku: "",
      attributes: {
        size: "",
        color: "",
        material: ""
      },
      weight: "",
      weightUnit: "g",
      dimensions: {
        length: "",
        width: "",
        height: ""
      },
      dimensionUnit: "cm"
    }],
    seo: {
      metaTitle: "",
      metaDescription: "",
      metaKeywords: ""
    }
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
    try {
      const response = await attributeService.getAllAttributes();
      setAttributes(response);
    } catch (err) {
      console.error("Error fetching attributes:", err);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Fetch products data
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getAllProducts();
      console.log('Products API Response:', response);
      if (response && response.products) {
        setProducts(response.products);
      } else {
        setError('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch for products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Enhanced filter function
  const filteredData = products.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.name?.toLowerCase().includes(searchTerm)) ||
      (item.description?.toLowerCase().includes(searchTerm)) ||
      (item.category?.name?.toLowerCase().includes(searchTerm))
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Add serial number to each row
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: indexOfFirstItem + idx + 1
  }));

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  // Columns definition
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: "category.name" },
    { 
      header: "Price", 
      accessor: row => row.ProductVariations?.[0]?.price || 'N/A'
    },
    { 
      header: "Stock", 
      accessor: row => row.ProductVariations?.[0]?.stock || 'N/A'
    },
    { header: "Status", accessor: "status" },
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

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const data = await productService.getProduct(id);
      setFormData({
        id: data.id,
        name: data.name || "",
        description: data.description || "",
        categoryId: data.categoryId || "",
        status: data.status || "active",
        price: data.price || "",
        stock: data.stock || "",
        images: data.images || [],
        variations: data.variations || [],
        seo: data.seo || {
          metaTitle: "",
          metaDescription: "",
          metaKeywords: ""
        }
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch product data");
      console.error("Error fetching product data:", err);
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
        console.error("Error deleting product:", err);
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
      variations: [{
        price: "",
        comparePrice: "",
        stock: "",
        sku: "",
        attributes: {
          size: "",
          color: "",
          material: ""
        },
        weight: "",
        weightUnit: "g",
        dimensions: {
          length: "",
          width: "",
          height: ""
        },
        dimensionUnit: "cm"
      }],
      seo: {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: ""
      }
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
      variations: [{
        price: "",
        comparePrice: "",
        stock: "",
        sku: "",
        attributes: {
          size: "",
          color: "",
          material: ""
        },
        weight: "",
        weightUnit: "g",
        dimensions: {
          length: "",
          width: "",
          height: ""
        },
        dimensionUnit: "cm"
      }],
      seo: {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: ""
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    console.log('Input Change:', {
      name,
      value,
      type,
      currentFormData: formData
    });

    if (!name) {
      console.error('Input field missing name attribute:', e.target);
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
      const [_, index, field] = name.split('.');
      const variationIndex = parseInt(index);
      
      setFormData(prev => {
        const newVariations = [...prev.variations];
        newVariations[variationIndex] = {
          ...newVariations[variationIndex],
          [field]: type === 'number' ? Number(value) : value
        };
        
        return {
          ...prev,
          variations: newVariations
        };
      });
    } else if (name.startsWith('attributes.')) {
      const [_, index, attrField] = name.split('.');
      const variationIndex = parseInt(index);
      
      setFormData(prev => {
        const newVariations = [...prev.variations];
        const currentAttributes = newVariations[variationIndex].attributes || {};
        
        newVariations[variationIndex] = {
          ...newVariations[variationIndex],
          attributes: {
            ...currentAttributes,
            [attrField]: value
          }
        };
        
        return {
          ...prev,
          variations: newVariations
        };
      });
    } else if (type === 'file') {
      if (name === 'images') {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
          alert('You can only upload up to 5 images');
          return;
        }
        setFormData(prev => ({
          ...prev,
          images: files
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
          attributes: {
            size: "",
            color: "",
            material: ""
          },
          weight: "",
          weightUnit: "g",
          dimensions: {
            length: "",
            width: "",
            height: ""
          },
          dimensionUnit: "cm"
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
    console.log('Form Submit:', {
      formData,
      isEdit: !!formData.id
    });
    
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      // Basic product information
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('status', formData.status);

      // Handle images
      if (formData.images && Array.isArray(formData.images)) {
        formData.images.forEach((image, index) => {
          formDataToSend.append('images', image);
        });
      }

      // Handle variations with attributes
      const variationsWithAttributes = formData.variations.map(variation => {
        // Parse attributes if they're strings
        let attributes = variation.attributes;
        if (typeof attributes === 'string') {
          try {
            attributes = JSON.parse(attributes);
          } catch (e) {
            console.error('Error parsing attributes:', e);
            attributes = {};
          }
        }

        return {
          price: Number(variation.price),
          comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
          stock: Number(variation.stock),
          sku: variation.sku,
          attributes: attributes,
          weight: variation.weight ? Number(variation.weight) : null,
          weightUnit: variation.weightUnit || 'g',
          dimensions: variation.dimensions || null,
          dimensionUnit: variation.dimensionUnit || 'cm'
        };
      });

      formDataToSend.append('variations', JSON.stringify(variationsWithAttributes));

      // Handle SEO data
      const seoData = {
        metaTitle: formData.seo.metaTitle || formData.name,
        metaDescription: formData.seo.metaDescription || formData.description,
        metaKeywords: formData.seo.metaKeywords || '',
        ogTitle: formData.seo.metaTitle || formData.name,
        ogDescription: formData.seo.metaDescription || formData.description,
        ogImage: formData.images?.[0] ? URL.createObjectURL(formData.images[0]) : null,
        canonicalUrl: `${window.location.origin}/products/${formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}`,
        structuredData: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": formData.name,
          "description": formData.description,
          "image": formData.images?.[0] ? URL.createObjectURL(formData.images[0]) : null,
          "offers": {
            "@type": "Offer",
            "price": variationsWithAttributes[0]?.price || 0,
            "priceCurrency": "USD",
            "availability": variationsWithAttributes[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        })
      };

      formDataToSend.append('seo', JSON.stringify(seoData));

      // Log the complete FormData for debugging
      console.log('FormData being sent:', {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId,
        status: formData.status,
        variations: variationsWithAttributes,
        seo: seoData,
        imagesCount: formData.images?.length || 0
      });

      // Log each FormData entry for verification
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      if (formData.id) {
        await productService.updateProduct(formData.id, formDataToSend);
      } else {
        await productService.createProduct(formDataToSend);
      }
      await fetchProducts();
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
        variations: [{
          price: "",
          comparePrice: "",
          stock: "",
          sku: "",
          attributes: {
            size: "",
            color: "",
            material: ""
          },
          weight: "",
          weightUnit: "g",
          dimensions: {
            length: "",
            width: "",
            height: ""
          },
          dimensionUnit: "cm"
        }],
        seo: {
          metaTitle: "",
          metaDescription: "",
          metaKeywords: ""
        }
      });
    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message || "Failed to save product");
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
            <InputField
              label="Description"
              type="textarea"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <InputField
              label="Category"
              type="select"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              required
              options={[
                { value: "", label: "Select Category" },
                ...categories.map(category => ({
                  value: category.id,
                  label: category.name
                }))
              ]}
            />
            <InputField
              label="Status"
              type="select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" }
              ]}
            />
          </>
        );
      case 2:
        return (
          <>
            <div className="variations-section">
              <div className="variations-header">
                <h3>Product Variations</h3>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={addVariation}
                >
                  Add Variation
                </Button>
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
                    value={variation.comparePrice}
                    onChange={handleInputChange}
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
                    required
                  />
                  {renderAttributesSection(index)}
                </div>
              ))}
            </div>
            <div className="input-field">
              <label className="input-field-label">Product Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="input-field"
                onChange={handleInputChange}
                name="images"
                required={!formData.id}
              />
              {formData.images && formData.images.length > 0 && (
                <div className="image-preview-grid">
                  {formData.images.map((image, index) => (
                    <img 
                      key={index}
                      src={typeof image === 'string' 
                        ? `${process.env.NEXT_PUBLIC_API_URL}${image}` 
                        : URL.createObjectURL(image)} 
                      alt={`Product Preview ${index + 1}`} 
                      className="product-image-preview" 
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <InputField
              label="Meta Title"
              type="text"
              name="seo.metaTitle"
              value={formData.seo.metaTitle}
              onChange={handleInputChange}
            />
            <InputField
              label="Meta Description"
              type="textarea"
              name="seo.metaDescription"
              value={formData.seo.metaDescription}
              onChange={handleInputChange}
            />
            <InputField
              label="Meta Keywords"
              type="text"
              name="seo.metaKeywords"
              value={formData.seo.metaKeywords}
              onChange={handleInputChange}
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderAttributesSection = (variationIndex) => {
    return (
      <div className="attributes-section">
        <h5>Attributes</h5>
        {attributes.map((attribute) => (
          <InputField
            key={attribute.id}
            label={attribute.name}
            type="select"
            name={`attributes.${variationIndex}.${attribute.name}`}
            value={formData.variations[variationIndex].attributes[attribute.name] || ''}
            onChange={handleInputChange}
            options={[
              { value: '', label: `Select ${attribute.name}` },
              ...attribute.AttributeValues.map(value => ({
                value: value.value,
                label: value.value
              }))
            ]}
          />
        ))}
      </div>
    );
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
                  placeholder="Search"
                  onChange={handleSearchChange}
                  defaultValue={filterValue}
                />
              </div>
            </form>
            <Button 
              variant="primary"
              onClick={handleAddNew}
              className="add-new-btn"
            >
              Add New Product
            </Button>
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
                    className="w-full"
                    striped={true}
                    hoverable={true}
                  />
                  {filteredData.length > itemsPerPage && (
                    <div className="seo-pagination-container">
        <Pagination
          currentPage={currentPage}
                        totalItems={filteredData.length}
                        itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
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
    </>
  );
} 