import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../../context/LanguageContext';
import { Search, ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ onChange, options, defaultLabel, defaultValue = 'all', hideAllOption = false, value: propValue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const value = propValue !== undefined ? propValue : internalValue;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    if (propValue === undefined) {
      setInternalValue(val);
    }
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || (!hideAllOption ? { label: defaultLabel, value: 'all' } : options[0]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-w-[140px] text-left" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-4 py-2.5 text-xs text-[#3a2a1a] cursor-pointer shadow-sm flex items-center justify-between hover:border-[#8B6914] hover:bg-white transition-all select-none"
      >
        <span className="truncate pr-2 font-medium">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-[#9a8a7a] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[160px] max-h-64 overflow-hidden bg-white border border-[#e8ddd0] rounded-xl shadow-lg z-50 flex flex-col select-none">
          {options.length > 5 && (
            <div className="p-2 border-b border-[#e8ddd0] shrink-0 sticky top-0 bg-white z-10">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#fcfaf7] border border-[#e8ddd0] rounded-lg px-3 py-1.5 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all"
              />
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
            {!hideAllOption && !searchTerm && (
              <div 
                onClick={() => handleSelect('all')}
                className={`px-4 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${value === 'all' || !value ? 'bg-[#f5f0e8] text-[#8B6914] font-medium' : 'text-[#3a2a1a] hover:bg-[#fcfaf7]'}`}
              >
                <span className="truncate pr-2">{defaultLabel}</span>
                {(value === 'all' || !value) && <Check className="w-3.5 h-3.5 text-[#8B6914] flex-shrink-0" />}
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-[#9a8a7a] text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-4 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${String(value) === String(opt.value) ? 'bg-[#f5f0e8] text-[#8B6914] font-medium' : 'text-[#3a2a1a] hover:bg-[#fcfaf7]'}`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {String(value) === String(opt.value) && <Check className="w-3.5 h-3.5 text-[#8B6914] flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterBar = ({
  onSearch,
  onFilterChange,
  onSortChange,
  filters = [],
  sortOptions = [],
  placeholder,
  actionButton,
  related = false
}) => {
  const { t } = useLang();
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearch(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className={`p-3 flex flex-wrap items-center justify-between gap-4 transition-all ${related
        ? "bg-white border-b border-[#e8ddd0]"
        : "bg-white rounded-2xl border border-[#e8ddd0] shadow-sm"
      }`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder || t.searchPlaceholder || "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/10 transition-all w-72 shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50 w-4 h-4 text-[#9a8a7a]" />
        </div>

        {/* Dynamic Filters */}
        {filters.map((filter) => (
          <CustomSelect
            key={filter.name}
            defaultLabel={filter.label}
            options={filter.options}
            value={filter.value}
            onChange={(e) => onFilterChange(filter.name, e.target.value)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* Sorting */}
        {sortOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.sortBy || "Sort by:"}</span>
            <CustomSelect
              defaultValue={sortOptions[0]?.value}
              defaultLabel={sortOptions[0]?.label}
              options={sortOptions}
              onChange={(e) => {
                const [sortBy, sort] = e.target.value.split(':');
                onSortChange(sortBy, sort);
              }}
              hideAllOption={true}
            />
          </div>
        )}

        {/* Action Button */}
        {actionButton && (
          <div className="ml-2">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
