import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";
import DatePicker from "@/components/common/DatePicker";

export default function Orders() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Sample data - replace with your actual data
  const orders = [
    { 
      id: 1, 
      orderNumber: "ORD-001", 
      customer: "John Doe", 
      date: "2024-03-15", 
      total: "$150.00", 
      status: "pending",
      items: [
        { name: "Product 1", quantity: 2, price: "$50.00" },
        { name: "Product 2", quantity: 1, price: "$50.00" }
      ]
    },
    { 
      id: 2, 
      orderNumber: "ORD-002", 
      customer: "Jane Smith", 
      date: "2024-03-14", 
      total: "$200.00", 
      status: "completed",
      items: [
        { name: "Product 3", quantity: 1, price: "$200.00" }
      ]
    }
  ];

  const columns = [
    { key: "orderNumber", header: "Order Number" },
    { key: "customer", header: "Customer" },
    { key: "date", header: "Date" },
    { key: "total", header: "Total" },
    { key: "status", header: "Status" }
  ];

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "eye",
      tooltip: "View Order",
      onClick: (row) => {
        setSelectedOrder(row);
        setIsViewModalOpen(true);
      }
    },
    {
      variant: "success",
      icon: "check",
      tooltip: "Mark as Completed",
      onClick: (row) => {
        // Handle status update
        console.log("Mark as completed:", row);
      },
      disabled: (row) => row.status === "completed"
    },
    {
      variant: "danger",
      icon: "times",
      tooltip: "Cancel Order",
      onClick: (row) => {
        // Handle cancellation
        console.log("Cancel order:", row);
      },
      disabled: (row) => row.status === "cancelled" || row.status === "completed"
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Orders Management</h1>
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
        data={orders}
        searchFields={["orderNumber", "customer"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* View Order Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order Details - ${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Order Information</h3>
                <p><strong>Order Number:</strong> {selectedOrder.orderNumber}</p>
                <p><strong>Customer:</strong> {selectedOrder.customer}</p>
                <p><strong>Date:</strong> {selectedOrder.date}</p>
                <p><strong>Status:</strong> {selectedOrder.status}</p>
                <p><strong>Total:</strong> {selectedOrder.total}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Shipping Information</h3>
                <p><strong>Address:</strong> 123 Main St, City, Country</p>
                <p><strong>Phone:</strong> +1 234 567 890</p>
                <p><strong>Email:</strong> customer@example.com</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Order Items</h3>
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
                  {selectedOrder.items.map((item, index) => (
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
                variant="primary"
                onClick={() => {
                  // Handle print or export
                  console.log("Print/Export order:", selectedOrder);
                }}
              >
                Print/Export
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 