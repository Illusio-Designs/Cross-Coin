import { useState } from "react";
import TableWithControls from "@/components/common/TableWithControls";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import InputField from "@/components/common/InputField";
import DropdownSelect from "@/components/common/DropdownSelect";
import DatePicker from "@/components/common/DatePicker";

export default function Users() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Sample data - replace with your actual data
  const users = [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "customer",
      status: "active",
      joinDate: "2024-01-15",
      lastLogin: "2024-03-15"
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "admin",
      status: "active",
      joinDate: "2024-02-01",
      lastLogin: "2024-03-14"
    }
  ];

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status" },
    { key: "joinDate", header: "Join Date" },
    { key: "lastLogin", header: "Last Login" }
  ];

  const filters = [
    {
      key: "role",
      label: "Role",
      options: [
        { label: "All", value: "" },
        { label: "Admin", value: "admin" },
        { label: "Customer", value: "customer" }
      ]
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Suspended", value: "suspended" }
      ]
    }
  ];

  const actions = [
    {
      variant: "primary",
      icon: "eye",
      tooltip: "View User",
      onClick: (row) => {
        setSelectedUser(row);
        setIsViewModalOpen(true);
      }
    },
    {
      variant: "primary",
      icon: "edit",
      tooltip: "Edit User",
      onClick: (row) => {
        setSelectedUser(row);
        setIsEditModalOpen(true);
      }
    },
    {
      variant: "danger",
      icon: "ban",
      tooltip: "Suspend User",
      onClick: (row) => {
        // Handle suspend
        console.log("Suspend user:", row);
      },
      disabled: (row) => row.status === "suspended"
    }
  ];

  const handleAddUser = (formData) => {
    // Handle adding new user
    console.log("Add user:", formData);
    setIsAddModalOpen(false);
  };

  const handleEditUser = (formData) => {
    // Handle editing user
    console.log("Edit user:", formData);
    setIsEditModalOpen(false);
  };

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Users Management</h1>
        <Button 
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New User
        </Button>
      </div>

      <TableWithControls
        columns={columns}
        data={users}
        searchFields={["name", "email"]}
        filters={filters}
        actions={actions}
        itemsPerPage={10}
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddUser(Object.fromEntries(formData));
        }}>
          <div className="space-y-4">
            <InputField
              name="name"
              label="Full Name"
              required
            />
            <InputField
              name="email"
              label="Email"
              type="email"
              required
            />
            <InputField
              name="password"
              label="Password"
              type="password"
              required
            />
            <DropdownSelect
              name="role"
              label="Role"
              options={[
                { label: "Customer", value: "customer" },
                { label: "Admin", value: "admin" }
              ]}
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
                Add User
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
      >
        {selectedUser && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleEditUser(Object.fromEntries(formData));
          }}>
            <div className="space-y-4">
              <InputField
                name="name"
                label="Full Name"
                defaultValue={selectedUser.name}
                required
              />
              <InputField
                name="email"
                label="Email"
                type="email"
                defaultValue={selectedUser.email}
                required
              />
              <DropdownSelect
                name="role"
                label="Role"
                options={[
                  { label: "Customer", value: "customer" },
                  { label: "Admin", value: "admin" }
                ]}
                defaultValue={selectedUser.role}
                required
              />
              <DropdownSelect
                name="status"
                label="Status"
                options={[
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                  { label: "Suspended", value: "suspended" }
                ]}
                defaultValue={selectedUser.status}
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

      {/* View User Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">User Information</h3>
                <p><strong>Name:</strong> {selectedUser.name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
                <p><strong>Status:</strong> {selectedUser.status}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Details</h3>
                <p><strong>Join Date:</strong> {selectedUser.joinDate}</p>
                <p><strong>Last Login:</strong> {selectedUser.lastLogin}</p>
              </div>
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
                  setSelectedUser(selectedUser);
                  setIsViewModalOpen(false);
                  setIsEditModalOpen(true);
                }}
              >
                Edit User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 