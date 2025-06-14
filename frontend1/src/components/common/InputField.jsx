import React, { useState } from "react";
import "../../styles/common/InputField.css";

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  multiline = false,
  required = false,
  accept,
  className = "",
  options = [],
  name
}) => {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    onChange(e);
  };

  if (type === "file") {
    return (
      <div className={`input-field ${className}`}>
        <label>{label}</label>
        <div className="file-input-container">
          <div className="file-input-wrapper">
            <input
              type="file"
              onChange={handleFileChange}
              accept={accept}
              required={required}
              className="file-input"
              name={name}
            />
            <div className="file-input-placeholder">
              {value ? value.name : placeholder || "Choose a file"}
            </div>
            <button className="file-input-button">Browse</button>
          </div>
          {preview && (
            <div className="file-preview">
              <img src={preview} alt="Preview" className="file-preview-image" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className={`input-field ${className}`}>
        <label>{label}</label>
        <select
          value={value}
          onChange={onChange}
          required={required}
          className="select-input"
          name={name}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className={`input-field ${className}`}>
        <label>{label}</label>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="textarea-input"
          rows={4}
          name={name}
        />
      </div>
    );
  }

  return (
    <div className={`input-field ${className}`}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="text-input"
        name={name}
      />
    </div>
  );
};

export default InputField; 