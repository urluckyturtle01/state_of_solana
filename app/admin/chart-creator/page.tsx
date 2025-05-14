"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_PAGES, CHART_TYPES, ChartFormData, ChartType } from '../types';
import { formDataToConfig, validateApiEndpoint, saveChartConfig } from '../utils';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormCheckbox from '../components/FormCheckbox';
import FormTextarea from '../components/FormTextarea';
import Button from '../components/Button';
import Link from 'next/link';
import FormMultiInput from '../components/FormMultiInput';

export default function ChartCreatorPage() {
  const router = useRouter();
  
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
  
  // Add state for filter configuration
  const [enableFilters, setEnableFilters] = useState({
    timeFilter: false,
    displayModeFilter: false,
    currencyFilter: false
  });
  
  // Add state for filter parameters
  const [filterParams, setFilterParams] = useState({
    timeFilter: {
      options: ['D', 'W', 'M', 'Q', 'Y'],
      paramName: 'Date Part'
    },
    displayModeFilter: {
      options: ['absolute', 'percent'],
      paramName: 'Display Mode'
    },
    currencyFilter: {
      options: ['USD', 'SOL', 'USDe'],
      paramName: 'Currency'
    }
  });
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
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
        
        setFormData(prev => ({
          ...prev,
          [name]: chartType,
          // If switching from stacked to non-stacked, turn off isStacked
          // If switching to stacked, turn on isStacked
          isStacked: isStackedChart || (prev.isStacked && !wasStackedChart(prev))
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
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Add a handler for multi-input fields
  const handleMultiInputChange = (fieldName: string, values: string[]) => {
    const [parent, child] = fieldName.split('.');
    
    if (parent === 'dataMapping') {
      setFormData(prev => ({
        ...prev,
        dataMapping: {
          ...prev.dataMapping,
          [child]: values.length === 1 ? values[0] : values
        }
      }));
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
      let newValue: string | string[];
      
      if (!useMultipleFields[field]) {
        // Switching to multi-input
        newValue = typeof currentValue === 'string' && currentValue ? [currentValue] : [];
      } else {
        // Switching to single input
        newValue = Array.isArray(currentValue) && currentValue.length > 0 
          ? currentValue[0] 
          : '';
      }
      
      return {
        ...prev,
        dataMapping: {
          ...prev.dataMapping,
          [field]: newValue
        }
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
        additionalOptions.filters = {
          ...(additionalOptions.filters || {}),
          [filterName]: filterParams[filterName]
        };
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
    setFilterParams(prev => ({
      ...prev,
      [filterName]: {
        ...prev[filterName],
        [field]: value
      }
    }));
    
    // Update additionalOptions if the filter is enabled
    if (enableFilters[filterName]) {
      setFormData(prev => {
        const additionalOptions = prev.additionalOptions || {};
        
        additionalOptions.filters = {
          ...(additionalOptions.filters || {}),
          [filterName]: {
            ...(additionalOptions.filters?.[filterName] || {}),
            [field]: value
          }
        };
        
        return {
          ...prev,
          additionalOptions
        };
      });
    }
  };
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.title) newErrors.title = 'Title is required';
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
    if (formData.isStacked && !formData.dataMapping.groupBy) {
      newErrors['dataMapping.groupBy'] = 'Group by field is required for stacked charts';
    }
    
    // API validation
    if (formData.apiEndpoint && !apiValidationResult?.valid) {
      newErrors.apiEndpoint = 'Please validate the API endpoint first';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    
    setIsValidatingApi(true);
    setApiValidationResult(null);
    
    try {
      // Create parameters object from enabled filters
      const testParameters: Record<string, any> = {};
      
      if (enableFilters.timeFilter && filterParams.timeFilter.options.length > 0) {
        testParameters[filterParams.timeFilter.paramName] = filterParams.timeFilter.options[0];
      }
      
      if (enableFilters.currencyFilter && filterParams.currencyFilter.options.length > 0) {
        testParameters[filterParams.currencyFilter.paramName] = filterParams.currencyFilter.options[0];
      }
      
      if (enableFilters.displayModeFilter && filterParams.displayModeFilter.options.length > 0) {
        testParameters[filterParams.displayModeFilter.paramName] = filterParams.displayModeFilter.options[0];
      }
      
      // Only pass parameters if we have some
      const hasParameters = Object.keys(testParameters).length > 0;
      
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
    } catch (error) {
      setApiValidationResult({
        valid: false,
        message: `Error validating API: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsValidatingApi(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set all fields as touched to show all validation errors
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
      if (key === 'dataMapping') {
        allTouched['dataMapping.xAxis'] = true;
        allTouched['dataMapping.yAxis'] = true;
        allTouched['dataMapping.groupBy'] = true;
      }
    });
    setTouched(allTouched);
    
    // Validate the form
    if (!validateForm()) {
      setSubmitError('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessConfig(null);
    
    try {
      // Convert form data to chart config
      const chartConfig = formDataToConfig(formData);
      
      // Save to local storage
      saveChartConfig(chartConfig);
      
      // Set success state with chart info
      setSuccessConfig({
        id: chartConfig.id,
        page: chartConfig.page
      });
    } catch (error) {
      setSubmitError(`Error creating chart: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Chart</h1>
        <p className="mt-2 text-sm text-gray-500">Configure a new chart to add to a page</p>
      </div>
      
      {successConfig && (
        <div className="bg-green-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Chart Created Successfully</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your chart has been created and added to the selected page.</p>
                <div className="mt-4 flex space-x-4">
                  <Link 
                    href={AVAILABLE_PAGES.find(p => p.id === successConfig.page)?.path || '#'}
                    target="_blank"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    View on Page
                  </Link>
                  <Link 
                    href="/admin/manage-charts"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
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
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart Basic Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          </div>
          
          <FormInput
            id="title"
            label="Chart Title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="E.g., Protocol Revenue by Category"
            required
            error={touched.title ? errors.title : undefined}
          />
          
          <FormInput
            id="subtitle"
            label="Chart Subtitle"
            value={formData.subtitle || ''}
            onChange={handleInputChange}
            placeholder="E.g., Monthly revenue breakdown by protocol category"
          />
          
          <FormSelect
            id="page"
            label="Page"
            options={AVAILABLE_PAGES}
            value={formData.page}
            onChange={handleInputChange}
            required
            error={touched.page ? errors.page : undefined}
            helpText="Select the page where the chart will be displayed"
          />
          
          <FormInput
            id="section"
            label="Section"
            value={formData.section || ''}
            onChange={handleInputChange}
            placeholder="E.g., Top Charts"
            helpText="Optional section name for grouping charts"
          />
          
          {/* Chart Type Configuration */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Chart Configuration</h2>
          </div>
          
          <FormSelect
            id="chartType"
            label="Chart Type"
            options={CHART_TYPES}
            value={formData.chartType}
            onChange={handleInputChange}
            required
            error={touched.chartType ? errors.chartType : undefined}
          />
          
          <FormInput
            id="colorScheme"
            label="Color Scheme"
            value={formData.colorScheme || 'default'}
            onChange={handleInputChange}
            placeholder="E.g., blue,green,purple or default"
            helpText="Comma-separated colors or 'default'"
          />
          
          <div className="col-span-2">
            <FormCheckbox
              id="isStacked"
              label="Is this a stacked chart?"
              checked={formData.isStacked || false}
              onChange={handleCheckboxChange}
              helpText="For bar or area charts, enable to stack values"
            />
          </div>
          
          {/* API Configuration */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Data Source</h2>
          </div>
          
          <div className="col-span-2 flex space-x-4">
            <div className="flex-grow">
              <FormInput
                id="apiEndpoint"
                label="API Endpoint"
                value={formData.apiEndpoint}
                onChange={handleInputChange}
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
            onChange={handleInputChange}
            placeholder="E.g., YourApiKeyHere"
            helpText="Optional API key for authentication"
            className="col-span-2"
          />
          
          {apiValidationResult && (
            <div className={`col-span-2 p-4 rounded-md ${apiValidationResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm ${apiValidationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                {apiValidationResult.message}
              </p>
              {apiValidationResult.valid && apiValidationResult.data && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Available columns:</p>
                  <div className="mt-1 text-sm text-gray-500 max-h-32 overflow-y-auto">
                    {apiValidationResult.data.columns.map((col: string, index: number) => (
                      <span key={index} className="inline-block bg-gray-100 rounded-md px-2 py-1 mr-2 mb-2">
                        {col}
                      </span>
                    ))}
                  </div>
                  {apiValidationResult.data.sampleRows && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mt-2">Sample data:</p>
                      <div className="mt-1 text-sm text-gray-500 max-h-48 overflow-y-auto">
                        <pre className="bg-gray-100 p-2 rounded-md text-xs">
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
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Data Mapping</h2>
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">X-Axis Configuration</h3>
              <button
                type="button"
                onClick={() => toggleMultiInput('xAxis')}
                className="text-sm text-indigo-600 hover:text-indigo-800"
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
                onChange={handleInputChange}
                placeholder="E.g., month"
                required
                error={touched['dataMapping.xAxis'] ? errors['dataMapping.xAxis'] : undefined}
                helpText="Field name for the x-axis (usually time/date)"
              />
            )}
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">Y-Axis Configuration</h3>
              <button
                type="button"
                onClick={() => toggleMultiInput('yAxis')}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {useMultipleFields.yAxis ? 'Switch to Single Field' : 'Use Multiple Fields'}
              </button>
            </div>
            
            {useMultipleFields.yAxis ? (
              <FormMultiInput
                id="dataMapping.yAxis"
                label="Y-Axis Fields"
                values={Array.isArray(formData.dataMapping.yAxis) ? formData.dataMapping.yAxis : (formData.dataMapping.yAxis ? [formData.dataMapping.yAxis] : [])}
                onChange={handleMultiInputChange}
                placeholder="E.g., revenue, volume, count"
                required
                error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                helpText="Field names for the y-axis (add multiple fields for multi-series charts)"
              />
            ) : (
              <FormInput
                id="dataMapping.yAxis"
                label="Y-Axis Field"
                value={typeof formData.dataMapping.yAxis === 'string' ? formData.dataMapping.yAxis : (Array.isArray(formData.dataMapping.yAxis) && formData.dataMapping.yAxis.length > 0 ? formData.dataMapping.yAxis[0] : '')}
                onChange={handleInputChange}
                placeholder="E.g., protocol_revenue"
                required
                error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                helpText="Field name for the y-axis (usually numeric values)"
              />
            )}
          </div>
          
          {formData.isStacked && (
            <FormInput
              id="dataMapping.groupBy"
              label="Group By Field"
              value={formData.dataMapping.groupBy || ''}
              onChange={handleInputChange}
              placeholder="E.g., platform"
              required
              error={touched['dataMapping.groupBy'] ? errors['dataMapping.groupBy'] : undefined}
              helpText="Field to group data by (required for stacked charts)"
            />
          )}
          
          {/* Filter Configuration Section */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Filter Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">Enable filters for this chart. These will appear as interactive controls for users.</p>
          </div>
          
          {/* Time Filter */}
          <div className="col-span-2">
            <FormCheckbox
              id="enableTimeFilter"
              label="Enable Time Filter"
              checked={enableFilters.timeFilter}
              onChange={() => toggleFilter('timeFilter')}
              helpText="Add a time period filter (Day, Week, Month, Quarter, Year)"
            />
            
            {enableFilters.timeFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-100">
                <FormInput
                  id="timeFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.timeFilter.paramName}
                  onChange={(e) => handleFilterParamChange('timeFilter', 'paramName', e.target.value)}
                  placeholder="e.g., period, timeframe, Date Part"
                  helpText="Parameter name that will be sent to the API"
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
          
          {/* Display Mode Filter */}
          <div className="col-span-2 mt-4">
            <FormCheckbox
              id="enableDisplayModeFilter"
              label="Enable Display Mode Filter"
              checked={enableFilters.displayModeFilter}
              onChange={() => toggleFilter('displayModeFilter')}
              helpText="Add a toggle between absolute values and percentage view"
            />
            
            {enableFilters.displayModeFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-100">
                <FormInput
                  id="displayModeFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.displayModeFilter.paramName}
                  onChange={(e) => handleFilterParamChange('displayModeFilter', 'paramName', e.target.value)}
                  placeholder="e.g., mode, display_mode, format"
                  helpText="Parameter name that will be sent to the API"
                />
                
                <FormMultiInput
                  id="displayModeFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.displayModeFilter.options) ? filterParams.displayModeFilter.options : []}
                  onChange={(field, values) => handleFilterParamChange('displayModeFilter', 'options', values)}
                  placeholder="absolute, percent"
                  helpText="Available display mode options (absolute, percent)"
                />
              </div>
            )}
          </div>
          
          {/* Currency Filter */}
          <div className="col-span-2 mt-4">
            <FormCheckbox
              id="enableCurrencyFilter"
              label="Enable Currency Filter"
              checked={enableFilters.currencyFilter}
              onChange={() => toggleFilter('currencyFilter')}
              helpText="Add a currency selector (USD, SOL, etc.)"
            />
            
            {enableFilters.currencyFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-100">
                <FormInput
                  id="currencyFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.currencyFilter.paramName}
                  onChange={(e) => handleFilterParamChange('currencyFilter', 'paramName', e.target.value)}
                  placeholder="e.g., currency, denomination"
                  helpText="Parameter name that will be sent to the API"
                />
                
                <FormMultiInput
                  id="currencyFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.currencyFilter.options) ? filterParams.currencyFilter.options : []}
                  onChange={(field, values) => handleFilterParamChange('currencyFilter', 'options', values)}
                  placeholder="USD, SOL, USDe"
                  helpText="Available currency options"
                />
              </div>
            )}
          </div>
          
          {/* Additional Options */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Additional Options</h2>
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
          
          {/* Form Actions */}
          <div className="col-span-2 flex justify-end space-x-4 border-t pt-6 mt-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Create Chart
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 