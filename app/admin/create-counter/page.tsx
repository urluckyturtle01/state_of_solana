"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CounterForm from '../components/CounterForm';
import { CounterConfig } from '../types';
import Link from 'next/link';

export default function CreateCounterPage() {
  const router = useRouter();
  
  // State to track if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCounterId, setEditCounterId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<CounterConfig | undefined>(undefined);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for edit mode and load counter data if needed
  useEffect(() => {
    // Access the URL search params to check for editId
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const editId = searchParams.get('editId');
      
      if (editId) {
        console.log(`Loading counter ${editId} for editing`);
        setIsEditMode(true);
        setEditCounterId(editId);
        setIsLoading(true);
        
        // Try different approaches to fetch the counter data
        const fetchCounterData = async () => {
          try {
            // First approach: Direct API call to get a specific counter
            console.log(`Fetching counter ${editId} from API`);
            
            // Try to fetch the counter directly by ID
            const specificCounterResponse = await fetch(`/api/counters/${editId}`);
            if (specificCounterResponse.ok) {
              const counterData = await specificCounterResponse.json();
              console.log('Found counter to edit (API):', counterData);
              setInitialData(counterData);
              setIsLoading(false);
              return;
            }
            
            console.log(`Counter not found via direct API, trying all counters endpoint`);
            
            // Get all counters and filter by ID
            const allCountersResponse = await fetch(`/api/counters`);
            if (!allCountersResponse.ok) {
              throw new Error(`Failed to fetch counters: ${allCountersResponse.statusText}`);
            }
            
            const allCountersData = await allCountersResponse.json();
            const counters = allCountersData.counters || [];
            const counterToEdit = counters.find((counter: CounterConfig) => counter.id === editId);
            
            if (counterToEdit) {
              console.log('Found counter to edit (all counters API):', counterToEdit);
              setInitialData(counterToEdit);
              setIsLoading(false);
              return;
            }
            
            throw new Error('Counter not found in API response');
          } catch (apiError) {
            console.error('Error loading counter from API:', apiError);
            
            // Fallback to localStorage if API fails
            try {
              // Try all_counters
              const countersString = localStorage.getItem('all_counters');
              if (countersString) {
                const countersData = JSON.parse(countersString);
                const counters = countersData.counters || countersData;
                const counterToEdit = counters.find((counter: CounterConfig) => counter.id === editId);
                
                if (counterToEdit) {
                  console.log('Found counter to edit (localStorage all_counters):', counterToEdit);
                  setInitialData(counterToEdit);
                  setIsLoading(false);
                  return;
                }
              }
              
              // Try counterConfigs
              const configsString = localStorage.getItem('counterConfigs');
              if (configsString) {
                const configs = JSON.parse(configsString);
                const counterToEdit = configs.find((counter: CounterConfig) => counter.id === editId);
                
                if (counterToEdit) {
                  console.log('Found counter to edit (localStorage counterConfigs):', counterToEdit);
                  setInitialData(counterToEdit);
                  setIsLoading(false);
                  return;
                }
              }
              
              // Try page-specific caches
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith('counters_page_')) {
                  const pageCountersString = localStorage.getItem(key);
                  if (pageCountersString) {
                    try {
                      const pageCountersData = JSON.parse(pageCountersString);
                      const pageCounters = pageCountersData.counters || [];
                      const counterToEdit = pageCounters.find((counter: CounterConfig) => counter.id === editId);
                      
                      if (counterToEdit) {
                        console.log(`Found counter to edit in ${key}:`, counterToEdit);
                        setInitialData(counterToEdit);
                        setIsLoading(false);
                        return;
                      }
                    } catch (e) {
                      console.error(`Error parsing ${key}:`, e);
                    }
                  }
                }
              }
              
              // If we get here, we couldn't find the counter
              setSubmitError(`Counter with ID ${editId} not found.`);
              setIsLoading(false);
            } catch (storageError) {
              console.error('Error loading counter data from localStorage:', storageError);
              setSubmitError('Failed to load counter data from storage.');
              setIsLoading(false);
            }
          }
        };
        
        fetchCounterData();
      }
    }
  }, []);
  
  const handleFormSubmit = (data: CounterConfig) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      console.log('Submitting counter data:', data);
      // Counter is saved by the form itself
      
      setSubmitSuccess(true);
      
      // Redirect to dashboard manager after a short delay
      setTimeout(() => {
        router.push('/admin/manage-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error saving counter:', error);
      setSubmitError('Failed to save counter. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit Counter' : 'Create New Counter'}
          </h1>
          <p className="mt-1 text-gray-400">
            {isEditMode 
              ? 'Update the counter configuration' 
              : 'Configure a new counter to display on dashboard pages'}
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
          <p className="ml-3 text-gray-400">Loading counter data...</p>
        </div>
      ) : submitSuccess ? (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-800/50 rounded-md">
          <p className="text-green-400">
            Counter successfully {isEditMode ? 'updated' : 'created'}! Redirecting...
          </p>
        </div>
      ) : (
        <CounterForm 
          initialData={initialData}
          onSubmit={handleFormSubmit}
          onCancel={() => router.push('/admin/manage-dashboard')}
        />
      )}
    </div>
  );
} 