import React from 'react';

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
      <div className="modern-searchbar-group">
        <span className="modern-searchbar-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          className="modern-searchbar-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </form>
  );
};

export default SearchBar; 