import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
// Assuming attributeService is imported from '@/services' in the parent component
// and passed as a prop, or directly imported here if preferred.

const AttributeSelector = ({ 
  variationIndex, 
  attributes, // All attribute types (e.g., Size, Color) with their values
  selectedAttributes, // Current attributes for THIS variation (e.g., { size: ["Small"], color: ["Red"] })
  onChange // Callback to update parent form data
}) => {
  const handleAttributeChange = (attributeName, selectedOptions) => {
    const newAttributes = { ...selectedAttributes };
    // Ensure the key is normalized to lowercase when updating attributes
    newAttributes[attributeName.toLowerCase()] = selectedOptions.map(option => option.value);
    onChange(variationIndex, newAttributes);
  };

  // Function to create a new option (if react-select is used with react-select-creatable)
  // This assumes the backend attributeService.addAttributeValues can be called from frontend
  // For simplicity, we'll assume attributes and their values are pre-defined by admin in the attributes page
  // If "creating new values" is a hard requirement from this modal, this will need more logic
  // and interaction with attributeService.createAttributeValue or similar.
  // For now, we focus on selecting existing values.

  return (
    <div className="attribute-selector">
      {Object.entries(attributes).map(([attributeName, values]) => {
        // Normalize attributeName to lowercase for consistent access with selectedAttributes
        const normalizedAttributeName = attributeName.toLowerCase();

        console.log(`AttributeSelector: Processing attribute: ${attributeName}`);
        console.log(`AttributeSelector: Available values for ${attributeName}:`, values);
        console.log(`AttributeSelector: Selected values for ${attributeName}:`, selectedAttributes[normalizedAttributeName]);
        return (
          <div key={attributeName} className="attribute-group">
            <label>{attributeName}</label>
            <CreatableSelect
              isMulti
              options={values.map(value => ({ value, label: value }))}
              value={selectedAttributes[normalizedAttributeName]?.map(value => ({ value, label: value })) || []}
              onChange={(selected) => handleAttributeChange(attributeName, selected)}
              placeholder={`Select or create ${attributeName}`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AttributeSelector; 