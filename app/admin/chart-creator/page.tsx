"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_PAGES, CHART_TYPES, ChartFormData, ChartType, YAxisConfig, DualAxisConfig, PercentageFieldConfig } from '../types';
import { formDataToConfig, validateApiEndpoint, saveChartConfig, getAllChartConfigs } from '../utils';
import { formatTitle } from '../utils/formatTitle';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormCheckbox from '../components/FormCheckbox';
import FormTextarea from '../components/FormTextarea';
import Button from '../components/Button';
import Link from 'next/link';
import FormMultiInput from '../components/FormMultiInput';
import FormMultiInputWithType from '../components/FormMultiInputWithType';
import { MENU_OPTIONS, MENU_PAGES, getPagesForMenu, findMenuForPage } from '../config/menuPages';

export default function ChartCreatorPage() {
  const router = useRouter();
  
  // State to track if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editChartId, setEditChartId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ChartFormData>({
    title: '',
    subtitle: '',
    page: '' as any,
    section: '',
    chartType: '' as any,
    apiEndpoint: '',
    apiKey: '',
    isStacked: false,
    colorScheme: 'default',
    width: 2, // Default to half width
    dataMapping: {
      xAxis: '',
      yAxis: '',
      groupBy: '',
    }
  });
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // API validation state
  const [isValidatingApi, setIsValidatingApi] = useState(false);
  const [apiValidationResult, setApiValidationResult] = useState<{
    valid: boolean;
    message?: string;
    data?: any;
  } | null>(null);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successConfig, setSuccessConfig] = useState<{id: string, page: string} | null>(null);
  
  // Add state to track multi-input mode
  const [useMultipleFields, setUseMultipleFields] = useState({
    xAxis: false,
    yAxis: false
  });
  
  // Track dual axis configuration
  const [isDualAxis, setIsDualAxis] = useState(false);
  const [dualAxisConfig, setDualAxisConfig] = useState<DualAxisConfig>({
    leftAxisType: 'bar',
    rightAxisType: 'line',
    leftAxisFields: [],
    rightAxisFields: []
  });
  
  // Add state for filter configuration
  const [enableFilters, setEnableFilters] = useState({
    timeFilter: false,
    currencyFilter: false
  });
  
  // Add state for filter parameters
  const [filterParams, setFilterParams] = useState({
    timeFilter: {
      options: ['D', 'W', 'M', 'Q', 'Y'],
      paramName: 'Date Part'
    },
    currencyFilter: {
      options: ['USD', 'SOL', 'USDe'],
      paramName: 'currency'
    }
  });
  
  // Add state for currency filter type
  const [currencyFilterType, setCurrencyFilterType] = useState<'parameter' | 'columns'>('parameter');
  
  // Add state for currency column mappings
  const [currencyColumnMappings, setCurrencyColumnMappings] = useState<Record<string, string>>({
    'USD': '',
    'SOL': '',
    'USDe': ''
  });
  
  // Add state for time aggregation feature
  const [enableTimeAggregation, setEnableTimeAggregation] = useState(false);
  
  // Add state for tooltip total feature
  const [showTooltipTotal, setShowTooltipTotal] = useState(false);
  
  // Add state for percentage field configuration
  const [percentageFields, setPercentageFields] = useState<PercentageFieldConfig[]>([]);
  
  // Add state for menu selection
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  
  // Available pages based on the selected menu
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  
  // Check for edit mode and load chart data if needed
  useEffect(() => {
    // Access the URL search params to check for editId
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const editId = searchParams.get('editId');
      
      if (editId) {
        console.log(`Loading chart ${editId} for editing`);
        setIsEditMode(true);
        setEditChartId(editId);
        
        // Load the chart data
        const loadChartData = async () => {
          try {
            const allCharts = await getAllChartConfigs();
            const chartToEdit = allCharts.find(chart => chart.id === editId);
            
            if (chartToEdit) {
              console.log('Found chart to edit:', chartToEdit);
              
              // Set form data from the chart config
              setFormData({
                title: chartToEdit.title,
                subtitle: chartToEdit.subtitle || '',
                page: chartToEdit.page as any,
                section: chartToEdit.section || '',
                chartType: chartToEdit.chartType as any,
                apiEndpoint: chartToEdit.apiEndpoint,
                apiKey: chartToEdit.apiKey || '',
                isStacked: chartToEdit.isStacked || false,
                colorScheme: chartToEdit.colorScheme || 'default',
                width: chartToEdit.width || 2, // Default to half width if not set
                dataMapping: {
                  xAxis: chartToEdit.dataMapping.xAxis,
                  yAxis: typeof chartToEdit.dataMapping.yAxis === 'string' 
                    ? chartToEdit.dataMapping.yAxis 
                    : Array.isArray(chartToEdit.dataMapping.yAxis) 
                      ? (chartToEdit.dataMapping.yAxis as any) // Cast to any to avoid type issues
                      : [chartToEdit.dataMapping.yAxis as any], // Cast to any to avoid type issues
                  groupBy: chartToEdit.dataMapping.groupBy || '',
                },
                // Include dual axis config if it exists
                dualAxisConfig: chartToEdit.dualAxisConfig,
                // Include additional options if they exist
                additionalOptions: chartToEdit.additionalOptions
              });
              
              // Determine which menu this page belongs to using the helper function
              const menuId = findMenuForPage(chartToEdit.page);
              if (menuId) {
                setSelectedMenu(menuId);
              }
              
              // Check if it's a dual axis chart
              if (chartToEdit.chartType === 'dual-axis' && chartToEdit.dualAxisConfig) {
                console.log('Loading dual axis chart for editing:', chartToEdit.dualAxisConfig);
                setIsDualAxis(true);
                setDualAxisConfig(chartToEdit.dualAxisConfig);
              }
              
              // Check for multi-field inputs
              setUseMultipleFields({
                xAxis: Array.isArray(chartToEdit.dataMapping.xAxis),
                yAxis: Array.isArray(chartToEdit.dataMapping.yAxis),
              });
              
              // Check for filters
              if (chartToEdit.additionalOptions?.filters) {
                const filters = chartToEdit.additionalOptions.filters;
                
                // Check if filters exist
                const hasTimeFilter = filters.timeFilter !== undefined;
                const hasCurrencyFilter = filters.currencyFilter !== undefined;
                
                setEnableFilters({
                  timeFilter: hasTimeFilter,
                  currencyFilter: hasCurrencyFilter
                });
                
                if (hasTimeFilter && filters.timeFilter) {
                  setFilterParams(prev => ({
                    ...prev,
                    timeFilter: {
                      options: filters.timeFilter?.options || ['D', 'W', 'M', 'Q', 'Y'],
                      paramName: filters.timeFilter?.paramName || 'Date Part'
                    }
                  }));
                }
                
                if (hasCurrencyFilter && filters.currencyFilter) {
                  // Check if this is a column-based currency filter
                  if (filters.currencyFilter.type === 'field_switcher' && filters.currencyFilter.columnMappings) {
                    setCurrencyFilterType('columns');
                    setCurrencyColumnMappings(filters.currencyFilter.columnMappings);
                    setFilterParams(prev => ({
                      ...prev,
                      currencyFilter: {
                        options: filters.currencyFilter?.options || ['USD', 'SOL', 'USDe'],
                        paramName: 'currency' // Not used for column-based filters
                      }
                    }));
                  } else {
                    setCurrencyFilterType('parameter');
                  setFilterParams(prev => ({
                    ...prev,
                    currencyFilter: {
                      options: filters.currencyFilter?.options || ['USD', 'SOL', 'USDe'],
                      paramName: filters.currencyFilter?.paramName || 'currency'
                    }
                  }));
                  }
                }
              }
              
              // Check for time aggregation feature
              if (chartToEdit.additionalOptions?.enableTimeAggregation) {
                setEnableTimeAggregation(true);
              }
              
              // Check for tooltip total feature
              if (chartToEdit.additionalOptions?.showTooltipTotal) {
                setShowTooltipTotal(true);
              }
              
              // Check for percentage field configuration
              if (chartToEdit.additionalOptions?.percentageFields) {
                setPercentageFields(chartToEdit.additionalOptions.percentageFields);
              }
            } else {
              console.error(`Chart with ID ${editId} not found`);
              alert(`Chart with ID ${editId} not found`);
              // Redirect back to manage charts page
              router.push('/admin/manage-dashboard');
            }
          } catch (error) {
            console.error('Error loading chart for editing:', error);
            alert('Failed to load chart data for editing');
          }
        };
        
        loadChartData();
      }
    }
  }, [router]);
  
  // Update available pages when menu selection changes
  useEffect(() => {
    if (!selectedMenu) {
      setAvailablePages([]);
      return;
    }
    
    // Get pages for the selected menu using the helper function
    setAvailablePages(getPagesForMenu(selectedMenu));
  }, [selectedMenu]);
  
  // Debug: Monitor form data dual axis config changes
  useEffect(() => {
    console.log('FormData dual axis config changed:', formData.dualAxisConfig);
  }, [formData.dualAxisConfig]);
  
  // Handle menu selection change
  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = e.target.value;
    setSelectedMenu(menuId);
    
    // Reset page selection when menu changes with proper type casting
    setFormData(prev => ({
      ...prev,
      page: '' as any // Using 'any' to work around the strict type checking
    }));
    
    // Clear page-related errors
    if (errors.page) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated.page;
        return updated;
      });
    }
    
    // Mark menu as touched
    setTouched(prev => ({
      ...prev,
      menu: true
    }));
  };
  
  // Modified handleInputChange to handle string input directly
  const handleInputChange = (name: string, value: string) => {
    if (name.includes('.')) {
      // Handle nested properties (like dataMapping.xAxis)
      const [parent, child] = name.split('.');
      
      if (parent === 'dataMapping') {
        setFormData(prev => ({
          ...prev,
          dataMapping: {
            ...prev.dataMapping,
            [child]: value
          }
        }));
      }
    } else {
      // Handle simple properties
      if (name === 'chartType') {
        // Auto-check isStacked for stacked chart types
        const chartType = value as ChartType;
        const wasStackedChart = (prev: ChartFormData) => prev.chartType === 'stacked-bar' || prev.chartType === 'stacked-area';
        const isStackedChart = chartType === 'stacked-bar' || chartType === 'stacked-area';
        
        // If switching to stacked bar, enable multi-input for y-axis by default
        if (chartType === 'stacked-bar' && !useMultipleFields.yAxis) {
          setUseMultipleFields(prev => ({
            ...prev,
            yAxis: true
          }));
          
          // Convert current y-axis to array if it's a string
          setFormData(prev => {
            const currentYAxis = prev.dataMapping.yAxis;
            return {
              ...prev,
              chartType,
              isStacked: isStackedChart || (prev.isStacked && !wasStackedChart(prev)),
              dataMapping: {
                ...prev.dataMapping,
                yAxis: typeof currentYAxis === 'string' && currentYAxis ? [currentYAxis] : (Array.isArray(currentYAxis) ? currentYAxis : [])
              }
            };
          });
        } else {
          setFormData(prev => ({
            ...prev,
            [name]: chartType,
            // If switching from stacked to non-stacked, turn off isStacked
            // If switching to stacked, turn on isStacked
            isStacked: isStackedChart || (prev.isStacked && !wasStackedChart(prev))
          }));
        }
      } else if (name === 'width') {
        // Handle width as a number
        setFormData(prev => ({
          ...prev,
          [name]: parseInt(value, 10)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Add a handler for multi-input fields
  const handleMultiInputChange = (fieldName: string, values: string[]) => {
    const [parent, child] = fieldName.split('.');
    
    if (parent === 'dataMapping') {
      setFormData(prev => {
        // Create a properly typed update for dataMapping
        const updatedDataMapping = { ...prev.dataMapping };
        
        // Handle x and y axis separately to maintain proper typing
        if (child === 'xAxis') {
          // xAxis can only be string or string[]
          updatedDataMapping.xAxis = values.length === 1 ? values[0] : values;
        } else if (child === 'yAxis') {
          // yAxis can be string, string[] or YAxisConfig[]
          updatedDataMapping.yAxis = values.length === 1 ? values[0] : values;
        } else if (child === 'groupBy') {
          // groupBy is a string or undefined
          updatedDataMapping.groupBy = values.length === 1 ? values[0] : undefined;
        }
        
        return {
          ...prev,
          dataMapping: updatedDataMapping
        };
      });
    }
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    // Clear error if exists
    if (errors[fieldName]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };
  
  // Add a handler for multi-input fields with chart type
  const handleMultiInputWithTypeChange = (fieldName: string, values: YAxisConfig[]) => {
    const [parent, child] = fieldName.split('.');
    
    console.log('handleMultiInputWithTypeChange called with:', fieldName, values);
    
    if (parent === 'dataMapping' && child === 'yAxis') {
      // When in dual-axis mode, we'll update both the dataMapping.yAxis
      // and the dualAxisConfig arrays based on the rightAxis flag
      if (isDualAxis) {
        // Update the dualAxisConfig with the new assignments
        const leftFields = values.filter(val => !val.rightAxis).map(val => val.field);
        const rightFields = values.filter(val => val.rightAxis).map(val => val.field);
        
        const updatedDualAxisConfig = {
          leftAxisType: dualAxisConfig.leftAxisType,
          rightAxisType: dualAxisConfig.rightAxisType,
          leftAxisFields: leftFields,
          rightAxisFields: rightFields
        };
        
        setDualAxisConfig(updatedDualAxisConfig);
        
        // CRITICAL FIX: Also update formData.dualAxisConfig for S3 sync
        setFormData(prev => ({
          ...prev,
          dataMapping: {
            ...prev.dataMapping,
            yAxis: values
          },
          dualAxisConfig: updatedDualAxisConfig
        }));
      } else {
        setFormData(prev => {
          // Create a properly typed update for dataMapping
          const updatedDataMapping = { ...prev.dataMapping };
          
          // Set the yAxis value ensuring we maintain the correct type
          updatedDataMapping.yAxis = values;
          
          return {
            ...prev,
            dataMapping: updatedDataMapping
          };
        });
      }
    }
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    // Clear error if exists
    if (errors[fieldName]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };
  
  // Toggle between single and multi-input modes
  const toggleMultiInput = (field: 'xAxis' | 'yAxis') => {
    setUseMultipleFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // When switching to multi-input, convert string to array
    // When switching to single input, keep only the first value if array
    setFormData(prev => {
      const currentValue = prev.dataMapping[field];
      
      // Define a properly typed return value for the dataMapping update
      let updatedDataMapping = {...prev.dataMapping};
      
      if (!useMultipleFields[field]) {
        // Switching to multi-input
        if (field === 'yAxis') {
          // For Y-axis, create YAxisConfig objects with default chart type = 'bar'
          let newYValue: YAxisConfig[];
          
          if (typeof currentValue === 'string' && currentValue) {
            // Initialize with bar type but allow user to toggle
            const unit = prev.dataMapping.yAxisUnit || ''; // Preserve the single field unit
            newYValue = [{ field: currentValue, type: 'bar' as const, unit }];
          } else if (Array.isArray(currentValue) && currentValue.length > 0) {
            // Convert simple string array to YAxisConfig array
            if (typeof currentValue[0] === 'string') {
              const unit = prev.dataMapping.yAxisUnit || ''; // Preserve the single field unit
              newYValue = (currentValue as string[]).map(field => ({ field, type: 'bar' as const, unit }));
            } else {
              // Already in right format
              newYValue = currentValue as YAxisConfig[];
            }
          } else {
            newYValue = [];
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            yAxis: newYValue,
            yAxisUnit: undefined // Clear the single-field unit
          };
        } else {
          // For X-axis, just use string array
          const newXValue: string[] = typeof currentValue === 'string' && currentValue ? [currentValue] : [];
          updatedDataMapping = {
            ...updatedDataMapping,
            xAxis: newXValue
          };
        }
      } else {
        // Switching to single input
        if (field === 'yAxis') {
          // Handle Y-axis case
          let newYValue: string = '';
          let unit: string | undefined = undefined;
          
          if (Array.isArray(currentValue) && currentValue.length > 0) {
            const firstItem = currentValue[0];
            if (typeof firstItem === 'object' && 'field' in firstItem) {
              // It's a YAxisConfig object
              const firstConfig = firstItem as YAxisConfig;
              newYValue = firstConfig.field;
              unit = firstConfig.unit; // Get the unit from the first YAxisConfig
            } else if (typeof firstItem === 'string') {
              // It's a string
              newYValue = firstItem;
            }
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            yAxis: newYValue,
            yAxisUnit: unit
          };
        } else {
          // Handle X-axis case
          let newXValue: string = '';
          
          if (Array.isArray(currentValue) && currentValue.length > 0) {
            newXValue = currentValue[0] as string;
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            xAxis: newXValue
          };
        }
      }
      
      // Return updated form data with the updated dataMapping
      return {
        ...prev,
        dataMapping: updatedDataMapping
      };
    });
  };
  
  // Toggle filter checkboxes
  const toggleFilter = (filterName: keyof typeof enableFilters) => {
    setEnableFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
    
    // Add appropriate filter configuration to additionalOptions when enabled
    setFormData(prev => {
      const additionalOptions = prev.additionalOptions || {};
      
      if (!enableFilters[filterName]) {
        // Enabling the filter, add configuration
        if (filterName === 'currencyFilter') {
          // For currency filter, check the type
          const currencyFilterConfig = currencyFilterType === 'columns' ? {
            ...filterParams[filterName],
            type: 'field_switcher' as const,
            columnMappings: currencyColumnMappings
          } : filterParams[filterName];
          
          additionalOptions.filters = {
            ...(additionalOptions.filters || {}),
            [filterName]: currencyFilterConfig
          };
        } else {
        additionalOptions.filters = {
          ...(additionalOptions.filters || {}),
          [filterName]: filterParams[filterName]
        };
        }
      } else {
        // Disabling the filter, remove configuration
        if (additionalOptions.filters) {
          const { [filterName]: _, ...remainingFilters } = additionalOptions.filters;
          additionalOptions.filters = Object.keys(remainingFilters).length > 0 ? remainingFilters : undefined;
        }
      }
      
      return {
        ...prev,
        additionalOptions: Object.keys(additionalOptions).length > 0 ? additionalOptions : {}
      };
    });
  };
  
  // Handle filter parameter changes
  const handleFilterParamChange = (
    filterName: keyof typeof filterParams,
    field: keyof typeof filterParams.timeFilter,
    value: string | string[]
  ) => {
    // Update filter params first
    setFilterParams(prev => {
      const updatedParams = {
      ...prev,
      [filterName]: {
        ...prev[filterName],
        [field]: value
      }
      };
    
      // Update form data with the complete filter configuration if filter is enabled
    if (enableFilters[filterName]) {
        setFormData(formPrev => ({
          ...formPrev,
          additionalOptions: {
            ...formPrev.additionalOptions,
            filters: {
              ...formPrev.additionalOptions?.filters,
          [filterName]: {
                paramName: updatedParams[filterName].paramName,
                options: updatedParams[filterName].options
          }
            }
          }
        }));
      }
        
      return updatedParams;
      });
  };

  // Handle currency filter type change
  const handleCurrencyFilterTypeChange = (type: 'parameter' | 'columns') => {
    setCurrencyFilterType(type);
    
    // Update form data if currency filter is enabled
    if (enableFilters.currencyFilter) {
      const currencyFilterConfig = type === 'columns' ? {
        ...filterParams.currencyFilter,
        type: 'field_switcher' as const,
        columnMappings: currencyColumnMappings
      } : filterParams.currencyFilter;
      
      setFormData(prev => ({
        ...prev,
        additionalOptions: {
          ...prev.additionalOptions,
          filters: {
            ...prev.additionalOptions?.filters,
            currencyFilter: currencyFilterConfig
          }
        }
      }));
    }
  };

  // Handle currency column mapping changes
  const handleCurrencyColumnMappingChange = (currency: string, columnName: string) => {
    setCurrencyColumnMappings(prev => {
      const updatedMappings = {
        ...prev,
        [currency]: columnName
      };
      
      // Update form data if currency filter is enabled and type is columns
      if (enableFilters.currencyFilter && currencyFilterType === 'columns') {
        setFormData(formPrev => ({
          ...formPrev,
          additionalOptions: {
            ...formPrev.additionalOptions,
            filters: {
              ...formPrev.additionalOptions?.filters,
              currencyFilter: {
                ...filterParams.currencyFilter,
                type: 'field_switcher' as const,
                columnMappings: updatedMappings
              }
            }
          }
        }));
      }
      
      return updatedMappings;
      });
  };
  
  // Toggle dual axis mode
  const toggleDualAxis = () => {
    // Only allow toggling dual axis when we have multiple y-axis fields
    if (!useMultipleFields.yAxis) {
      alert('Please enable multiple y-axis fields first to use dual axis');
      return;
    }
    
    const newIsDualAxis = !isDualAxis;
    setIsDualAxis(newIsDualAxis);
    
    if (newIsDualAxis) {
      // Initialize dual axis configuration based on current fields
      const yAxisFields = Array.isArray(formData.dataMapping.yAxis) 
        ? formData.dataMapping.yAxis 
        : formData.dataMapping.yAxis ? [formData.dataMapping.yAxis] : [];
      
      // Extract string fields from YAxisConfig if needed
      const fieldNames = yAxisFields.map(field => 
        typeof field === 'string' ? field : field.field
      );
      
      // By default, put first field on left axis, rest on right
      const leftFields = fieldNames.length > 0 ? [fieldNames[0]] : [];
      const rightFields = fieldNames.length > 1 ? fieldNames.slice(1) : [];
      
      const initialDualAxisConfig = {
        leftAxisType: 'bar' as const,
        rightAxisType: 'line' as const,
        leftAxisFields: leftFields,
        rightAxisFields: rightFields
      };
      
      setDualAxisConfig(initialDualAxisConfig);
      
      // Also update form data immediately
      setFormData(prevFormData => ({
        ...prevFormData,
        chartType: 'dual-axis',
        dualAxisConfig: initialDualAxisConfig
      }));
      
      // Add rightAxis flags to the YAxisConfig objects
      if (Array.isArray(formData.dataMapping.yAxis) && typeof formData.dataMapping.yAxis[0] !== 'string') {
        const updatedYAxisConfigs = (formData.dataMapping.yAxis as YAxisConfig[]).map((config, index) => ({
          ...config,
          rightAxis: index > 0 // First field on left, rest on right by default
        }));
        
        setFormData(prev => ({
          ...prev,
          dataMapping: {
            ...prev.dataMapping,
            yAxis: updatedYAxisConfigs
          }
        }));
      }
    } else {
      // Reset to standard chart type when disabling
      setFormData(prev => {
        // Remove rightAxis flags from YAxisConfig objects when disabling dual axis
        let updatedYAxis = prev.dataMapping.yAxis;
        if (Array.isArray(updatedYAxis) && typeof updatedYAxis[0] !== 'string') {
          updatedYAxis = (updatedYAxis as YAxisConfig[]).map(config => ({
            field: config.field,
            type: config.type
          }));
        }
        
        return {
          ...prev,
          chartType: 'bar',
          dualAxisConfig: undefined, // Clear dual axis config
          dataMapping: {
            ...prev.dataMapping,
            yAxis: updatedYAxis
          }
        };
      });
      
      // Also clear the dual axis config state
      setDualAxisConfig({
        leftAxisType: 'bar',
        rightAxisType: 'line',
        leftAxisFields: [],
        rightAxisFields: []
      });
    }
  };

  // Update dual axis configuration
  const updateDualAxisConfig = (
    key: keyof DualAxisConfig, 
    value: string | string[]
  ) => {
    const newDualAxisConfig = {
      ...dualAxisConfig,
      [key]: value
    };
    
    // Update both state and form data synchronously
    setDualAxisConfig(newDualAxisConfig);
    
    setFormData(prev => ({
      ...prev,
      dualAxisConfig: newDualAxisConfig
    }));
    
    console.log(`Updated dual axis config: ${key} = ${value}`, newDualAxisConfig);
    console.log('Updated form data dual axis config:', newDualAxisConfig);
  };

  // Move fields between axes
  const moveFieldBetweenAxes = (field: string, destination: 'left' | 'right') => {
    setDualAxisConfig(prev => {
      let newLeftFields = [...prev.leftAxisFields];
      let newRightFields = [...prev.rightAxisFields];
      
      if (destination === 'left') {
        // Remove from right and add to left
        newRightFields = newRightFields.filter(f => f !== field);
        if (!newLeftFields.includes(field)) {
          newLeftFields.push(field);
        }
      } else {
        // Remove from left and add to right
        newLeftFields = newLeftFields.filter(f => f !== field);
        if (!newRightFields.includes(field)) {
          newRightFields.push(field);
        }
      }
      
      return {
        ...prev,
        leftAxisFields: newLeftFields,
        rightAxisFields: newRightFields
      };
    });
    
    // Update form data with the new field configurations
    setFormData(prev => ({
      ...prev,
      dualAxisConfig: {
        ...prev.dualAxisConfig || dualAxisConfig,
        leftAxisFields: destination === 'left' 
          ? [...dualAxisConfig.leftAxisFields.filter(f => f !== field), field]
          : dualAxisConfig.leftAxisFields.filter(f => f !== field),
        rightAxisFields: destination === 'right'
          ? [...dualAxisConfig.rightAxisFields.filter(f => f !== field), field]
          : dualAxisConfig.rightAxisFields.filter(f => f !== field)
      }
    }));
  };
  
  // Toggle time aggregation feature
  const toggleTimeAggregation = () => {
    const newValue = !enableTimeAggregation;
    setEnableTimeAggregation(newValue);
    
    // If enabling time aggregation, automatically enable time filter for client-side processing
    if (newValue && !enableFilters.timeFilter) {
      setEnableFilters(prev => ({
        ...prev,
        timeFilter: true
      }));
      
      // Set default time filter parameters for aggregation
      setFilterParams(prev => ({
        ...prev,
        timeFilter: {
          options: ['D', 'W', 'M', 'Q', 'Y'],
          paramName: 'Date Part'
        }
      }));
    }
    
    // Note: Don't disable time filter automatically when disabling time aggregation
    // as the user might still want server-side time filtering
  };
  
  // Toggle tooltip total feature
  const toggleTooltipTotal = () => {
    const newValue = !showTooltipTotal;
    setShowTooltipTotal(newValue);
    
    // Update form data with tooltip total setting
    setFormData(prev => ({
      ...prev,
      additionalOptions: {
        ...prev.additionalOptions,
        showTooltipTotal: newValue
      }
    }));
  };
  
  // Add percentage field configuration
  const addPercentageField = () => {
    const newPercentageField: PercentageFieldConfig = {
      field: '',
      numeratorField: '',
      denominatorField: ''
    };
    setPercentageFields(prev => [...prev, newPercentageField]);
  };
  
  // Update percentage field configuration
  const updatePercentageField = (index: number, updates: Partial<PercentageFieldConfig>) => {
    setPercentageFields(prev => 
      prev.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    );
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      additionalOptions: {
        ...prev.additionalOptions,
        percentageFields: percentageFields.map((field, i) => 
          i === index ? { ...field, ...updates } : field
        )
      }
    }));
  };
  
  // Remove percentage field configuration
  const removePercentageField = (index: number) => {
    const updatedFields = percentageFields.filter((_, i) => i !== index);
    setPercentageFields(updatedFields);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      additionalOptions: {
        ...prev.additionalOptions,
        percentageFields: updatedFields.length > 0 ? updatedFields : undefined
      }
    }));
  };
  
  // Get available fields for percentage configuration
  const getAvailableFields = (): string[] => {
    const fields: string[] = [];
    
    // Add Y-axis fields
    if (Array.isArray(formData.dataMapping.yAxis)) {
      formData.dataMapping.yAxis.forEach(field => {
        if (typeof field === 'string') {
          fields.push(field);
        } else if (field && typeof field === 'object' && 'field' in field) {
          fields.push((field as YAxisConfig).field);
        }
      });
    } else if (formData.dataMapping.yAxis) {
      if (typeof formData.dataMapping.yAxis === 'string') {
        fields.push(formData.dataMapping.yAxis);
      } else if (typeof formData.dataMapping.yAxis === 'object' && 'field' in formData.dataMapping.yAxis) {
        fields.push((formData.dataMapping.yAxis as YAxisConfig).field);
      }
    }
    
    return fields.filter(field => field.trim() !== '');
  };
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.title) newErrors.title = 'Title is required';
    if (!selectedMenu) newErrors.menu = 'Menu option is required';
    if (!formData.page) newErrors.page = 'Page is required';
    if (!formData.chartType) newErrors.chartType = 'Chart type is required';
    if (!formData.apiEndpoint) newErrors.apiEndpoint = 'API endpoint is required';
    
    // For x-axis validation
    const xAxisValue = formData.dataMapping.xAxis;
    if (!xAxisValue || (Array.isArray(xAxisValue) && xAxisValue.length === 0)) {
      newErrors['dataMapping.xAxis'] = 'X-axis mapping is required';
    }
    
    // For y-axis validation
    const yAxisValue = formData.dataMapping.yAxis;
    if (!yAxisValue || (Array.isArray(yAxisValue) && yAxisValue.length === 0)) {
      newErrors['dataMapping.yAxis'] = 'Y-axis mapping is required';
    }
    
    // Additional validation for stacked charts
    if (formData.isStacked) {
      const yAxisArray = Array.isArray(yAxisValue) ? yAxisValue : [yAxisValue];
      
      // For stacked charts, either need groupBy OR multiple y-axis fields
      if (!formData.dataMapping.groupBy && (!Array.isArray(yAxisValue) || yAxisValue.length < 2)) {
        newErrors['dataMapping.yAxis'] = 'Stacked charts require either a Group By field or multiple Y-axis fields';
      }
    }
    
    // Validation for filters
    const enabledFilterCount = Object.values(enableFilters).filter(Boolean).length;
    
    // Check for empty filter parameters
    Object.entries(enableFilters).forEach(([filterName, isEnabled]) => {
      if (isEnabled) {
        const typedFilterName = filterName as keyof typeof filterParams;
        const filter = filterParams[typedFilterName];
        
        if (!filter.paramName) {
          newErrors[`${filterName}ParamName`] = `Parameter name is required for ${filterName}`;
        }
        
        if (!filter.options || filter.options.length === 0) {
          newErrors[`${filterName}Options`] = `At least one option is required for ${filterName}`;
        }
      }
    });
    
    // API validation
    if (formData.apiEndpoint && !apiValidationResult?.valid) {
      newErrors.apiEndpoint = 'Please validate the API endpoint first';
    }
    
    setErrors(newErrors);
    return newErrors;
  };
  
  // Handle API validation
  const handleValidateApi = async () => {
    if (!formData.apiEndpoint) {
      setErrors(prev => ({
        ...prev,
        apiEndpoint: 'API endpoint is required'
      }));
      return;
    }
    
    // Check for common parameter name case issues before validation
    const paramCaseWarnings = checkParameterCaseSensitivity();
    if (paramCaseWarnings.length > 0) {
      if (!confirm(`Potential parameter case issues detected:\n\n${paramCaseWarnings.join('\n')}\n\nDo you want to continue with validation anyway?`)) {
        return;
      }
    }
    
    setIsValidatingApi(true);
    setApiValidationResult(null);
    
    try {
      // Create parameters object from enabled filters
      const testParameters: Record<string, any> = {};
      
      // Add parameters from all enabled filters for comprehensive validation
      if (enableFilters.timeFilter && filterParams.timeFilter.options.length > 0) {
        testParameters[filterParams.timeFilter.paramName] = filterParams.timeFilter.options[0];
      }
      
      if (enableFilters.currencyFilter && filterParams.currencyFilter.options.length > 0) {
        testParameters[filterParams.currencyFilter.paramName] = filterParams.currencyFilter.options[0];
      }
      
      // Check if we have multiple filters enabled for validation warning
      const enabledFilterCount = Object.values(enableFilters).filter(Boolean).length;
      const hasMultipleFilters = enabledFilterCount > 1;
      
      // Only pass parameters if we have some
      const hasParameters = Object.keys(testParameters).length > 0;
      
      // Validate the API endpoint with parameters
      const result = await validateApiEndpoint(
        formData.apiEndpoint, 
        formData.apiKey,
        hasParameters ? testParameters : undefined
      );
      
      setApiValidationResult(result);
      
      if (!result.valid) {
        setErrors(prev => ({
          ...prev,
          apiEndpoint: result.message || 'Invalid API endpoint'
        }));
      } else {
        // If we have multiple filters enabled, do an additional validation to test filter combinations
        if (hasMultipleFilters) {
          await validateApiWithFilters(result);
        } else if (result.data?.columns) {
          // Auto-populate dataMapping fields if we received column data
          const columns = result.data.columns;
          const dateColumns = columns.filter((col: string) => 
            col.toLowerCase().includes('date') || 
            col.toLowerCase().includes('month') || 
            col.toLowerCase().includes('time')
          );
          
          const numericColumns = columns.filter((col: string) => 
            !dateColumns.includes(col) && 
            (col.toLowerCase().includes('revenue') || 
             col.toLowerCase().includes('amount') || 
             col.toLowerCase().includes('value') || 
             col.toLowerCase().includes('count'))
          );
          
          const categoryColumns = columns.filter((col: string) => 
            !dateColumns.includes(col) && 
            !numericColumns.includes(col) && 
            (col.toLowerCase().includes('platform') || 
             col.toLowerCase().includes('category') || 
             col.toLowerCase().includes('segment') || 
             col.toLowerCase().includes('type'))
          );
          
          // Auto-set data mapping if we can make reasonable guesses
          if (dateColumns.length > 0 && numericColumns.length > 0) {
            setFormData(prev => ({
              ...prev,
              dataMapping: {
                xAxis: dateColumns[0],
                yAxis: numericColumns[0],
                groupBy: categoryColumns.length > 0 ? categoryColumns[0] : prev.dataMapping.groupBy
              }
            }));
          }
        }
      }
    } catch (error) {
      setApiValidationResult({
        valid: false,
        message: `Error validating API: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsValidatingApi(false);
    }
  };
  
  // New function to validate multiple filter combinations
  const validateApiWithFilters = async (initialResult: any) => {
    try {
      // Test multiple filter combinations to ensure they work together
      const enabledFilters = [];
      
      if (enableFilters.timeFilter) enabledFilters.push('timeFilter');
      if (enableFilters.currencyFilter) enabledFilters.push('currencyFilter');
      
      // Only proceed if we have multiple filters
      if (enabledFilters.length <= 1) return;
      
      // Create a test combination using the first option of each filter
      const combinedParameters: Record<string, any> = {};
      
      enabledFilters.forEach(filterName => {
        const filter = filterParams[filterName as keyof typeof filterParams];
        if (filter.options.length > 0) {
          combinedParameters[filter.paramName] = filter.options[0];
        }
      });
      
      // Add a note to the initial result about testing combinations
      if (initialResult && initialResult.valid) {
        setApiValidationResult({
          valid: true,
          message: (initialResult.message || 'API validated successfully.') + ' Testing filter combinations...',
          data: initialResult.data
        });
      }
      
      // Test the API with the combined parameters
      const combinedResult = await validateApiEndpoint(
        formData.apiEndpoint,
        formData.apiKey,
        combinedParameters
      );
      
      // Update the validation result with combination test results
      if (combinedResult.valid) {
        setApiValidationResult({
          valid: true,
          message: (initialResult.message || 'API validated successfully.') + ' All filter combinations validated successfully!',
          data: combinedResult.data || initialResult.data
        });
      } else {
        // If the combination fails, warn the user but don't invalidate the entire setup
        setApiValidationResult({
          valid: initialResult.valid,
          message: (initialResult.message || 'API validated successfully.') + ` Warning: Filter combination test failed - ${combinedResult.message}. You may need to adjust your filter parameters.`,
          data: initialResult.data
        });
      }
    } catch (error) {
      console.error('Error validating filter combinations:', error);
      // Don't update the result - we'll keep the initial successful validation
    }
  };
  
  // New function to check parameter case sensitivity against common conventions
  const checkParameterCaseSensitivity = (): string[] => {
    const warnings: string[] = [];
    
    // Common parameter name conventions to check against
    const commonConventions = {
      currency: ['currency', 'currencies'],
      datePart: ['date_part', 'datepart', 'date part'],
    };
    
    // Check each enabled filter
    if (enableFilters.currencyFilter) {
      const paramName = filterParams.currencyFilter.paramName;
      if (paramName && !commonConventions.currency.includes(paramName.toLowerCase())) {
        if (commonConventions.currency.some(conv => conv.toLowerCase() === paramName.toLowerCase())) {
          warnings.push(`"${paramName}" might have incorrect casing. Common format is "currency" (all lowercase).`);
        }
      }
    }
    
    if (enableFilters.timeFilter) {
      const paramName = filterParams.timeFilter.paramName;
      // Special case for TopLedger API which uses "Date Part" with capital letters
      if (paramName && paramName !== "Date Part" && !commonConventions.datePart.includes(paramName.toLowerCase())) {
        if (commonConventions.datePart.some(conv => conv.toLowerCase() === paramName.toLowerCase())) {
          warnings.push(`"${paramName}" might have incorrect casing. TopLedger API typically uses "Date Part" (with capitals).`);
        }
      }
    }
    
    return warnings;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update the submit error state
    setSubmitError(null);
    
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Form data before submission:', formData);
      console.log('isDualAxis flag:', isDualAxis);
      console.log('dualAxisConfig state:', dualAxisConfig);
      console.log('formData.dualAxisConfig:', formData.dualAxisConfig);
      
      // Create chart config from form data
      let chartConfig = formDataToConfig(formData, isDualAxis);
      
      console.log('Chart config after formDataToConfig:', chartConfig);
      
      // If in edit mode, preserve the original chart ID
      if (isEditMode && editChartId) {
        const existingChart = (await getAllChartConfigs()).find(c => c.id === editChartId);
        chartConfig = {
          ...chartConfig,
          id: editChartId,
          // Preserve creation date
          createdAt: existingChart?.createdAt || chartConfig.createdAt
        };
      }
      
      // Add dual axis config
      if (isDualAxis && formData.dualAxisConfig) {
        console.log('Adding dual axis config to chart (redundant check):', formData.dualAxisConfig);
        chartConfig = {
          ...chartConfig,
          chartType: 'dual-axis',
          dualAxisConfig: formData.dualAxisConfig
        };
      }
      
      console.log('Final chart config before API call:', chartConfig);
      console.log('Final chart config dualAxisConfig:', chartConfig.dualAxisConfig);
      
      // Add additionalOptions for time aggregation, tooltip total, percentage fields, and filters
      if (enableTimeAggregation || showTooltipTotal || percentageFields.length > 0 || enableFilters.timeFilter || enableFilters.currencyFilter) {
        chartConfig = {
          ...chartConfig,
          additionalOptions: {
            ...(chartConfig.additionalOptions || {}),
            ...(enableTimeAggregation && { enableTimeAggregation: true }),
            ...(showTooltipTotal && { showTooltipTotal: true }),
            ...(percentageFields.length > 0 && { percentageFields: percentageFields }),
          }
        };
        
        // Add filter configurations
        if (enableFilters.timeFilter || enableFilters.currencyFilter) {
          chartConfig.additionalOptions!.filters = {};
          
          if (enableFilters.timeFilter) {
            chartConfig.additionalOptions!.filters.timeFilter = {
              paramName: filterParams.timeFilter.paramName,
              options: filterParams.timeFilter.options
            };
          }
          
          if (enableFilters.currencyFilter) {
            if (currencyFilterType === 'columns') {
              chartConfig.additionalOptions!.filters.currencyFilter = {
                paramName: 'currency', // Not used for field switcher
                options: filterParams.currencyFilter.options,
                type: 'field_switcher',
                columnMappings: currencyColumnMappings
              };
            } else {
            chartConfig.additionalOptions!.filters.currencyFilter = {
              paramName: filterParams.currencyFilter.paramName,
              options: filterParams.currencyFilter.options
            };
            }
          }
        }
      }
      
      console.log('Saving chart config:', chartConfig);
      
      // Send to API
      const success = await saveChartConfig(chartConfig);
      
      if (success) {
        console.log('Chart saved successfully');
        
        setSuccessConfig({
          id: chartConfig.id,
          page: chartConfig.page
        });
        
        // Clear form after success
        if (!isEditMode) {
          setFormData({
            title: '',
            subtitle: '',
            page: '' as any,
            section: '',
            chartType: '' as any,
            apiEndpoint: '',
            apiKey: '',
            isStacked: false,
            colorScheme: 'default',
            width: 2, // Default to half width
            dataMapping: {
              xAxis: '',
              yAxis: '',
              groupBy: '',
            }
          });
          
          // Reset form state
          setErrors({});
          setTouched({});
          setApiValidationResult(null);
          
          // Reset filter state
          setEnableFilters({
            timeFilter: false,
            currencyFilter: false
          });
          
          // Reset currency filter specific state
          setCurrencyFilterType('parameter');
          setCurrencyColumnMappings({
            'USD': '',
            'SOL': '',
            'USDe': ''
          });
          
          // Reset dual axis state
          setIsDualAxis(false);
          setDualAxisConfig({
            leftAxisType: 'bar',
            rightAxisType: 'line',
            leftAxisFields: [],
            rightAxisFields: []
          });
          
          // Reset multi-input state
          setUseMultipleFields({
            xAxis: false,
            yAxis: false
          });
          
          // Reset time aggregation state
          setEnableTimeAggregation(false);
          
          // Reset tooltip total state
          setShowTooltipTotal(false);
          
          // Reset percentage fields state
          setPercentageFields([]);
        } else {
          // If in edit mode, redirect back to manage charts page
          router.push('/admin/manage-dashboard');
        }
      } else {
        setSubmitError('Failed to save chart config. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border-b border-gray-800 pb-5 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {isEditMode ? 'Edit Chart' : 'Create Custom Chart'}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          {isEditMode ? 'Update chart configuration or change data sources' : 'Create a custom chart and add it to the dashboard'}
        </p>
      </div>
      
      {successConfig && (
        <div className="bg-green-900/30 border border-green-800 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-400">Chart Created Successfully</h3>
              <div className="mt-2 text-sm text-green-300">
                <p>Your chart has been created and added to the selected page.</p>
                <div className="mt-4 flex space-x-4">
                  <Link 
                    href={availablePages.find(p => p.id === successConfig.page)?.path || '#'}
                    target="_blank"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-green-400 hover:bg-green-500 transition-colors"
                  >
                    View on Page
                  </Link>
                  <Link 
                    href="/admin/manage-dashboard"
                    className="inline-flex items-center px-3 py-2 border border-green-600 text-sm font-medium rounded-md text-green-400 bg-transparent hover:bg-green-900/30 transition-colors"
                  >
                    Manage Charts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {submitError && (
        <div className="bg-red-900/30 border border-red-800 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-400">Error</h3>
              <div className="mt-2 text-sm text-red-300">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart Basic Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Basic Information</h2>
          </div>
          
          <FormInput
            id="title"
            label="Chart Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            onBlur={(e) => {
              const formatted = formatTitle(e.target.value);
              handleInputChange('title', formatted);
            }}
            placeholder="E.g., Protocol Revenue by Category"
            required
            error={touched.title ? errors.title : undefined}
          />
          
          <FormInput
            id="subtitle"
            label="Chart Subtitle"
            value={formData.subtitle || ''}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="E.g., Monthly revenue breakdown by protocol category"
          />
          
          {/* Replace single page dropdown with menu + page dropdowns */}
          <FormSelect
            id="menu"
            label="Menu Option"
            options={MENU_OPTIONS}
            value={selectedMenu}
            onChange={handleMenuChange}
            required
            error={touched.menu ? errors.menu : undefined}
            helpText="Select the menu section where the chart will be displayed"
          />
          
          <FormSelect
            id="page"
            label="Page"
            options={availablePages}
            value={formData.page}
            onChange={(e) => handleInputChange('page', e.target.value)}
            required
            disabled={!selectedMenu}
            error={touched.page ? errors.page : undefined}
            helpText={selectedMenu ? "Select the specific page for this chart" : "Select a menu option first"}
          />
          
          <FormSelect
            id="section"
            label="Section"
            options={
              formData.page === 'sf-overview' ? [
                { id: 'network-rev-gdp', name: 'Network REV and GDP' },
                { id: 'validator', name: 'Validator' },
                { id: 'onchain-activity', name: 'Onchain Activity' },
                { id: 'defi', name: 'DEFI' },
                { id: 'stablecoins', name: 'Stablecoins' },
              ] : formData.page === 'sf-depin' ? [
                { id: 'overview', name: 'Overview' },
                { id: 'rewards', name: 'Rewards' },
                { id: 'token-burns', name: 'Token Burns' },
                { id: 'top-program-interactions', name: 'Top Program Interactions - L30 days' },
                { id: 'token-marketcap-share', name: 'Token Marketcap Share' },
                { id: 'depin-project-revenue', name: 'DePIN Project Revenue by Chain' },
                { id: 'solana-depin-fundraising', name: 'Solana DePIN Fundraising' },
              ] : [
                { id: '', name: 'No section (default)' },
              ]
            }
            value={formData.section || ''}
            onChange={(e) => handleInputChange('section', e.target.value)}
            disabled={!formData.page}
            helpText={
              formData.page === 'sf-overview' 
                ? "Select the section where this chart will be displayed on the overview page"
                : formData.page === 'sf-depin'
                ? "Select the section where this chart will be displayed on the DePIN page"
                : "Section selection is only available for SF Dashboard pages (Overview and DePIN)"
            }
          />
          
          {/* Chart Type Configuration */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Chart Configuration</h2>
          </div>
          
          <FormSelect
            id="chartType"
            label="Chart Type"
            options={CHART_TYPES}
            value={formData.chartType}
            onChange={(e) => handleInputChange('chartType', e.target.value)}
            required
            error={touched.chartType ? errors.chartType : undefined}
          />
          
          <FormInput
            id="colorScheme"
            label="Color Scheme"
            value={formData.colorScheme || 'default'}
            onChange={(e) => handleInputChange('colorScheme', e.target.value)}
            placeholder="E.g., blue,green,purple or default"
            helpText="Comma-separated colors or 'default'"
          />
          
          <FormSelect
            id="width"
            label="Chart Width"
            options={[
              { id: '2', name: '1/2 - Half width' },
              { id: '3', name: '2/2 - Full width' }
            ]}
            value={formData.width?.toString() || '2'}
            onChange={(e) => handleInputChange('width', e.target.value)}
            helpText="Select how wide the chart should be on desktop. On mobile, all charts will be full width."
          />
          
          <div className="col-span-2">
            <FormCheckbox
              id="isStacked"
              label="Is this a stacked chart?"
              checked={formData.isStacked || false}
              onChange={(e) => handleCheckboxChange('isStacked', e.target.checked)}
              helpText={
                formData.isStacked 
                  ? "The chart will display data as stacked"
                  : "Enable to create a stacked chart"
              }
            />
            
            {formData.isStacked && (
              <div className="mt-2 p-3 bg-indigo-900/30 rounded-md text-sm border border-indigo-800">
                <p className="font-medium text-indigo-400">Stacked Chart Configuration</p>
                <p className="mt-1 text-indigo-300">You can create a stacked chart in two ways:</p>
                <ol className="mt-2 ml-5 list-decimal text-indigo-300">
                  <li>Use <strong>multiple Y-axis fields</strong> (each field becomes a stack segment)</li>
                  <li>Use a <strong>Group By field</strong> (data is grouped and stacked by this field)</li>
                </ol>
              </div>
            )}
          </div>
          
          {/* API Configuration */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Data Source</h2>
          </div>
          
          <div className="col-span-2 flex space-x-4">
            <div className="flex-grow">
              <FormInput
                id="apiEndpoint"
                label="API Endpoint"
                value={formData.apiEndpoint}
                onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                placeholder="E.g., https://analytics.topledger.xyz/solana/api/queries/12345/results.json"
                required
                error={touched.apiEndpoint ? errors.apiEndpoint : undefined}
                helpText="Enter the full URL of the API endpoint"
              />
            </div>
            <div className="flex items-end mb-4">
              <Button
                onClick={handleValidateApi}
                variant="secondary"
                isLoading={isValidatingApi}
                disabled={!formData.apiEndpoint}
              >
                Validate API
              </Button>
            </div>
          </div>
          
          <FormInput
            id="apiKey"
            label="API Key"
            value={formData.apiKey || ''}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="E.g., YourApiKeyHere"
            helpText="Optional API key for authentication. You can include max_age with your API key like: your-api-key&max_age=86400"
            className="col-span-2"
          />
          
          {apiValidationResult && (
            <div className={`col-span-2 p-4 rounded-md border ${apiValidationResult.valid ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-red-900/30 border-red-800 text-red-400'}`}>
              <p className="text-sm">
                {apiValidationResult.message}
              </p>
              {apiValidationResult.valid && apiValidationResult.data && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-300">Available columns:</p>
                  <div className="mt-1 text-sm text-gray-400 max-h-32 overflow-y-auto">
                    {apiValidationResult.data.columns.map((col: string, index: number) => (
                      <span key={index} className="inline-block bg-gray-700 border border-gray-600 rounded-md px-2 py-1 mr-2 mb-2">
                        {col}
                      </span>
                    ))}
                  </div>
                  {apiValidationResult.data.sampleRows && (
                    <>
                      <p className="text-sm font-medium text-gray-300 mt-2">Sample data:</p>
                      <div className="mt-1 text-sm text-gray-400 max-h-48 overflow-y-auto">
                        <pre className="bg-gray-700 border border-gray-600 p-2 rounded-md text-xs">
                          {JSON.stringify(apiValidationResult.data.sampleRows, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Data Mapping */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Data Mapping</h2>
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-300">X-Axis Configuration</h3>
              <button
                type="button"
                onClick={() => toggleMultiInput('xAxis')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {useMultipleFields.xAxis ? 'Switch to Single Field' : 'Use Multiple Fields'}
              </button>
            </div>
            
            {useMultipleFields.xAxis ? (
              <FormMultiInput
                id="dataMapping.xAxis"
                label="X-Axis Fields"
                values={Array.isArray(formData.dataMapping.xAxis) ? formData.dataMapping.xAxis : (formData.dataMapping.xAxis ? [formData.dataMapping.xAxis] : [])}
                onChange={handleMultiInputChange}
                placeholder="E.g., month, date, category"
                required
                error={touched['dataMapping.xAxis'] ? errors['dataMapping.xAxis'] : undefined}
                helpText="Field names for the x-axis (add multiple fields for multi-series charts)"
              />
            ) : (
              <FormInput
                id="dataMapping.xAxis"
                label="X-Axis Field"
                value={typeof formData.dataMapping.xAxis === 'string' ? formData.dataMapping.xAxis : (Array.isArray(formData.dataMapping.xAxis) && formData.dataMapping.xAxis.length > 0 ? formData.dataMapping.xAxis[0] : '')}
                onChange={(e) => handleInputChange('dataMapping.xAxis', e.target.value)}
                placeholder="E.g., month"
                required
                error={touched['dataMapping.xAxis'] ? errors['dataMapping.xAxis'] : undefined}
                helpText="Field name for the x-axis (usually time/date)"
              />
            )}
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-300">Y-Axis Configuration</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMultiInput('yAxis')}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {useMultipleFields.yAxis ? 'Switch to Single Field' : 'Use Multiple Fields'}
                </button>
                
                {useMultipleFields.yAxis && (
                  <button
                    type="button"
                    onClick={toggleDualAxis}
                    className={`text-sm ${isDualAxis ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-400 hover:text-indigo-300'} transition-colors`}
                  >
                    {isDualAxis ? 'Disable Dual Axis' : 'Enable Dual Axis'}
                  </button>
                )}
              </div>
            </div>
            
            {useMultipleFields.yAxis ? (
              formData.chartType === 'bar' || formData.chartType === 'line' || formData.chartType === 'dual-axis' ? (
                // For regular bar/line charts and dual-axis, allow mixed chart types
                <FormMultiInputWithType
                  id="dataMapping.yAxis"
                  label="Y-Axis Fields"
                  values={Array.isArray(formData.dataMapping.yAxis) && 
                         typeof formData.dataMapping.yAxis[0] !== 'string' ? 
                         formData.dataMapping.yAxis as YAxisConfig[] : 
                         (Array.isArray(formData.dataMapping.yAxis) ? 
                          (formData.dataMapping.yAxis as string[]).map(field => ({ field, type: 'bar' as const })) : 
                          (formData.dataMapping.yAxis ? [{ field: formData.dataMapping.yAxis as string, type: 'bar' as const }] : [])
                         )}
                  onChange={handleMultiInputWithTypeChange}
                  placeholder="E.g., revenue, volume, count"
                  required
                  error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                  helpText={`${isDualAxis ? 'Use → button to assign fields to right Y-axis. ' : ''}Click the chart icon to toggle between bar and line chart for each field. Use "%" unit for percentage fields.`}
                  supportDualAxis={isDualAxis}
                />
              ) : (
                // For other chart types, use regular multi-input without chart type selection
                <FormMultiInput
                  id="dataMapping.yAxis"
                  label="Y-Axis Fields"
                  values={Array.isArray(formData.dataMapping.yAxis) ? 
                         (typeof formData.dataMapping.yAxis[0] === 'string' ? 
                          formData.dataMapping.yAxis as string[] : 
                          (formData.dataMapping.yAxis as YAxisConfig[]).map(config => config.field)) : 
                         (formData.dataMapping.yAxis ? [formData.dataMapping.yAxis as string] : [])}
                  onChange={handleMultiInputChange}
                  placeholder="E.g., revenue, volume, count"
                  required
                  error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                  helpText={formData.isStacked ? "For stacked charts, each field will become a segment in the stack" : "Field names for the y-axis (add multiple fields for multi-series charts)"}
                />
              )
            ) : (
              <div className="mb-4">
                <label htmlFor="y-axis-field" className="block text-sm font-medium text-gray-300 mb-1">
                  Y-Axis Field <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <FormInput
                    type="text"
                    id="y-axis-field"
                    value={typeof formData.dataMapping.yAxis === 'string' ? formData.dataMapping.yAxis : ''}
                    onChange={(e) => handleInputChange('dataMapping.yAxis', e.target.value)}
                    placeholder="Field name for the y-axis"
                    className="flex-grow rounded-md border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200"
                    required
                  />
                  
                  <FormInput
                    type="text"
                    id="y-axis-unit"
                    value={formData.dataMapping.yAxisUnit || ''}
                    onChange={(e) => handleInputChange('dataMapping.yAxisUnit', e.target.value)}
                    placeholder="Unit ($, %, SOL)"
                    className="rounded-md border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {formData.isStacked 
                    ? "For stacked charts with a single Y-axis, you must specify a Group By field below" 
                    : "Field name for the y-axis (usually numeric values). Use unit \"%\" for percentage fields to enable automatic percentage aggregation."}
                </p>
                {touched['dataMapping.yAxis'] && errors['dataMapping.yAxis'] && (
                  <p className="mt-1 text-sm text-red-400">{errors['dataMapping.yAxis']}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Remove the conditional for stacked charts and always show the GroupBy field */}
          <FormInput
            id="dataMapping.groupBy"
            label="Group By Field"
            value={formData.dataMapping.groupBy || ''}
            onChange={(e) => handleInputChange('dataMapping.groupBy', e.target.value)}
            placeholder="E.g., platform, category, chain"
            error={touched['dataMapping.groupBy'] ? errors['dataMapping.groupBy'] : undefined}
            helpText={formData.isStacked ? "Field to group data by (useful for stacked charts to create segments)" : "Optional field to group and segment your data"}
          />
          
          {/* Advanced Features Section */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Advanced Features</h2>
            <p className="text-sm text-gray-400 mb-4">Enable advanced data processing and filter features for this chart.</p>
          </div>
          
          {/* Time Aggregation Feature */}
          <div className="col-span-2">
            <FormCheckbox
              id="timeAggregation"
              label="Enable Automatic Time Aggregation"
              checked={enableTimeAggregation}
              onChange={toggleTimeAggregation}
              helpText="Automatically calculate and show weekly, monthly, quarterly, and yearly data from daily API data. This will enable a time filter for users to switch between time periods."
            />
          </div>
          
          {/* Tooltip Total Feature */}
          <div className="col-span-2">
            <FormCheckbox
              id="tooltipTotal"
              label="Show Total in Tooltips"
              checked={showTooltipTotal}
              onChange={toggleTooltipTotal}
              helpText="Display the sum of all values in the chart tooltip. Useful for charts with multiple data series to see the total across all categories."
            />
          </div>
          
          {/* Percentage Fields Configuration */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium text-indigo-400">Percentage Fields Configuration</h3>
                <p className="text-sm text-gray-400 mt-1">Configure fields that represent percentages for proper time aggregation calculations.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={addPercentageField}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                Add Percentage Field
              </Button>
            </div>
            
            {percentageFields.length === 0 ? (
              <div className="bg-gray-700 border border-gray-600 rounded-md p-4 text-center">
                <p className="text-gray-400 text-sm">
                  No percentage fields configured. Click "Add Percentage Field" to configure weighted average calculations for percentage fields.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {percentageFields.map((percentageField, index) => (
                  <div key={index} className="bg-gray-700 border border-gray-600 rounded-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-md font-medium text-gray-300">Percentage Field #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removePercentageField(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Percentage Field <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={percentageField.field}
                          onChange={(e) => updatePercentageField(index, { field: e.target.value })}
                          className="block w-full rounded-md bg-gray-800 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 text-sm"
                        >
                          <option value="">Select percentage field...</option>
                          {getAvailableFields().map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">The field that contains percentage values</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Numerator Field <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={percentageField.numeratorField}
                          onChange={(e) => updatePercentageField(index, { numeratorField: e.target.value })}
                          className="block w-full rounded-md bg-gray-800 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 text-sm"
                        >
                          <option value="">Select numerator field...</option>
                          {getAvailableFields().map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">The field used as numerator in percentage calculation</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Denominator Field <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={percentageField.denominatorField}
                          onChange={(e) => updatePercentageField(index, { denominatorField: e.target.value })}
                          className="block w-full rounded-md bg-gray-800 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 text-sm"
                        >
                          <option value="">Select denominator field...</option>
                          {getAvailableFields().map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">The field used as denominator in percentage calculation</p>
                      </div>
                    </div>
                    
                    {percentageField.field && percentageField.numeratorField && percentageField.denominatorField && (
                      <div className="mt-3 p-3 bg-indigo-900/30 rounded-md border border-indigo-800">
                        <p className="text-sm text-indigo-300">
                          <strong>Calculation:</strong> {percentageField.field} = ({percentageField.numeratorField} / {percentageField.denominatorField}) × 100
                        </p>
                        <p className="text-xs text-indigo-400 mt-1">
                          During time aggregation, this will calculate: (sum of {percentageField.numeratorField}) / (sum of {percentageField.denominatorField}) × 100
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-400">Percentage Field Detection</h3>
                  <div className="mt-2 text-sm text-yellow-300">
                    <p>Percentage fields are automatically detected based on their unit configuration:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>Case 1:</strong> Configure percentage fields here when they're calculated from other fields in the same dataset (e.g., dex_rev_percentage = dex_rev / solana_rev × 100) - these will use weighted average</li>
                      <li><strong>Case 2:</strong> For standalone percentages (e.g., user satisfaction surveys), simply set their unit to "%" in the Y-Axis configuration above - these will use simple average</li>
                      <li><strong>Unit Detection:</strong> Any field with unit "%" will be treated as a percentage field during time aggregation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filter Configuration Section */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Filter Configuration</h2>
            <p className="text-sm text-gray-400 mb-4">Enable filters for this chart. These will appear as interactive controls for users.</p>
          </div>
          
          {/* Time Filter */}
          <div className="col-span-2">
            <FormCheckbox
              id="timeFilter"
              label="Enable Time Filter"
              checked={enableFilters.timeFilter}
              onChange={() => toggleFilter('timeFilter')}
              disabled={false}
              helpText={enableTimeAggregation 
                ? "When Time Aggregation is enabled, time filtering is handled client-side for better performance" 
                : "Add a time period filter (Day, Week, Month, Quarter, Year)"
              }
            />
            
            {enableFilters.timeFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-800">
                <FormInput
                  id="timeFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.timeFilter.paramName}
                  onChange={(e) => handleFilterParamChange('timeFilter', 'paramName', e.target.value)}
                  placeholder="e.g., period, timeframe, Date Part"
                  helpText="Parameter name that will be sent to the API (case sensitive - must match exactly)"
                />
                
                <FormMultiInput
                  id="timeFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.timeFilter.options) ? filterParams.timeFilter.options : []}
                  onChange={(field, values) => handleFilterParamChange('timeFilter', 'options', values)}
                  placeholder="D, W, M, Q, Y"
                  helpText="Available time filter options (D=Day, W=Week, M=Month, Q=Quarter, Y=Year)"
                />
              </div>
            )}
          </div>
          
          {/* Currency Filter */}
          <div className="col-span-2 mt-4">
            <FormCheckbox
              id="currencyFilter"
              label="Enable Currency Filter"
              checked={enableFilters.currencyFilter}
              onChange={() => toggleFilter('currencyFilter')}
              helpText="Add a currency selector (USD, SOL, etc.)"
            />
            
            {enableFilters.currencyFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-800">
                {/* Currency Filter Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency Filter Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="currencyFilterType"
                        value="parameter"
                        checked={currencyFilterType === 'parameter'}
                        onChange={(e) => handleCurrencyFilterTypeChange(e.target.value as 'parameter' | 'columns')}
                        className="mr-2 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-300">Use Parameter</span>
                      <span className="ml-2 text-xs text-gray-400">(sends currency as API parameter)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="currencyFilterType"
                        value="columns"
                        checked={currencyFilterType === 'columns'}
                        onChange={(e) => handleCurrencyFilterTypeChange(e.target.value as 'parameter' | 'columns')}
                        className="mr-2 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-300">Use Different Columns</span>
                      <span className="ml-2 text-xs text-gray-400">(switches between different field names)</span>
                    </label>
                  </div>
                </div>

                {/* Currency Filter Options */}
                <FormMultiInput
                  id="currencyFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.currencyFilter.options) ? filterParams.currencyFilter.options : []}
                  onChange={(field, values) => {
                    handleFilterParamChange('currencyFilter', 'options', values);
                    // Update column mappings to match new options
                    if (currencyFilterType === 'columns') {
                      const newMappings: Record<string, string> = {};
                      values.forEach(currency => {
                        newMappings[currency] = currencyColumnMappings[currency] || '';
                      });
                      setCurrencyColumnMappings(newMappings);
                    }
                  }}
                  placeholder="USD, SOL, USDe"
                  helpText="Available currency options"
                />

                {currencyFilterType === 'parameter' ? (
                  /* Parameter-based configuration */
                  <FormInput
                    id="currencyFilterParamName"
                    label="API Parameter Name"
                    value={filterParams.currencyFilter.paramName}
                    onChange={(e) => handleFilterParamChange('currencyFilter', 'paramName', e.target.value)}
                    placeholder="e.g., currency, denomination"
                    helpText="Parameter name that will be sent to the API (case sensitive - must match exactly)"
                  />
                ) : (
                  /* Column-based configuration */
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-300">Column Mappings</div>
                    <div className="text-xs text-gray-400 mb-2">
                      Map each currency option to its corresponding column name in your data
                    </div>
                    {filterParams.currencyFilter.options.map((currency) => (
                      <div key={currency} className="flex items-center space-x-2">
                        <div className="w-16 text-sm text-gray-300 font-medium">{currency}:</div>
                        <FormInput
                          id={`currencyMapping_${currency}`}
                          value={currencyColumnMappings[currency] || ''}
                          onChange={(e) => handleCurrencyColumnMappingChange(currency, e.target.value)}
                          placeholder={`e.g., value_${currency.toLowerCase()}, revenue_${currency.toLowerCase()}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <div className="text-xs text-gray-400 mt-2">
                      Example: USD → "revenue_usd", SOL → "revenue_sol"
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Additional Options */}
          <div className="col-span-2 border-t border-gray-700 pt-6 mt-4">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4">Additional Options</h2>
          </div>
          
          <FormTextarea
            id="additionalOptions"
            label="Additional Options (JSON)"
            value={JSON.stringify(formData.additionalOptions || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                setFormData(prev => ({
                  ...prev,
                  additionalOptions: parsed
                }));
              } catch (error) {
                // Don't update if JSON is invalid
              }
            }}
            placeholder="{}"
            rows={6}
            className="col-span-2"
            helpText="Optional JSON configuration for advanced options"
          />
          
          {/* Add simplified Dual Axis Configuration section if enabled */}
          {isDualAxis && useMultipleFields.yAxis && (
            <div className="col-span-2 border-t border-gray-700 pt-3 mt-3">
              <div className="text-md font-medium text-indigo-400 mb-2">Dual Axis Configuration</div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Left Y-Axis Type
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
                    value={dualAxisConfig.leftAxisType}
                    onChange={(e) => updateDualAxisConfig('leftAxisType', e.target.value as 'bar' | 'line')}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-400">Chart type for left y-axis fields</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Right Y-Axis Type
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
                    value={dualAxisConfig.rightAxisType}
                    onChange={(e) => updateDualAxisConfig('rightAxisType', e.target.value as 'bar' | 'line')}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-400">Chart type for right y-axis fields</p>
                </div>
              </div>
              
              <div className="bg-gray-700 border border-gray-600 p-3 rounded-md">
                <p className="text-sm text-gray-300">
                  Use the <span className="font-semibold">→</span> buttons on each field above to assign them to the right Y-axis.
                  Fields shown with <span className="bg-indigo-800/80 px-1 rounded">blue background</span> are on the left axis, and fields with 
                  <span className="bg-purple-800/80 px-1 rounded ml-1">purple background</span> are on the right axis.
                </p>
              </div>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="col-span-2 flex justify-end space-x-4 border-t border-gray-700 pt-6 mt-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
            >
              {isEditMode ? 'Update Chart' : 'Create Chart'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 