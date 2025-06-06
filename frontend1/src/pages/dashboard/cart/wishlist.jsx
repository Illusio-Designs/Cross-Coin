import { useState } from "react";
import { FaHeart, FaTrash, FaShoppingCart } from "react-icons/fa";
import Button from "@/components/common/Button";
import Filter from "@/components/common/Filter";
import SortBy from "@/components/common/SortBy";
import "../../../styles/dashboard/wishlist.css";

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([
    { 
      id: 1,
      title: "Product 1",
      price: "$99.99",
      image: "https://via.placeholder.com/200",
    },
    {
      id: 2,
      title: "Product 2",
      price: "$149.99",
      image: "https://via.placeholder.com/200",
    },
  ]);

  const [filterValue, setFilterValue] = useState("");
  const [sortValue, setSortValue] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const filterOptions = [
    { value: "all", label: "All Items" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "price", label: "Price" },
    { value: "date", label: "Date Added" },
  ];

  const handleRemoveFromWishlist = (id) => {
    setWishlistItems(wishlistItems.filter(item => item.id !== id));
  };

  const handleMoveToCart = (id) => {
    // Implement move to cart functionality
    console.log("Moving item to cart:", id);
  };

  return (
    <div className="wishlist-container">
      <div className="wishlist-header">
        <h1 className="wishlist-title">My Wishlist</h1>
        <div className="wishlist-filters">
          <Filter
            options={filterOptions}
            selectedValue={filterValue}
            onChange={setFilterValue}
            placeholder="Filter items"
          />
          <SortBy
            options={sortOptions}
            selectedValue={sortValue}
            onChange={setSortValue}
            direction={sortDirection}
            onDirectionChange={setSortDirection}
          />
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="wishlist-empty">
          <FaHeart className="wishlist-empty-icon" />
          <p className="wishlist-empty-text">Your wishlist is empty</p>
          <Button variant="primary">Start Shopping</Button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlistItems.map((item) => (
            <div key={item.id} className="wishlist-item">
              <img
                src={item.image}
                alt={item.title}
                className="wishlist-item-image"
              />
              <h3 className="wishlist-item-title">{item.title}</h3>
              <p className="wishlist-item-price">{item.price}</p>
              <div className="wishlist-item-actions">
                <Button
                  variant="primary"
                  onClick={() => handleMoveToCart(item.id)}
                >
                  <FaShoppingCart /> Add to Cart
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleRemoveFromWishlist(item.id)}
                >
                  <FaTrash /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 