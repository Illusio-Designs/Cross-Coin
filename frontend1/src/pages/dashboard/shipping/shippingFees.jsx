import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";

export default function ShippingFees() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);

  // Sample data - replace with your actual data
  const shippingFees = [
    {
      id: 1,
      name: "Standard Shipping",
      type: "weight",
      minWeight: 0,
      maxWeight: 5,
      fee: "$5.00",
      status: "active"
    },
    {
      id: 2,
      name: "Express Shipping",
      type: "weight",
      minWeight: 0,
      maxWeight: 10,
      fee: "$15.00",
      status: "active"
    },
    {
      id: 3,
      name: "Free Shipping",
      type: "order_value",
      minValue: 100,
      maxValue: null,
      fee: "$0.00",
      status: "active"
    }
  ];

  const columns = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    { 
      key: "range", 
      header: "Range",
      render: (row) => {
        if (row.type === "weight") {
          return `${row.minWeight} - ${row.maxWeight} kg`;
        }
        return `$${row.minValue}${row.maxValue ? ` - $${row.maxValue}` : "+"}`;
      }
    },
    { key: "fee", header: "Fee" },
    { key: "status", header: "Status" }
  ];

  const filters = [
    {
      key: "type",
      label: "Type",
      options: [
        { label: "All", value: "" },
        { label: "Weight Based", value: "weight" },
        { label: "Order Value", value: "order_value" }
      ]
    },
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
      tooltip: "Edit Fee",
      onClick: (row) => {
        setSelectedFee(row);
        setIsEditModalOpen(true);
      }
    },
    {
      variant: "danger",
      icon: "trash",
      tooltip: "Delete Fee",
      onClick: (row) => {
        // Handle delete
        console.log("Delete fee:", row);
      }
    }
  ];

  const handleAddFee = (formData) => {
    // Handle adding new fee
    console.log("Add fee:", formData);
    setIsAddModalOpen(false);
  };

  const handleEditFee = (formData) => {
    // Handle editing fee
    console.log("Edit fee:", formData);
    setIsEditModalOpen(false);
  };

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Shipping Fees Management</h1>
        <Button 
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Fee
        </Button>
      </div>

      <TableWithControls
        columns={columns}
        data={shippingFees}
        searchFields={["name"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* Add Fee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Shipping Fee"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddFee(Object.fromEntries(formData));
        }}>
          <div className="space-y-4">
            <InputField
              name="name"
              label="Fee Name"
              required
            />
            <DropdownSelect
              name="type"
              label="Fee Type"
              options={[
                { label: "Weight Based", value: "weight" },
                { label: "Order Value", value: "order_value" }
              ]}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                name="minValue"
                label="Minimum Value"
                type="number"
                required
              />
              <InputField
                name="maxValue"
                label="Maximum Value"
                type="number"
              />
            </div>
              <InputField
              name="fee"
              label="Fee Amount"
                type="number"
              required
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
                Add Fee
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Fee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Shipping Fee"
      >
        {selectedFee && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleEditFee(Object.fromEntries(formData));
          }}>
            <div className="space-y-4">
              <InputField
                name="name"
                label="Fee Name"
                defaultValue={selectedFee.name}
                required
              />
              <DropdownSelect
                name="type"
                label="Fee Type"
                options={[
                  { label: "Weight Based", value: "weight" },
                  { label: "Order Value", value: "order_value" }
                ]}
                defaultValue={selectedFee.type}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name="minValue"
                  label="Minimum Value"
                  type="number"
                  defaultValue={selectedFee.type === "weight" ? selectedFee.minWeight : selectedFee.minValue}
                  required
                />
            <InputField
                  name="maxValue"
                  label="Maximum Value"
                  type="number"
                  defaultValue={selectedFee.type === "weight" ? selectedFee.maxWeight : selectedFee.maxValue}
            />
          </div>
              <InputField
                name="fee"
                label="Fee Amount"
                type="number"
                defaultValue={parseFloat(selectedFee.fee.replace("$", ""))}
                required
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