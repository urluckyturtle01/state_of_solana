import Layout from "./components/Layout";
import Counter from "./components/shared/Counter";
import { ChartIcon, TvlIcon, ExchangeIcon } from "./components/shared/Icons";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="border-b border-gray-900 pb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Overview</h1>
          <p className="text-gray-400 mt-2">Welcome to the State of Solana dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Counter 
            title="Key Metrics"
            value="845K"
            trend={{ value: 12.5, label: "vs last month" }}
            icon={<ChartIcon />}
            variant="indigo"
          />
          
          <Counter 
            title="Total Value Locked"
            value="$6.3B"
            trend={{ value: 4.2, label: "vs last week" }}
            icon={<TvlIcon />}
            variant="blue"
          />
          
          <Counter 
            title="Network Status"
            value="Healthy"
            icon={<ExchangeIcon />}
            variant="purple"
          />
        </div>
      </div>
    </Layout>
  );
}
