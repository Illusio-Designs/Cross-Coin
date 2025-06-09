import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";

export default function Attributes() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState(null);

  // Sample data - replace with your actual data
  const attributes = [
    { id: 1, name: "Color", type: "select", values: ["Red", "Blue", "Green"], required: true },
    { id: 2, name: "Size", type: "select", values: ["S", "M", "L", "XL"], required: true },
    { id: 3, name: "Material", type: "text", values: [], required: false },
  ];

  const columns = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    { key: "values", header: "Values", render: (row) => row.values.join(", ") },
    { key: "required", header: "Required", render: (row) => row.required ? "Yes" : "No" }
  ];

  const filters = [
    {
      key: "type",
      label: "Type",
      options: [
        { label: "All", value: "" },
        { label: "Select", value: "select" },
        { label: "Text", value: "text" }
      ]
    },
    {
      key: "required",
      label: "Required",
      options: [
        { label: "All", value: "" },
        { label: "Yes", value: "true" },
        { label: "No", value: "false" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "edit",
      tooltip: "Edit Attribute",
      onClick: (row) => {
        setSelectedAttribute(row);
        setIsEditModalOpen(true);
      }
    },
    {
      variant: "danger",
      icon: "delete",
      tooltip: "Delete Attribute",
      onClick: (row) => {
        // Handle delete
        console.log("Delete attribute:", row);
      }
    }
  ];

  const handleAddAttribute = (formData) => {
    // Handle adding new attribute
    console.log("Add attribute:", formData);
    setIsAddModalOpen(false);
  };

  const handleEditAttribute = (formData) => {
    // Handle editing attribute
    console.log("Edit attribute:", formData);
    setIsEditModalOpen(false);
  };

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Attributes Management</h1>
        <Button 
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Attribute
        </Button>
      </div>

      <TableWithControls
        columns={columns}
        data={attributes}
        searchFields={["name"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* Add Attribute Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Attribute"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddAttribute(Object.fromEntries(formData));
        }}>
          <div className="space-y-4">
            <InputField
              name="name"
              label="Attribute Name"
              required
            />
            <DropdownSelect
              name="type"
              label="Type"
              options={[
                { label: "Select", value: "select" },
                { label: "Text", value: "text" }
              ]}
              required
            />
            <InputField
              name="values"
              label="Values (comma-separated)"
              placeholder="For select type only"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="required"
                id="required"
                className="mr-2"
              />
              <label htmlFor="required">Required</label>
            </div>
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
                Add Attribute
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Attribute Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Attribute"
      >
        {selectedAttribute && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleEditAttribute(Object.fromEntries(formData));
          }}>
            <div className="space-y-4">
              <InputField
                name="name"
                label="Attribute Name"
                defaultValue={selectedAttribute.name}
                required
              />
              <DropdownSelect
                name="type"
                label="Type"
                options={[
                  { label: "Select", value: "select" },
                  { label: "Text", value: "text" }
                ]}
                defaultValue={selectedAttribute.type}
                required
              />
              <InputField
                name="values"
                label="Values (comma-separated)"
                defaultValue={selectedAttribute.values.join(", ")}
                placeholder="For select type only"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="required"
                  id="required"
                  defaultChecked={selectedAttribute.required}
                  className="mr-2"
                />
                <label htmlFor="required">Required</label>
              </div>
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