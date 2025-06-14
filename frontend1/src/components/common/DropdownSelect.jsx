import React from "react";
import Select from "react-select";
import "../../styles/common/DropdownSelect.css";

const DropdownSelect = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  isMulti = false,
  isClearable = true,
  isSearchable = true,
  className = "",
  isDisabled = false,
  required = false,
}) => {
  // Transform options if they're strings to the format react-select expects
  const formattedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  // Transform value if it's a string to the format react-select expects
  const formattedValue = value
    ? typeof value === "string"
      ? { value, label: value }
      : value
    : null;

  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      borderColor: state.isFocused ? "#4a90e2" : "#ddd",
      boxShadow: state.isFocused ? "0 0 0 1px #4a90e2" : "none",
      "&:hover": {
        borderColor: "#4a90e2",
      },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#4a90e2"
        : state.isFocused
        ? "#f0f7ff"
        : "white",
      color: state.isSelected ? "white" : "#333",
      "&:hover": {
        backgroundColor: state.isSelected ? "#4a90e2" : "#f0f7ff",
      },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className={`dropdown-select ${className}`}>
      {label && (
        <label className="dropdown-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <Select
        value={formattedValue}
        onChange={onChange}
        options={formattedOptions}
        placeholder={placeholder}
        isMulti={isMulti}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        styles={customStyles}
        classNamePrefix="react-select"
        noOptionsMessage={() => "No options found"}
        loadingMessage={() => "Loading..."}
      />
    </div>
  );
};

export default DropdownSelect; 