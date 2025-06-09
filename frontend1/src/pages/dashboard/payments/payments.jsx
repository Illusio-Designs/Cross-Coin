import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";
import DatePicker from "@/components/common/DatePicker";

export default function Payments() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Sample data - replace with your actual data
  const payments = [
    {
      id: 1,
      orderNumber: "ORD-001",
      customer: "John Doe",
      amount: "$150.00",
      method: "credit_card",
      status: "completed",
      date: "2024-03-15",
      transactionId: "TXN123456"
    },
    {
      id: 2,
      orderNumber: "ORD-002",
      customer: "Jane Smith",
      amount: "$200.00",
      method: "paypal",
      status: "pending",
      date: "2024-03-14",
      transactionId: "TXN789012"
    }
  ];

  const columns = [
    { key: "orderNumber", header: "Order Number" },
    { key: "customer", header: "Customer" },
    { key: "amount", header: "Amount" },
    { key: "method", header: "Method", render: (row) => {
      const methods = {
        credit_card: "Credit Card",
        paypal: "PayPal",
        bank_transfer: "Bank Transfer"
      };
      return methods[row.method] || row.method;
    }},
    { key: "status", header: "Status" },
    { key: "date", header: "Date" }
  ];

  const filters = [
    {
      key: "method",
      label: "Payment Method",
      options: [
        { label: "All", value: "" },
        { label: "Credit Card", value: "credit_card" },
        { label: "PayPal", value: "paypal" },
        { label: "Bank Transfer", value: "bank_transfer" }
      ]
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Completed", value: "completed" },
        { label: "Pending", value: "pending" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "eye",
      tooltip: "View Payment",
      onClick: (row) => {
        setSelectedPayment(row);
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
      icon: "undo",
      tooltip: "Refund Payment",
      onClick: (row) => {
        // Handle refund
        console.log("Refund payment:", row);
      },
      disabled: (row) => row.status !== "completed"
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Payments Management</h1>
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
        data={payments}
        searchFields={["orderNumber", "customer", "transactionId"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* View Payment Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Payment Details - ${selectedPayment?.orderNumber}`}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Payment Information</h3>
                <p><strong>Order Number:</strong> {selectedPayment.orderNumber}</p>
                <p><strong>Customer:</strong> {selectedPayment.customer}</p>
                <p><strong>Amount:</strong> {selectedPayment.amount}</p>
                <p><strong>Method:</strong> {
                  {
                    credit_card: "Credit Card",
                    paypal: "PayPal",
                    bank_transfer: "Bank Transfer"
                  }[selectedPayment.method] || selectedPayment.method
                }</p>
                <p><strong>Status:</strong> {selectedPayment.status}</p>
                <p><strong>Date:</strong> {selectedPayment.date}</p>
                <p><strong>Transaction ID:</strong> {selectedPayment.transactionId}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              {selectedPayment.status === "completed" && (
                <Button
                  variant="danger"
                  onClick={() => {
                    // Handle refund
                    console.log("Refund payment:", selectedPayment);
                    setIsViewModalOpen(false);
                  }}
                >
                  Refund Payment
                </Button>
              )}
              {selectedPayment.status === "pending" && (
                <Button
                  variant="success"
                  onClick={() => {
                    // Handle complete
                    console.log("Complete payment:", selectedPayment);
                    setIsViewModalOpen(false);
                  }}
                >
                  Mark as Completed
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 