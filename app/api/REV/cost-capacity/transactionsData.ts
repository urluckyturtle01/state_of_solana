import { TimeFilter } from '.';

// API details
const API_KEY = 'YDy7XJllrBVuLP5gf1Tx5MclZNpS4euKeyli2Lz6';
const API_URL = 'https://analytics.topledger.xyz/tl/api/queries/13210/results.json';

// Transaction data point interface
export interface TransactionDataPoint {
  date: string;
  
  // Transaction counts
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_vote_transactions: number;
  total_non_vote_transactions: number;
  successful_vote_transactions: number;
  successful_non_vote_transactions: number;
  failed_vote_transactions: number;
  failed_non_vote_transactions: number;
  
  // Percentages
  successful_transactions_perc: number;
  non_vote_transactions_perc: number;
  successful_non_vote_transactions_perc: number;
  
  // TPS metrics
  total_tps: number;
  success_tps: number;
  failed_tps: number;
  real_tps: number;
  
  // Fee metrics
  total_fees: number;
  non_vote_transactions_fees: number;
  vote_transactions_fees: number;
  priority_fees: number;
}

/**
 * Fetch transaction data from the API
 */
export async function fetchTransactionsData(timeFilter: TimeFilter = 'M'): Promise<TransactionDataPoint[]> {
  try {
    console.log('Fetching transaction data with timeFilter:', timeFilter);
    
    // Fetch data from API
    const response = await fetch(`${API_URL}?api_key=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.query_result?.data?.rows || [];
    
    if (!rows || rows.length === 0) {
      console.warn('No transaction data returned from API');
      return [];
    }
    
    // Transform and normalize the data
    const transformedData = rows.map((row: any) => {
      return {
        date: row.block_date,
        
        // Transaction counts
        total_transactions: Number(row.Total_Transactions) || 0,
        successful_transactions: Number(row.Succeessful_Transactions) || 0,
        failed_transactions: Number(row.Failed_Transactions) || 0,
        total_vote_transactions: Number(row.Total_Vote_Transactions) || 0,
        total_non_vote_transactions: Number(row.Total_Non_Vote_Transactions) || 0,
        successful_vote_transactions: Number(row.Successful_Vote_Transactions) || 0,
        successful_non_vote_transactions: Number(row.Successful_Non_Vote_Transactions) || 0,
        failed_vote_transactions: Number(row.Failed_Vote_Transactions) || 0,
        failed_non_vote_transactions: Number(row.Failed_Non_Vote_Transactions) || 0,
        
        // Percentages
        successful_transactions_perc: parseFloat(row.Succeesful_Transactions_perc) || 0,
        non_vote_transactions_perc: parseFloat(row.Non_Vote_Transactions_perc) || 0,
        successful_non_vote_transactions_perc: parseFloat(row.Successful_Non_Vote_Transactiosn_perc) || 0,
        
        // TPS metrics
        total_tps: Number(row.Total_TPS) || 0,
        success_tps: Number(row.Success_TPS) || 0,
        failed_tps: Number(row.Failed_TPS) || 0,
        real_tps: Number(row.Real_TPS) || 0,
        
        // Fee metrics
        total_fees: Number(row.Total_Fees) || 0,
        non_vote_transactions_fees: Number(row.Non_Vote_Transactions_Fees) || 0,
        vote_transactions_fees: Number(row.Vote_Transactions_Fees) || 0,
        priority_fees: Number(row.Priority_Fees) || 0,
      };
    });
    
    // Sort by date in ascending order
    transformedData.sort((a: TransactionDataPoint, b: TransactionDataPoint) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return transformedData;
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    return [];
  }
}

// Generate mock data for testing or fallback
export const generateMockTransactionData = (timeFilter: TimeFilter = 'M'): TransactionDataPoint[] => {
  const result: TransactionDataPoint[] = [];
  const now = new Date();
  
  // Determine date range based on time filter
  let days = 30;
  if (timeFilter === 'D') days = 1;
  if (timeFilter === 'W') days = 7;
  if (timeFilter === 'M') days = 30;
  if (timeFilter === 'Q') days = 90;
  if (timeFilter === 'Y') days = 365;

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Base values
    const totalTransactions = 300000000 + Math.random() * 50000000;
    const successfulTransactions = totalTransactions * (0.85 + Math.random() * 0.1);
    const failedTransactions = totalTransactions - successfulTransactions;
    
    const totalVoteTransactions = totalTransactions * (0.7 + Math.random() * 0.1);
    const totalNonVoteTransactions = totalTransactions - totalVoteTransactions;
    
    const successfulVoteTransactions = totalVoteTransactions * (0.95 + Math.random() * 0.05);
    const failedVoteTransactions = totalVoteTransactions - successfulVoteTransactions;
    
    const successfulNonVoteTransactions = totalNonVoteTransactions * (0.6 + Math.random() * 0.2);
    const failedNonVoteTransactions = totalNonVoteTransactions - successfulNonVoteTransactions;
    
    result.push({
      date: date.toISOString().split('T')[0],
      
      // Transaction counts
      total_transactions: Math.round(totalTransactions),
      successful_transactions: Math.round(successfulTransactions),
      failed_transactions: Math.round(failedTransactions),
      total_vote_transactions: Math.round(totalVoteTransactions),
      total_non_vote_transactions: Math.round(totalNonVoteTransactions),
      successful_vote_transactions: Math.round(successfulVoteTransactions),
      successful_non_vote_transactions: Math.round(successfulNonVoteTransactions),
      failed_vote_transactions: Math.round(failedVoteTransactions),
      failed_non_vote_transactions: Math.round(failedNonVoteTransactions),
      
      // Percentages
      successful_transactions_perc: (successfulTransactions / totalTransactions) * 100,
      non_vote_transactions_perc: (totalNonVoteTransactions / totalTransactions) * 100,
      successful_non_vote_transactions_perc: (successfulNonVoteTransactions / totalNonVoteTransactions) * 100,
      
      // TPS metrics
      total_tps: Math.round(totalTransactions / 86400),
      success_tps: Math.round(successfulTransactions / 86400),
      failed_tps: Math.round(failedTransactions / 86400),
      real_tps: Math.round(totalNonVoteTransactions / 86400),
      
      // Fee metrics
      total_fees: 5000 + Math.random() * 2000,
      non_vote_transactions_fees: 4000 + Math.random() * 1500,
      vote_transactions_fees: 1000 + Math.random() * 500,
      priority_fees: 3500 + Math.random() * 1200,
    });
  }
  
  return result;
};

// Mock fetch function for testing
export const fetchTransactionsDataMock = async (timeFilter: TimeFilter = 'M'): Promise<TransactionDataPoint[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockTransactionData(timeFilter));
    }, 800);
  });
}; 