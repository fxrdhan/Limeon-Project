import React, { useRef, useEffect, useState } from 'react';
import { TbArrowBack, TbZoom, TbZoomCancel } from 'react-icons/tb';
import { TableSearchProps } from './types';
import { SEARCH_CONSTANTS } from './constants';
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
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (textMeasureRef.current && value) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [value]);

  const getSearchIconColor = () => {
    switch (searchState) {
      case 'idle':
        return 'text-slate-400';
      case 'typing':
        return 'text-slate-800';
      case 'found':
        return 'text-primary';
      case 'not-found':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  const SearchIcon = searchState === 'not-found' ? TbZoomCancel : TbZoom;

  return (
    <div className={`mb-4 relative ${className}`}>
      <div className="flex items-center">
        <SearchIcon
          className={`${getSearchIconColor()} transition-all duration-${SEARCH_CONSTANTS.ANIMATION_DURATION} ease-in-out ${
            hasValue
              ? `opacity-100 transform translate-x-0 ${
                  showNotFoundArrow ? 'scale-150' : 'scale-125'
                }`
              : 'opacity-0 transform -translate-x-2 scale-100'
          }`}
          style={{
            visibility: hasValue ? 'visible' : 'hidden',
            width: hasValue ? 'auto' : '0',
            minWidth: hasValue ? (showNotFoundArrow ? '40px' : '44px') : '0',
            marginLeft: hasValue && !showNotFoundArrow ? '-8px' : '0',
          }}
        />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-all duration-${SEARCH_CONSTANTS.ANIMATION_DURATION} ease-in-out ${
              hasValue ? (showNotFoundArrow ? 'pl-3' : 'pl-2.5') : 'pl-10'
            } ${
              searchState === 'not-found'
                ? `${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_SOFT_CLASS}`
                : `${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
            } rounded-lg bg-white`}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <SearchIcon
            className={`absolute top-3.5 ${getSearchIconColor()} transition-all duration-${SEARCH_CONSTANTS.ANIMATION_DURATION} ease-in-out ${
              hasValue
                ? 'opacity-0 transform translate-x-2 left-3'
                : 'opacity-100 transform translate-x-0 left-3'
            }`}
            style={{
              visibility: hasValue ? 'hidden' : 'visible',
            }}
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
                searchState === 'not-found' && value
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
