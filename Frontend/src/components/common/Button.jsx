import React from "react";
import "../../styles/common/Button.css";

const Button = ({ onClick, children, className, type = "button" }) => {
  return (
    <button
      className={`common-button ${className}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};

export default Button; 