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
}) => {
  // Edit state for editable mode
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [isHoveringDescription, setIsHoveringDescription] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null); // Add hover state for tabs
  
  // Refs for auto-focus
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div>
      {(title || description || button || secondaryButton || tertiaryButton || quaternaryButton) && (
        <div className="mt-0 mb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {renderEditableTitle()}
              {renderEditableDescription()}
            </div>
            {(button || secondaryButton || tertiaryButton || quaternaryButton) && (
              <div className="ml-4 flex items-center space-x-2">
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
          {showDivider && <div className="h-px bg-gradient-to-r from-gray-900 via-gray-800 to-transparent mb-1"></div>}
        </div>
      )}
      
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