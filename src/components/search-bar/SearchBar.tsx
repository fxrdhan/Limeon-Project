import React, { useRef, useEffect, useState } from 'react';
import { TbArrowBack } from 'react-icons/tb';
import { TableSearchProps } from './types';
import { SEARCH_CONSTANTS } from './constants';
import SearchIcon from './components/SearchIcon';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_SOFT_CLASS,
} from '@/styles/uiPrimitives';

const SearchBar: React.FC<TableSearchProps> = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = 'Cari...',
  className = '',
  inputRef,
  searchState = 'idle',
  showNotFoundArrow = true,
}) => {
  const hasValue = value && value.length > 0;
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const lastSettledSearchStateRef = useRef(searchState);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (textMeasureRef.current && value) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [value]);

  useEffect(() => {
    if (searchState !== 'typing') {
      lastSettledSearchStateRef.current = searchState;
    }
  }, [searchState]);

  const visualSearchState =
    searchState === 'typing'
      ? lastSettledSearchStateRef.current === 'typing'
        ? 'idle'
        : lastSettledSearchStateRef.current
      : searchState;

  return (
    <div className={`mb-4 relative ${className}`}>
      <div className="flex items-center">
        <SearchIcon
          mode="simple"
          searchState={visualSearchState}
          displayValue={value}
        />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-all duration-${SEARCH_CONSTANTS.ANIMATION_DURATION} ease-in-out ${
              hasValue ? (showNotFoundArrow ? 'pl-3' : 'pl-2.5') : 'pl-10'
            } ${
              visualSearchState === 'error'
                ? 'border-amber-400 focus:outline-hidden focus:border-amber-500 focus:ring-3 focus:ring-amber-100'
                : visualSearchState === 'not-found'
                  ? `${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_SOFT_CLASS}`
                  : `${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
            } rounded-xl bg-white`}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <span
            ref={textMeasureRef}
            className="absolute invisible whitespace-nowrap text-sm"
            style={{ left: hasValue ? '18px' : '10px', padding: '10px' }}
          >
            {value}
          </span>
          {showNotFoundArrow ? (
            <TbArrowBack
              className={`absolute top-1/2 transform -translate-y-1/2 text-slate-600 pointer-events-none ml-1 transition-all duration-${SEARCH_CONSTANTS.ANIMATION_DURATION} ease-in-out ${
                visualSearchState === 'not-found' && value
                  ? 'opacity-100 scale-150 translate-x-0'
                  : 'opacity-0 scale-95 translate-x-2'
              }`}
              style={{ left: `${textWidth + (hasValue ? 0 : 10)}px` }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
