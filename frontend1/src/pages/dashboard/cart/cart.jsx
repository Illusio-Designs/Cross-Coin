import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";
import DatePicker from "@/components/common/DatePicker";

export default function Cart() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCart, setSelectedCart] = useState(null);

  // Sample data - replace with your actual data
  const carts = [
    {
      id: 1,
      customer: "John Doe",
      items: 3,
      total: "$150.00",
      status: "active",
      lastUpdated: "2024-03-15",
      items: [
        { name: "Product 1", quantity: 2, price: "$50.00" },
        { name: "Product 2", quantity: 1, price: "$50.00" }
      ]
    },
    {
      id: 2,
      customer: "Jane Smith",
      items: 1,
      total: "$200.00",
      status: "abandoned",
      lastUpdated: "2024-03-10",
      items: [
        { name: "Product 3", quantity: 1, price: "$200.00" }
      ]
    }
  ];

  const columns = [
    { key: "customer", header: "Customer" },
    { key: "items", header: "Items" },
    { key: "total", header: "Total" },
    { key: "status", header: "Status" },
    { key: "lastUpdated", header: "Last Updated" }
  ];

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Active", value: "active" },
        { label: "Abandoned", value: "abandoned" },
        { label: "Converted", value: "converted" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "eye",
      tooltip: "View Cart",
      onClick: (row) => {
        setSelectedCart(row);
        setIsViewModalOpen(true);
      }
    },
    {
      variant: "success",
      icon: "shopping-cart",
      tooltip: "Convert to Order",
      onClick: (row) => {
        // Handle conversion
        console.log("Convert to order:", row);
      },
      disabled: (row) => row.status === "converted"
    },
    {
      variant: "danger",
      icon: "trash",
      tooltip: "Clear Cart",
      onClick: (row) => {
        // Handle clear
        console.log("Clear cart:", row);
      }
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Shopping Carts</h1>
        <div className="flex gap-2">
          <DatePicker
            placeholder="Start Date"
            onChange={(date) => console.log("Start date:", date)}
          />
          <DatePicker
            placeholder="End Date"
            onChange={(date) => console.log("End date:", date)}
          />
        </div>
      </div>

      <TableWithControls
        columns={columns}
        data={carts}
        searchFields={["customer"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* View Cart Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Cart Details - ${selectedCart?.customer}`}
      >
        {selectedCart && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Cart Information</h3>
                <p><strong>Customer:</strong> {selectedCart.customer}</p>
                <p><strong>Status:</strong> {selectedCart.status}</p>
                <p><strong>Last Updated:</strong> {selectedCart.lastUpdated}</p>
                <p><strong>Total Items:</strong> {selectedCart.items}</p>
                <p><strong>Total Amount:</strong> {selectedCart.total}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cart Items</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Item</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCart.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{item.price}</td>
                      <td className="text-right">
                        ${(parseFloat(item.price.replace("$", "")) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  // Handle conversion
                  console.log("Convert to order:", selectedCart);
                  setIsViewModalOpen(false);
                }}
                disabled={selectedCart.status === "converted"}
              >
                Convert to Order
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 