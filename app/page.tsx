export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-6">State of Solana Dashboard</h1>
      <p className="mb-8 text-gray-300 text-center max-w-2xl">
        An interactive dashboard displaying key metrics and visualizations for the Solana blockchain ecosystem, focusing on DeFi and DEX activity.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <a 
          href="/state_of_solana/dex" 
          className="bg-blue-900/30 border border-blue-800 p-6 rounded-lg hover:bg-blue-800/30 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">DEX Metrics</h2>
          <p className="text-gray-400">Explore DEX volumes, TVL, and trader activity</p>
        </a>
        <a 
          href="/state_of_solana/rev" 
          className="bg-purple-900/30 border border-purple-800 p-6 rounded-lg hover:bg-purple-800/30 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Revenue Metrics</h2>
          <p className="text-gray-400">Analyze transaction fees and other revenue metrics</p>
        </a>
      </div>
    </div>
  );
} 