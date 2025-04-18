"use client";

import Layout from "../components/Layout";
import CounterExamples from "../components/examples/CounterExamples";

export default function ExamplesPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="border-b border-gray-900 pb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Component Examples</h1>
          <p className="text-gray-400 mt-2">Reference for reusable components in the State of Solana dashboard</p>
        </div>
        
        <CounterExamples />
      </div>
    </Layout>
  );
} 