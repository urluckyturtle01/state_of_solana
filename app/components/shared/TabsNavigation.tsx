"use client";

import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { ButtonPrimary, ButtonSecondary } from "./buttons";

export interface Tab {
  name: string;
  path: string;
  key: string;
  icon: string;
  viewBox?: string;
  strokeWidth?: number;
  closeable?: boolean;
}

interface ButtonConfig {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'primary' | 'secondary';
}

interface SearchConfig {
  placeholder?: string;
  onSearch: (term: string) => void;
  initialValue?: string;
}

interface VoteAccountSearchConfig {
  placeholder?: string;
  onSearch: (voteAccount: string) => void;
  initialValue?: string;
}

interface ValidatorInfoConfig {
  validatorName?: string;
  epoch?: string | number;
  commission?: string | number;
  loading?: boolean;
}

export interface TabsNavigationProps {
  tabs?: Tab[];
  activeTab?: string;
  title?: string;
  description?: string;
  staticInfo?: string;
  icon?: React.ReactNode;
  showDivider?: boolean;
  onTabClick?: (e: React.MouseEvent, tabKey: string) => void;
  onTabClose?: (tabKey: string) => void;
  button?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  tertiaryButton?: ButtonConfig;
  quaternaryButton?: ButtonConfig;
  editable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
  search?: SearchConfig;
  voteAccountSearch?: VoteAccountSearchConfig;
  validatorInfo?: ValidatorInfoConfig;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({
  tabs,
  activeTab,
  title,
  description,
  staticInfo,
  showDivider = true,
  onTabClick,
  onTabClose,
  button,
  secondaryButton,
  tertiaryButton,
  quaternaryButton,
  editable = false,
  onTitleChange,
  onDescriptionChange,
  search,
  voteAccountSearch,
  validatorInfo,
}) => {
  // Edit state for editable mode
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [isHoveringDescription, setIsHoveringDescription] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null); // Add hover state for tabs
  const [searchTerm, setSearchTerm] = useState(search?.initialValue || '');
  const [voteAccountSearchTerm, setVoteAccountSearchTerm] = useState(voteAccountSearch?.initialValue || '');
  
  // Refs for auto-focus
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Update vote account search term when initialValue changes
  useEffect(() => {
    if (voteAccountSearch?.initialValue !== undefined) {
      setVoteAccountSearchTerm(voteAccountSearch.initialValue);
    }
  }, [voteAccountSearch?.initialValue]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
      descriptionInputRef.current.select();
    }
  }, [isEditingDescription]);

  const handleTitleClick = () => {
    if (editable && title) {
      setEditTitle(title);
      setIsEditingTitle(true);
      setIsHoveringTitle(false);
    }
  };

  const handleDescriptionClick = () => {
    if (editable) {
      setEditDescription(description || "");
      setIsEditingDescription(true);
      setIsHoveringDescription(false);
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && onTitleChange) {
      onTitleChange(editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    if (onDescriptionChange) {
      onDescriptionChange(editDescription.trim() || "");
    }
    setIsEditingDescription(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setIsEditingDescription(false);
    }
  };

  const renderEditableTitle = () => {
    if (!editable || !title) {
      return title && <h1 className="text-lg font-medium text-gray-200">{title}</h1>;
    }

    if (isEditingTitle) {
      return (
        <input
          ref={titleInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          className="text-lg font-medium text-gray-200 bg-transparent border border-blue-500 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full max-w-md"
          placeholder="Title"
        />
      );
    }

    return (
      <h1
        className={`text-lg font-medium text-gray-200 cursor-pointer transition-all duration-200 ${
          isHoveringTitle 
            ? 'bg-gray-800/30 rounded px-2 py-0' 
            : ''
        }`}
        onMouseEnter={() => setIsHoveringTitle(true)}
        onMouseLeave={() => setIsHoveringTitle(false)}
        onClick={handleTitleClick}
      >
        {title}
      </h1>
    );
  };

  const renderEditableDescription = () => {
    if (!editable) {
      return (
        <>
          {description && <p className="text-gray-400 text-xs pb-2">{description}</p>}
          {staticInfo && <p className="text-gray-400 text-xs pb-2">{staticInfo}</p>}
        </>
      );
    }

    if (isEditingDescription) {
      return (
        <>
          <textarea
            ref={descriptionInputRef}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onBlur={handleDescriptionSave}
            onKeyDown={handleDescriptionKeyDown}
            className="text-gray-400 text-xs bg-transparent border border-blue-500 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full max-w-md resize-none"
            placeholder="Add a description..."
            rows={2}
          />
          {staticInfo && <p className="text-gray-400 text-xs pt-1">{staticInfo}</p>}
        </>
      );
    }

    return (
      <>
        {description ? (
          <p
            className={`text-gray-400 text-xs pb-2 cursor-pointer transition-all duration-200 ${
              isHoveringDescription 
                ? 'bg-gray-800/30 rounded px-2 py-0' 
                : ''
            }`}
            onMouseEnter={() => setIsHoveringDescription(true)}
            onMouseLeave={() => setIsHoveringDescription(false)}
            onClick={handleDescriptionClick}
          >
            {description}
          </p>
        ) : (
          <p
            className={`text-gray-500 text-xs pb-2 cursor-pointer italic transition-all duration-200 ${
              isHoveringDescription 
                ? 'bg-gray-800/30 rounded px-2 py-1' 
                : ''
            }`}
            onMouseEnter={() => setIsHoveringDescription(true)}
            onMouseLeave={() => setIsHoveringDescription(false)}
            onClick={handleDescriptionClick}
          >
            Add a description...
          </p>
        )}
        {staticInfo && <p className="text-gray-500 text-[11px] pb-2">{staticInfo}</p>}
      </>
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (search?.onSearch) {
      search.onSearch(value);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (search?.onSearch) {
      search.onSearch('');
    }
  };

  const handleVoteAccountSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVoteAccountSearchTerm(value);
  };

  const handleVoteAccountSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (voteAccountSearch?.onSearch) {
        voteAccountSearch.onSearch(voteAccountSearchTerm);
      }
    }
  };

  const handleVoteAccountSearchBlur = () => {
    // Trigger search on blur if value has changed
    if (voteAccountSearch?.onSearch && voteAccountSearchTerm !== voteAccountSearch.initialValue) {
      voteAccountSearch.onSearch(voteAccountSearchTerm);
    }
  };

  const renderVoteAccountSearchBar = () => {
    if (!voteAccountSearch) return null;

    return (
      <div className="mb-4 p-4 bg-gray-900/30 rounded-lg border border-gray-900">
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
          <label className="text-sm font-medium text-gray-500 whitespace-nowrap">
            Vote Account:
          </label>
          <input
            type="text"
            placeholder={voteAccountSearch.placeholder || "Enter vote account address..."}
            value={voteAccountSearchTerm}
            onChange={handleVoteAccountSearchChange}
            onKeyDown={handleVoteAccountSearchKeyDown}
            onBlur={handleVoteAccountSearchBlur}
            className={`bg-gray-900/50 text-sm px-3 py-1.5 rounded-sm border border-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-transparent max-w-[300px] flex-1 ${
              voteAccountSearchTerm ? 'text-gray-200' : 'text-gray-400'
            } placeholder-gray-500`}
          />
          
          {/* Validator Info Display */}
          {validatorInfo?.loading && (
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading...</span>
            </div>
          )}
          
          {validatorInfo && !validatorInfo.loading && validatorInfo.validatorName && (
            <span className="text-xs text-blue-300">{validatorInfo.validatorName}</span>
          )}
          
          {validatorInfo && !validatorInfo.loading && validatorInfo.epoch !== undefined && (
            <span className="text-xs text-purple-300">epoch: {validatorInfo.epoch}</span>
          )}
          
          {validatorInfo && !validatorInfo.loading && validatorInfo.commission !== undefined && (
            <span className="text-xs text-emerald-300">{validatorInfo.commission}% commission</span>
          )}
        </div>
      </div>
    );
  };

  const renderSearchField = () => {
    if (!search) return null;

    return (
      <div className="relative w-40 md:max-w-xs">
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <svg 
              className="h-3 w-3 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          
          {/* Input Field */}
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full pl-8 pr-7 py-1.5 text-xs border border-gray-700 rounded-md bg-gray-900/50 backdrop-blur text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            placeholder={search.placeholder || "Search..."}
          />
          
          {/* Clear Button */}
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-1.5 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {(title || description || button || secondaryButton || tertiaryButton || quaternaryButton) && (
        <div className="mt-0 mb-3">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-start justify-between">
            <div className="flex-1">
              {renderEditableTitle()}
              {renderEditableDescription()}
            </div>
            {(button || secondaryButton || tertiaryButton || quaternaryButton || search) && (
              <div className="ml-4 flex items-center space-x-3">
                {/* Search Field - Desktop */}
                {renderSearchField()}
                {tertiaryButton && (
                  <div>
                    {tertiaryButton.type === 'primary' ? (
                      <ButtonPrimary
                        onClick={tertiaryButton.onClick}
                        disabled={tertiaryButton.disabled}
                        className={tertiaryButton.className}
                        icon={tertiaryButton.icon}
                      >
                        {tertiaryButton.label}
                      </ButtonPrimary>
                    ) : (
                      <ButtonSecondary
                        onClick={tertiaryButton.onClick}
                        disabled={tertiaryButton.disabled}
                        className={tertiaryButton.className}
                      >
                        {tertiaryButton.icon && (
                          <span className="flex items-center mr-1">
                            {tertiaryButton.icon}
                          </span>
                        )}
                        {tertiaryButton.label}
                      </ButtonSecondary>
                    )}
                  </div>
                )}
                {secondaryButton && (
                  <div>
                    {secondaryButton.type === 'primary' ? (
                      <ButtonPrimary
                        onClick={secondaryButton.onClick}
                        disabled={secondaryButton.disabled}
                        className={secondaryButton.className}
                        icon={secondaryButton.icon}
                      >
                        {secondaryButton.label}
                      </ButtonPrimary>
                    ) : (
                      <ButtonSecondary
                        onClick={secondaryButton.onClick}
                        disabled={secondaryButton.disabled}
                        className={secondaryButton.className}
                      >
                        {secondaryButton.icon && (
                          <span className="flex items-center mr-1">
                            {secondaryButton.icon}
                          </span>
                        )}
                        {secondaryButton.label}
                      </ButtonSecondary>
                    )}
                  </div>
                )}
                {button && (
                  <div>
                    {button.type === 'secondary' ? (
                      <ButtonSecondary
                        onClick={button.onClick}
                        disabled={button.disabled}
                        className={button.className}
                      >
                        {button.icon && (
                          <span className="flex items-center mr-1">
                            {button.icon}
                          </span>
                        )}
                        {button.label}
                      </ButtonSecondary>
                    ) : (
                      <ButtonPrimary
                        onClick={button.onClick}
                        disabled={button.disabled}
                        className={button.className}
                        icon={button.icon}
                      >
                        {button.label}
                      </ButtonPrimary>
                    )}
                  </div>
                )}
                {quaternaryButton && (
                  <div>
                    <ButtonSecondary
                      onClick={quaternaryButton.onClick}
                      disabled={quaternaryButton.disabled}
                      className={quaternaryButton.className}
                    >
                      {quaternaryButton.icon && (
                        <span className="flex items-center mr-1">
                          {quaternaryButton.icon}
                        </span>
                      )}
                      {quaternaryButton.label}
                    </ButtonSecondary>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {renderEditableTitle()}
                {renderEditableDescription()}
              </div>
              {(button || secondaryButton || tertiaryButton || quaternaryButton) && (
                <div className="ml-4 flex items-center space-x-3">
                  {tertiaryButton && (
                    <div>
                      {tertiaryButton.type === 'primary' ? (
                        <ButtonPrimary
                          onClick={tertiaryButton.onClick}
                          disabled={tertiaryButton.disabled}
                          className={tertiaryButton.className}
                          icon={tertiaryButton.icon}
                        >
                          {tertiaryButton.label}
                        </ButtonPrimary>
                      ) : (
                        <ButtonSecondary
                          onClick={tertiaryButton.onClick}
                          disabled={tertiaryButton.disabled}
                          className={tertiaryButton.className}
                        >
                          {tertiaryButton.icon && (
                            <span className="flex items-center mr-1">
                              {tertiaryButton.icon}
                            </span>
                          )}
                          {tertiaryButton.label}
                        </ButtonSecondary>
                      )}
                    </div>
                  )}
                  {secondaryButton && (
                    <div>
                      {secondaryButton.type === 'primary' ? (
                        <ButtonPrimary
                          onClick={secondaryButton.onClick}
                          disabled={secondaryButton.disabled}
                          className={secondaryButton.className}
                          icon={secondaryButton.icon}
                        >
                          {secondaryButton.label}
                        </ButtonPrimary>
                      ) : (
                        <ButtonSecondary
                          onClick={secondaryButton.onClick}
                          disabled={secondaryButton.disabled}
                          className={secondaryButton.className}
                        >
                          {secondaryButton.icon && (
                            <span className="flex items-center mr-1">
                              {secondaryButton.icon}
                            </span>
                          )}
                          {secondaryButton.label}
                        </ButtonSecondary>
                      )}
                    </div>
                  )}
                  {button && (
                    <div>
                      {button.type === 'secondary' ? (
                        <ButtonSecondary
                          onClick={button.onClick}
                          disabled={button.disabled}
                          className={button.className}
                        >
                          {button.icon && (
                            <span className="flex items-center mr-1">
                              {button.icon}
                            </span>
                          )}
                          {button.label}
                        </ButtonSecondary>
                      ) : (
                        <ButtonPrimary
                          onClick={button.onClick}
                          disabled={button.disabled}
                          className={button.className}
                          icon={button.icon}
                        >
                          {button.label}
                        </ButtonPrimary>
                      )}
                    </div>
                  )}
                  {quaternaryButton && (
                    <div>
                      <ButtonSecondary
                        onClick={quaternaryButton.onClick}
                        disabled={quaternaryButton.disabled}
                        className={quaternaryButton.className}
                      >
                        {quaternaryButton.icon && (
                          <span className="flex items-center mr-1">
                            {quaternaryButton.icon}
                          </span>
                        )}
                        {quaternaryButton.label}
                      </ButtonSecondary>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Search Field - Mobile (below subheadline) */}
            {search && (
              <div className="mt-4 mb-4 flex justify-start">
                {renderSearchField()}
              </div>
            )}
          </div>
          
          {showDivider && <div className="h-px bg-gradient-to-r from-gray-900 via-gray-800 to-transparent mb-1"></div>}
        </div>
      )}
      
      {/* Vote Account Search Bar */}
      {renderVoteAccountSearchBar()}
      
      {tabs && tabs.length > 0 && (
        <div className="overflow-x-auto w-full">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-900/50 inline-block min-w-full">
            <div className="flex overflow-x-auto hide-scrollbar">
              {tabs?.map((tab) => {
                const isActive = activeTab === tab.key;
                const isHovered = hoveredTab === tab.key;
                
                return (
                  <div
                    key={tab.key}
                    className={`relative group flex items-center transition-all duration-200 ${
                      isActive 
                        ? "text-white bg-gray-900/40 border-b-2 border-emerald-500" 
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    onMouseEnter={() => setHoveredTab(tab.key)}
                    onMouseLeave={() => setHoveredTab(null)}
                  >
                    <Link
                      href={tab.path}
                      onClick={onTabClick ? (e) => onTabClick(e, tab.key) : undefined}
                      className={`flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap transition-all duration-200 ${
                        tab.closeable ? 'pr-1' : ''
                      }`}
                    >
                      {tab.icon && (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4" 
                          fill="none" 
                          viewBox={tab.viewBox || "0 0 24 24"}
                          stroke="currentColor" 
                          strokeWidth={tab.strokeWidth || 1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                        </svg>
                      )}
                      <span className="font-medium text-[13px]">{tab.name}</span>
                    </Link>
                    
                    {/* Chrome-style close button */}
                    {tab.closeable && onTabClose && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabClose(tab.key);
                        }}
                        className={`flex items-center justify-center w-5 h-5 mr-2 rounded-full transition-all duration-200 ${
                          isHovered || isActive
                            ? 'opacity-100 hover:bg-gray-700/50' 
                            : 'opacity-0'
                        }`}
                      >
                        <svg 
                          className="w-3 h-3 text-gray-400 hover:text-white" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M6 18L18 6M6 6l12 12" 
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default TabsNavigation; 