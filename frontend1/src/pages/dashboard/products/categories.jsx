import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";

export default function Categories() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Sample data - replace with your actual data
  const categories = [
    { id: 1, name: "Electronics", description: "Electronic devices and accessories", status: "active", parentCategory: null },
    { id: 2, name: "Clothing", description: "Apparel and fashion items", status: "active", parentCategory: null },
    { id: 3, name: "Smartphones", description: "Mobile phones and accessories", status: "active", parentCategory: "Electronics" },
  ];

  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    { key: "parentCategory", header: "Parent Category" },
    { key: "status", header: "Status" }
  ];

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "edit",
      tooltip: "Edit Category",
      onClick: (row) => {
        setSelectedCategory(row);
        setIsEditModalOpen(true);
      }
    },
    {
      variant: "danger",
      icon: "delete",
      tooltip: "Delete Category",
      onClick: (row) => {
        // Handle delete
        console.log("Delete category:", row);
      }
    }
  ];

  const handleAddCategory = (formData) => {
    // Handle adding new category
    console.log("Add category:", formData);
    setIsAddModalOpen(false);
  };

  const handleEditCategory = (formData) => {
    // Handle editing category
    console.log("Edit category:", formData);
    setIsEditModalOpen(false);
  };

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Categories Management</h1>
        <Button 
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Category
        </Button>
      </div>

      <TableWithControls
        columns={columns}
        data={categories}
        searchFields={["name", "description"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddCategory(Object.fromEntries(formData));
        }}>
          <div className="space-y-4">
            <InputField
              name="name"
              label="Category Name"
              required
            />
            <InputField
              name="description"
              label="Description"
              type="textarea"
              required
            />
            <DropdownSelect
              name="parentCategory"
              label="Parent Category"
              options={[
                { label: "None", value: "" },
                ...categories.map(cat => ({ label: cat.name, value: cat.name }))
              ]}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Add Category
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Category"
      >
        {selectedCategory && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleEditCategory(Object.fromEntries(formData));
          }}>
            <div className="space-y-4">
              <InputField
                name="name"
                label="Category Name"
                defaultValue={selectedCategory.name}
                required
              />
              <InputField
                name="description"
                label="Description"
                type="textarea"
                defaultValue={selectedCategory.description}
                required
              />
              <DropdownSelect
                name="parentCategory"
                label="Parent Category"
                options={[
                  { label: "None", value: "" },
                  ...categories
                    .filter(cat => cat.id !== selectedCategory.id)
                    .map(cat => ({ label: cat.name, value: cat.name }))
                ]}
                defaultValue={selectedCategory.parentCategory || ""}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
} 