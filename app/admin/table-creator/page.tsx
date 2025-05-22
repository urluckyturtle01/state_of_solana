"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TableConfig } from '../types';
import Link from 'next/link';
import TableForm from '../components/TableForm';

export default function TableCreatorPage() {
  const router = useRouter();
  
  // State to track if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<TableConfig | undefined>(undefined);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for edit mode and load table data if needed
  useEffect(() => {
    // Access the URL search params to check for editId
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const editId = searchParams.get('editId');
      
      if (editId) {
        console.log(`Loading table ${editId} for editing`);
        setIsEditMode(true);
        setEditTableId(editId);
        setIsLoading(true);
        
        // Try different approaches to fetch the table data
        const fetchTableData = async () => {
          try {
            // First approach: Direct API call to get a specific table by ID using the dynamic route
            console.log(`Fetching table ${editId} from API using dynamic route`);
            
            const specificTableResponse = await fetch(`/api/tables/${editId}`);
            if (specificTableResponse.ok) {
              const tableData = await specificTableResponse.json();
              console.log('Found table to edit (dynamic API route):', tableData);
              setInitialData(tableData);
              setIsLoading(false);
              return;
            }

            console.log(`Table not found via dynamic route, trying all tables endpoint`);
            
            // Second approach: Get all tables and filter
            const allTablesResponse = await fetch(`/api/tables`);
            if (!allTablesResponse.ok) {
              throw new Error(`Failed to fetch tables: ${allTablesResponse.statusText}`);
            }
            
            const allTablesData = await allTablesResponse.json();
            const tables = allTablesData.tables || [];
            const tableToEdit = tables.find((table: TableConfig) => table.id === editId);
            
            if (tableToEdit) {
              console.log('Found table to edit (all tables API):', tableToEdit);
              setInitialData(tableToEdit);
              setIsLoading(false);
              return;
            }
            
            throw new Error('Table not found in API response');
          } catch (apiError) {
            console.error('Error loading table from API:', apiError);
            
            // Third approach: Try localStorage
            try {
              // First try all_tables
              const tablesString = localStorage.getItem('all_tables');
              if (tablesString) {
                const tablesData = JSON.parse(tablesString);
                const tables = tablesData.tables || tablesData;
                const tableToEdit = tables.find((table: TableConfig) => table.id === editId);
                
                if (tableToEdit) {
                  console.log('Found table to edit (localStorage all_tables):', tableToEdit);
                  setInitialData(tableToEdit);
                  setIsLoading(false);
                  return;
                }
              }
              
              // Try tableConfigs
              const configsString = localStorage.getItem('tableConfigs');
              if (configsString) {
                const configs = JSON.parse(configsString);
                const tableToEdit = configs.find((table: TableConfig) => table.id === editId);
                
                if (tableToEdit) {
                  console.log('Found table to edit (localStorage tableConfigs):', tableToEdit);
                  setInitialData(tableToEdit);
                  setIsLoading(false);
                  return;
                }
              }
              
              // Try page-specific caches
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith('tables_page_')) {
                  const pageTablesString = localStorage.getItem(key);
                  if (pageTablesString) {
                    try {
                      const pageTables = JSON.parse(pageTablesString);
                      const tableToEdit = Array.isArray(pageTables) 
                        ? pageTables.find((table: TableConfig) => table.id === editId)
                        : pageTables.tables?.find((table: TableConfig) => table.id === editId);
                      
                      if (tableToEdit) {
                        console.log(`Found table to edit in ${key}:`, tableToEdit);
                        setInitialData(tableToEdit);
                        setIsLoading(false);
                        return;
                      }
                    } catch (e) {
                      console.error(`Error parsing ${key}:`, e);
                    }
                  }
                }
              }
              
              // If we get here, we couldn't find the table
              setSubmitError(`Table with ID ${editId} not found.`);
              setIsLoading(false);
            } catch (storageError) {
              console.error('Error loading table data from localStorage:', storageError);
              setSubmitError('Failed to load table data from storage.');
              setIsLoading(false);
            }
          }
        };
        
        fetchTableData();
      }
    }
  }, []);
  
  const handleFormSubmit = (data: TableConfig) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      console.log('Submitting table data:', data);
      // Table is saved by the form itself
      
      setSubmitSuccess(true);
      
      // Redirect to dashboard manager after a short delay
      setTimeout(() => {
        router.push('/admin/manage-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error saving table:', error);
      setSubmitError('Failed to save table. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit Table' : 'Create New Table'}
          </h1>
          <p className="mt-1 text-gray-400">
            {isEditMode 
              ? 'Update the table configuration' 
              : 'Configure a new data table to display on dashboard pages'}
          </p>
        </div>
        
        <div>
          <Link 
            href="/admin/manage-dashboard" 
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            Back to Dashboard Manager
          </Link>
        </div>
      </div>
      
      {submitError && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-800/50 rounded-md">
          <p className="text-red-400">{submitError}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-400">Loading table data...</p>
        </div>
      ) : submitSuccess ? (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-800/50 rounded-md">
          <p className="text-green-400">
            Table successfully {isEditMode ? 'updated' : 'created'}! Redirecting...
          </p>
        </div>
      ) : (
        <TableForm 
          initialData={initialData}
          onSubmit={handleFormSubmit}
          onCancel={() => router.push('/admin/manage-dashboard')}
        />
      )}
    </div>
  );
} 