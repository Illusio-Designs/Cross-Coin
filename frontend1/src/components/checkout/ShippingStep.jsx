import { useState, useEffect } from "react";
import { createShippingAddress, getUserShippingAddresses, updateShippingAddress, deleteShippingAddress, setDefaultShippingAddress } from '../../services/publicindex';
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";

export default function ShippingStep({ onSelectAddress, selectedAddress }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await getUserShippingAddresses();
      setAddresses(data);
      if (data.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      setError(err.message || "Failed to load addresses");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let savedAddress;
      if (editingId) {
        savedAddress = await updateShippingAddress(editingId, form);
      } else {
        savedAddress = await createShippingAddress(form);
      }
      await fetchAddresses();
      onSelectAddress(savedAddress);
      setShowForm(false);
      setEditingId(null);
      setForm({ address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false });
    } catch (err) {
      setError(err.message || "Failed to save address");
    }
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setForm(address);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteShippingAddress(id);
      await fetchAddresses();
      if (selectedAddress && selectedAddress.id === id) {
        onSelectAddress(null);
      }
    } catch (err) {
      setError(err.message || "Failed to delete address");
    }
  };
  
  const handleSetDefault = async (id) => {
    try {
      await setDefaultShippingAddress(id);
      await fetchAddresses();
    } catch (err) {
      setError(err.message || "Failed to set default address");
    }
  };

  return (
    <div className="shipping-addresses">
      <h2>Shipping Address</h2>
      {error && <p className="error-message">{error}</p>}
      
      <div className="address-list">
        {loading ? <p>Loading addresses...</p> : addresses.map(address => (
          <div
            key={address.id}
            className={`address-card ${selectedAddress?.id === address.id ? 'selected' : ''}`}
            onClick={() => onSelectAddress(address)}
          >
            <div className="address-card-body">
                <h3>{address.address} {address.isDefault && "(Default)"}</h3>
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{address.country}</p>
                <p>Phone: {address.phoneNumber}</p>
            </div>
            <div className="address-card-actions">
                <button onClick={(e) => {e.stopPropagation(); handleEdit(address)}}><FaEdit/></button>
                <button onClick={(e) => {e.stopPropagation(); handleDelete(address.id)}}><FaTrash/></button>
                {!address.isDefault && <button onClick={(e) => {e.stopPropagation(); handleSetDefault(address.id)}}>Set as Default</button>}
            </div>
          </div>
        ))}
      </div>

      {!showForm && <button className="add-address-btn" onClick={() => { setShowForm(true); setEditingId(null); setForm({ address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false }); }}>
        <FaPlus /> Add New Address
      </button>}

      {showForm && (
        <div className="shipping-form-container">
            <h4>{editingId ? 'Edit Address' : 'Add New Address'}</h4>
            <form onSubmit={handleSaveAddress} className="shipping-form">
            <div className="form-row-2col">
                  <div className="form-group">
                    <label>Address *</label>
                    <input type="text" name="address" value={form.address} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" name="city" value={form.city} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>State *</label>
                    <input type="text" name="state" value={form.state} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Postal Code *</label>
                    <input type="text" name="postalCode" value={form.postalCode} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Country *</label>
                    <input type="text" name="country" value={form.country} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-group">
                    <label>
                        <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleInputChange} />
                        Set as default address
                    </label>
                </div>
              <button type="submit" className="save-address-btn">{editingId ? 'Update Address' : 'Save Address'}</button>
              <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </form>
          </div>
      )}
    </div>
  )
} 