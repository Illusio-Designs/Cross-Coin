import React from "react";
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash, HiOutlineCheck } from "react-icons/hi2";
import { IoToggle, IoToggleOutline, IoClose } from "react-icons/io5";

import "../../styles/common/ActionButton.css";

const ActionButton = ({ 
  icon, 
  onClick, 
  variant = "default",
  tooltip,
  disabled = false,
  size = "medium"
}) => {
  const getVariantStyles = () => {
    const variants = {
      view: "action-btn-view",
      edit: "action-btn-edit",
      delete: "action-btn-delete",
      active: "action-btn-active",
      inactive: "action-btn-inactive",
      approve: "action-btn-approve",
      reject: "action-btn-reject",
      default: "action-btn-default"
    };
    return variants[variant] || variants.default;
  };

  const getIcon = () => {
    if (icon) return icon;
    
    const icons = {
      view: <HiOutlineEye size={20} />,
      edit: <HiOutlinePencil size={20} />,
      delete: <HiOutlineTrash size={20} />,
      active: <IoToggle size={20} />,
      inactive: <IoToggleOutline size={20} />,
      approve: <HiOutlineCheck size={20} />,
      reject: <IoClose size={20} />
    };
    return icons[variant] || null;
  };

  return (
    <button
      className={`action-btn ${getVariantStyles()} action-btn-${size}`}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      {getIcon()}
    </button>
  );
};

export default ActionButton; 