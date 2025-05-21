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
        
        // Load the counter data from localStorage
        try {
          const countersString = localStorage.getItem('counterConfigs');
          if (countersString) {
            const counters = JSON.parse(countersString) as CounterConfig[];
            const counterToEdit = counters.find(counter => counter.id === editId);
            
            if (counterToEdit) {
              console.log('Found counter to edit:', counterToEdit);
              setInitialData(counterToEdit);
            } else {
              setSubmitError(`Counter with ID ${editId} not found.`);
            }
          }
        } catch (error) {
          console.error('Error loading counter data:', error);
          setSubmitError('Failed to load counter data from storage.');
        }
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
      
      {submitSuccess ? (
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