"use client";

import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const datePickerRef = useRef<DatePicker>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle date change - only close after both dates are selected
  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    onStartDateChange(start);
    onEndDateChange(end);
    
    // Only close if both dates are selected
    if (start && end) {
      setIsPickerOpen(false);
    }
  };

  // Custom header with year navigation - uses customHeaderCount from react-datepicker
  const renderCustomHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
    monthDate,
    customHeaderCount,
  }: any) => {
    const monthYear = format(monthDate || date, 'MMMM yyyy');
    const currentYear = (monthDate || date).getFullYear();
    const currentMonth = (monthDate || date).getMonth();
    
    // On mobile (single month), show all arrows
    // On desktop, customHeaderCount is 0 for first month, 1 for second month
    const showLeftArrows = isMobile || customHeaderCount === 0;
    const showRightArrows = isMobile || customHeaderCount === 1;
    
    return (
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem 0', minHeight: '2rem', width: '100%' }}>
        {/* Previous Year - Show on first month (desktop) or always (mobile) */}
        {showLeftArrows && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newDate = new Date(currentYear - 1, currentMonth);
              changeMonth(newDate.getMonth());
              changeYear(newDate.getFullYear());
            }}
            type="button"
            style={{
              position: 'absolute',
              left: '-0.25rem',
              width: '1.5rem',
              height: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#718096';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4M7 12L3 8L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Previous Month - Show on first month (desktop) or always (mobile) */}
        {showLeftArrows && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              decreaseMonth();
            }}
            disabled={prevMonthButtonDisabled}
            type="button"
            style={{
              position: 'absolute',
              left: '1rem',
              width: '1.5rem',
              height: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#718096';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Month/Year Display */}
        <span style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.6875rem', letterSpacing: '0.01em' }}>
          {monthYear}
        </span>

        {/* Next Month - Show on second month (desktop) or always (mobile) */}
        {showRightArrows && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              increaseMonth();
            }}
            disabled={nextMonthButtonDisabled}
            type="button"
            style={{
              position: 'absolute',
              right: '1rem',
              width: '1.5rem',
              height: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#718096';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Next Year - Show on second month (desktop) or always (mobile) */}
        {showRightArrows && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newDate = new Date(currentYear + 1, currentMonth);
              changeMonth(newDate.getMonth());
              changeYear(newDate.getFullYear());
            }}
            type="button"
            style={{
              position: 'absolute',
              right: '-0.25rem',
              width: '1.5rem',
              height: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#718096';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L10 8L6 12M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    );
  };

  // Create portal container on mount
  useEffect(() => {
    let portalRoot = document.getElementById('date-picker-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'date-picker-portal';
      document.body.appendChild(portalRoot);
    }
    
    return () => {
      // Cleanup on unmount if empty
      const portal = document.getElementById('date-picker-portal');
      if (portal && !portal.hasChildNodes()) {
        portal.remove();
      }
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        /* Portal container */
        #date-picker-portal {
          z-index: 99999 !important;
        }

        /* Compact minimal dark theme for react-datepicker */
        .react-datepicker {
          background-color:rgb(21, 24, 34) !important;
          border: 0.25px solid #2d3748 !important;
          border-radius: 0.5rem !important;
          font-family: inherit !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
          display: flex !important;
          padding: 0 !important;
        }
        
        .react-datepicker__header {
          background-color: transparent !important;
          border-bottom: 0.5px solid #2d3748 !important;
          padding: 0rem 0.5rem 0.125rem 0.5rem !important;
          border-radius: 0 !important;
        }
        
        .react-datepicker__current-month {
          color: #e2e8f0 !important;
          font-weight: 500 !important;
          font-size: 0.75rem !important;
          padding-bottom: 0.125rem !important;
        }
        
        .react-datepicker__day-names {
          margin-bottom: 0 !important;
          display: flex !important;
          justify-content: space-between !important;
        }
        
        .react-datepicker__day-name {
          color: #718096 !important;
          font-size: 0.625rem !important;
          font-weight: 500 !important;
          width: 1.625rem !important;
          height: 1.5rem !important;
          line-height: 1.5rem !important;
          margin: 0.03125rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        
        .react-datepicker__day {
          color: #cbd5e0 !important;
          width: 1.625rem !important;
          height: 1.625rem !important;
          line-height: 1.625rem !important;
          font-size: 0.6875rem !important;
          margin: 0.03125rem !important;
          border-radius: 0.25rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        
        .react-datepicker__day:hover {
          background-color: #2d3748 !important;
          color: #ffffff !important;
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--range-start,
        .react-datepicker__day--range-end {
          background-color: #6366f1 !important;
          color: #ffffff !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__day--in-selecting-range,
        .react-datepicker__day--in-range {
          background-color: #2d3350 !important;
          color: #a5b4fc !important;
        }
        
        .react-datepicker__day--keyboard-selected {
          background-color: #4f46e5 !important;
          color: #ffffff !important;
        }
        
        .react-datepicker__day--disabled {
          color: #4a5568 !important;
          cursor: not-allowed !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #4a5568 !important;
          opacity: 0.4 !important;
        }
        
        .react-datepicker__triangle {
          display: none !important;
        }
        
        .react-datepicker__navigation {
          display: none !important;
        }
        
        .react-datepicker__month-container {
          padding: 0.5rem !important;
          float: left !important;
          border-right: 0.5px solid #2d3748 !important;
          min-width: 220px !important;
        }
        
        .react-datepicker__month-container:last-child {
          border-right: none !important;
        }
        
        .react-datepicker__month {
          margin: 0 !important;
        }
        
        .react-datepicker__week {
          display: flex !important;
          justify-content: space-between !important;
        }
        
        .react-datepicker__day--today {
          background-color: transparent !important;
          border: 1px solid #6366f1 !important;
          color: #a5b4fc !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__day--today:hover {
          background-color: #2d3748 !important;
          border-color: #6366f1 !important;
        }
        
        .react-datepicker-popper {
          z-index: 10 !important;
          position: absolute !important;
        }

        /* Desktop positioning - below input, left-aligned */
        @media (min-width: 768px) {
          .react-datepicker-popper {
            top: 19% !important;
            left: 16% !important;
            margin-top: 0.5rem !important;
            transform: none !important;
          }
        }

        /* Custom input wrapper styles */
        .date-range-input-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          width: fit-content;
        }

        .date-range-input-wrapper input {
          cursor: pointer;
          padding-right: 2rem;
        }

        .date-input-icon {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6b7280;
        }
        
        /* Custom year navigation */
        .react-datepicker__year-dropdown-container {
          margin: 0 0.5rem !important;
        }

        /* Mobile positioning - portal with absolute */
        @media (max-width: 767px) {
          .react-datepicker-popper[data-placement] {
            top: 28% !important;  
            left: 40% !important;
            transform: translateX(-50%) !important;
            margin-top: 0.5rem !important;
          }
          
          .react-datepicker {
            max-width: calc(100vw - 2rem) !important;
          }
          
          .react-datepicker__month-container {
            min-width: auto !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="date-range-input-wrapper">
        {/* Start Date Input */}
        <div className="relative">
          <input
            type="text"
            value={startDate ? format(startDate, 'dd/MM/yy') : ''}
            onClick={() => setIsPickerOpen(true)}
            readOnly
            placeholder="DD/MM/YY"
            className="bg-gray-900/50 text-sm px-3 py-1.5 w-[100px] rounded-sm border border-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-transparent text-gray-200 placeholder-gray-500 cursor-pointer"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="date-input-icon h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>

        {/* Arrow Icon */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 text-gray-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M14 5l7 7m0 0l-7 7m7-7H3" 
          />
        </svg>

        {/* End Date Input */}
        <div className="relative">
          <input
            type="text"
            value={endDate ? format(endDate, 'dd/MM/yy') : ''}
            onClick={() => setIsPickerOpen(true)}
            readOnly
            placeholder="DD/MM/YY"
            className="bg-gray-900/50 text-sm px-3 py-1.5 w-[100px] rounded-sm border border-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-transparent text-gray-200 placeholder-gray-500 cursor-pointer"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="date-input-icon h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>

        {/* Hidden DatePicker for range selection */}
        <DatePicker
          ref={datePickerRef}
          selected={startDate}
          onChange={handleDateChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          monthsShown={isMobile ? 1 : 2}
          maxDate={new Date()}
          open={isPickerOpen}
          onClickOutside={() => setIsPickerOpen(false)}
          shouldCloseOnSelect={false}
          renderCustomHeader={renderCustomHeader}
          customInput={<div style={{ display: 'none' }} />}
          portalId="date-picker-portal"
          popperProps={{
            strategy: 'absolute'
          }}
        />
      </div>
    </>
  );
}

