import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const AttributeSelector = ({ variationIndex, attributes, selectedAttributes, onChange }) => {
  const handleAttributeChange = (attributeName, selectedOptions) => {
    const newAttributes = { ...selectedAttributes };
    newAttributes[attributeName] = selectedOptions.map(option => option.value);
    onChange(variationIndex, newAttributes);
  };

  return (
    <div className="attribute-selector">
      {Object.entries(attributes).map(([attributeName, values]) => (
        <div key={attributeName} className="attribute-group">
          <label>{attributeName}</label>
          <CreatableSelect
            isMulti
            options={values.map(value => ({ value, label: value }))}
            value={selectedAttributes[attributeName]?.map(value => ({ value, label: value })) || []}
            onChange={(selected) => handleAttributeChange(attributeName, selected)}
            placeholder={`Select or create ${attributeName}`}
          />
        </div>
      ))}
    </div>
  );
};

export default AttributeSelector; 