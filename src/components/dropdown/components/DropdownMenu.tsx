import React, { forwardRef, CSSProperties, RefObject } from 'react';
import MenuPortal from './menu/MenuPortal';
import MenuContent from './menu/MenuContent';
import SearchBar from './SearchBar';
import OptionItem from './OptionItem';
import EmptyState from './menu/EmptyState';
import { DropDirection } from '../constants';

interface DropdownMenuProps {
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  dropDirection: DropDirection;
  portalStyle: CSSProperties;
  searchList: boolean;
  withRadio?: boolean;
  searchTerm: string;
  searchState: string;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  highlightedIndex: number;
  isKeyboardNavigation: boolean;
  expandedId: string | null;
  value?: string;
  onAddNew?: (term: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDropdownKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  onSelect: (optionId: string) => void;
  onSetHighlightedIndex: (index: number) => void;
  onSetIsKeyboardNavigation: (isKeyboard: boolean) => void;
  onExpansion: (optionId: string, optionName: string, shouldExpand: boolean) => void;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  onScroll: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  scrollState: {
    isScrollable: boolean;
    reachedBottom: boolean;
    scrolledFromTop: boolean;
  };
}

const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  (
    {
      isOpen,
      isClosing,
      applyOpenStyles,
      dropDirection,
      portalStyle,
      searchList,
      withRadio,
      searchTerm,
      searchState,
      currentFilteredOptions,
      highlightedIndex,
      isKeyboardNavigation,
      expandedId,
      value,
      onAddNew,
      onSearchChange,
      onSearchKeyDown,
      onDropdownKeyDown,
      onSelect,
      onSetHighlightedIndex,
      onSetIsKeyboardNavigation,
      onExpansion,
      onMenuEnter,
      onMenuLeave,
      onScroll,
      buttonRef,
      searchInputRef,
      optionsContainerRef,
      leaveTimeoutRef,
      scrollState,
    },
    ref,
  ) => {
    const handleAddNewFromSearch = (term: string) => {
      onAddNew?.(term);
    };

    return (
      <MenuPortal
        ref={ref}
        isOpen={isOpen}
        isClosing={isClosing}
        applyOpenStyles={applyOpenStyles}
        dropDirection={dropDirection}
        portalStyle={portalStyle}
        onMouseEnter={onMenuEnter}
        onMouseLeave={onMenuLeave}
      >
        <div>
          {searchList && (
            <SearchBar
              ref={searchInputRef}
              searchTerm={searchTerm}
              searchState={searchState}
              isOpen={isOpen}
              highlightedIndex={highlightedIndex}
              currentFilteredOptions={currentFilteredOptions}
              onAddNew={handleAddNewFromSearch}
              onSearchChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              onFocus={() => {}}
              leaveTimeoutRef={leaveTimeoutRef}
            />
          )}
          <MenuContent scrollState={scrollState}>
            <div
              id="dropdown-options-list"
              ref={optionsContainerRef}
              role="listbox"
              tabIndex={-1}
              className="p-1 max-h-60 overflow-y-auto focus:outline-hidden"
              onScroll={onScroll}
              onKeyDown={!searchList ? onDropdownKeyDown : undefined}
            >
              {currentFilteredOptions.length > 0 ? (
                currentFilteredOptions.map((option, index) => (
                  <OptionItem
                    key={option.id}
                    option={option}
                    index={index}
                    isSelected={option.id === value}
                    isHighlighted={highlightedIndex === index}
                    isExpanded={expandedId === option.id}
                    withRadio={withRadio}
                    isKeyboardNavigation={isKeyboardNavigation}
                    buttonRef={buttonRef}
                    onSelect={onSelect}
                    onHighlight={(index) => {
                      onSetIsKeyboardNavigation(false);
                      onSetHighlightedIndex(index);
                    }}
                    onExpansion={onExpansion}
                    dropdownMenuRef={ref as RefObject<HTMLDivElement>}
                  />
                ))
              ) : (
                <EmptyState
                  searchState={searchState}
                  searchTerm={searchTerm}
                  hasAddNew={!!onAddNew}
                />
              )}
            </div>
          </MenuContent>
        </div>
      </MenuPortal>
    );
  },
);

DropdownMenu.displayName = 'DropdownMenu';

export default DropdownMenu;