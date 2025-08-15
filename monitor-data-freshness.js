#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');

// Configuration
const CONFIG = {
  chartDataDir: '/root/state_of_solana/public/temp/chart-data',
  chartConfigDir: '/root/state_of_solana/public/temp/chart-configs',
  maxAgeHours: 24, // Fallback: Alert if fetch time is older than 24 hours (when no data dates found)
  
  // Telegram configuration (set these environment variables)
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID
};

// Promisify functions
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const gunzip = util.promisify(zlib.gunzip);

// Utility function to send Telegram message (handles long messages)
async function sendTelegramMessage(message) {
  if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
    console.error('⚠️  Telegram bot token or chat ID not configured');
    console.log('Message that would be sent:');
    console.log(message);
    return;
  }

  const fetch = (await import('node-fetch')).default;
  const url = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`;
  
  // Split message if it's too long (Telegram limit is ~4096 characters)
  const maxLength = 4000; // Leave some buffer
  const messages = [];
  
  if (message.length <= maxLength) {
    messages.push(message);
  } else {
    // Split by double newlines to keep related content together
    const chunks = message.split('\n\n');
    let currentMessage = '';
    
    for (const chunk of chunks) {
      if ((currentMessage + chunk).length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = '';
        }
        // If a single chunk is too long, split it further
        if (chunk.length > maxLength) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if ((currentMessage + line + '\n').length > maxLength) {
              if (currentMessage) {
                messages.push(currentMessage.trim());
                currentMessage = '';
              }
            }
            currentMessage += line + '\n';
          }
        } else {
          currentMessage = chunk + '\n\n';
        }
      } else {
        currentMessage += chunk + '\n\n';
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
  }
  
  // Send each message part
  for (let i = 0; i < messages.length; i++) {
    const messageText = messages.length > 1 ? 
      `${messages[i]}\n\n📄 _Part ${i + 1} of ${messages.length}_` : 
      messages[i];
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.telegramChatId,
          text: messageText
          // Removed parse_mode to avoid Markdown parsing issues
        })
      });
      
      if (response.ok) {
        console.log(`✅ Telegram notification part ${i + 1}/${messages.length} sent successfully`);
      } else {
        console.error(`❌ Failed to send Telegram notification part ${i + 1}:`, await response.text());
      }
      
      // Small delay between messages to avoid rate limiting
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error sending Telegram message part ${i + 1}:`, error.message);
    }
  }
}

// Function to read and decompress .gz file
async function readGzFile(filePath) {
  try {
    const compressed = await readFile(filePath);
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString());
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Function to read chart config file
async function readConfigFile(configPath) {
  try {
    const content = await readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading config ${configPath}:`, error.message);
    return null;
  }
}

// Function to get chart APIs from config
function getChartAPIs(config) {
  if (!config || !config.charts) return [];
  
  return config.charts.map(chart => ({
    title: chart.title,
    apiEndpoint: chart.apiEndpoint,
    apiKey: chart.apiKey ? `?api_key=${chart.apiKey}` : ''
  }));
}

// Function to format date difference
function formatTimeDifference(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
}

// Function to find the latest date in chart data
function findLatestDataDate(data) {
  if (!data || !data.charts || !Array.isArray(data.charts)) {
    return null;
  }
  
  let latestDate = null;
  const dateFields = ['block_date', 'month', 'date', 'day', 'timestamp'];
  
  for (const chart of data.charts) {
    if (!chart.data || !Array.isArray(chart.data)) continue;
    
    for (const record of chart.data) {
      for (const field of dateFields) {
        if (record[field]) {
          try {
            let dateStr = record[field];
            // Handle different date formats
            if (field === 'month' && dateStr.length === 7) {
              // Convert "2025-08" to "2025-08-01" for comparison
              dateStr = dateStr + '-01';
            }
            if (field === 'timestamp') {
              // Handle timestamp format
              dateStr = new Date(dateStr).toISOString().split('T')[0];
            }
            
            const recordDate = new Date(dateStr);
            if (!isNaN(recordDate.getTime())) {
              if (!latestDate || recordDate > latestDate) {
                latestDate = recordDate;
              }
            }
          } catch (error) {
            // Skip invalid dates
            continue;
          }
        }
      }
    }
  }
  
  return latestDate;
}

// Function to get yesterday's date
function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0); // Set to beginning of day
  return yesterday;
}

// Main monitoring function
async function monitorDataFreshness() {
  console.log('🔍 Starting data freshness monitoring...');
  
  try {
    // Get all .gz files
    const files = await readdir(CONFIG.chartDataDir);
    const gzFiles = files.filter(file => file.endsWith('.gz'));
    
    console.log(`📊 Found ${gzFiles.length} data files to check`);
    
    const outdatedFiles = [];
    const yesterday = getYesterday();
    
    // Check each file
    for (const file of gzFiles) {
      const filePath = path.join(CONFIG.chartDataDir, file);
      const data = await readGzFile(filePath);
      
      if (!data) {
        console.warn(`⚠️  Could not read data from ${file}`);
        continue;
      }
      
      // Find the latest date in the actual chart data
      const latestDataDate = findLatestDataDate(data);
      const fetchedAt = data.fetchedAt ? new Date(data.fetchedAt) : null;
      
      if (latestDataDate) {
        const isDataOutdated = latestDataDate < yesterday;
        const dataAge = formatTimeDifference(latestDataDate);
        const fetchAge = fetchedAt ? formatTimeDifference(fetchedAt) : 'unknown';
        
        console.log(`📄 ${file}: Latest data ${dataAge}, Fetched ${fetchAge}`);
        
        if (isDataOutdated) {
          outdatedFiles.push({
            file,
            latestDataDate,
            fetchedAt,
            dataAge,
            fetchAge,
            daysOld: Math.ceil((yesterday - latestDataDate) / (1000 * 60 * 60 * 24))
          });
        }
      } else {
        // Fallback to old logic if no data dates found
        if (fetchedAt) {
          const ageInHours = (new Date() - fetchedAt) / (1000 * 60 * 60);
          console.log(`📄 ${file}: No data dates found, checking fetch time - ${formatTimeDifference(fetchedAt)}`);
          
          if (ageInHours > CONFIG.maxAgeHours) {
            outdatedFiles.push({
              file,
              fetchedAt,
              fetchAge: formatTimeDifference(fetchedAt),
              dataAge: 'no data dates found',
              daysOld: Math.ceil(ageInHours / 24)
            });
          }
        } else {
          console.warn(`⚠️  No data dates or fetchedAt timestamp found in ${file}`);
        }
      }
    }
    
    // If we have outdated files, send notification
    if (outdatedFiles.length > 0) {
      console.log(`🚨 Found ${outdatedFiles.length} outdated files`);
      
      let message = `🚨 DATA FRESHNESS ALERT\n\n`;
      message += `Found ${outdatedFiles.length} file(s) with data older than yesterday:\n\n`;
      
      // Summary first
      message += `📋 SUMMARY:\n`;
      outdatedFiles.forEach((item, index) => {
        message += `${index + 1}. ${item.file} - Latest data: ${item.dataAge}\n`;
      });
      
      // Always show chart APIs for all files
      message += `\n📊 CHART APIs FOR ALL FILES:\n\n`;
      
      for (const item of outdatedFiles) {
        const configFileName = item.file.replace('.gz', '');
        const configPath = path.join(CONFIG.chartConfigDir, configFileName);
        
        message += `📊 ${item.file}\n`;
        message += `📅 Latest data: ${item.dataAge}\n`;
        message += `⏰ Fetched: ${item.fetchAge}\n`;
        
        // Get chart APIs from config
        const config = await readConfigFile(configPath);
        if (config) {
          const apis = getChartAPIs(config);
          if (apis.length > 0) {
            message += `🔗 ${apis.length} Chart API(s):\n`;
            apis.forEach((api, index) => {
              message += `${index + 1}. ${api.title}\n`;
              message += `   ${api.apiEndpoint}${api.apiKey}\n`;
            });
          } else {
            message += `🔗 No Chart APIs found\n`;
          }
        } else {
          message += `🔗 Config file not found\n`;
        }
        message += '\n';
      }
      
      await sendTelegramMessage(message);
    } else {
      console.log('✅ All data files are up to date!');
    }
    
  } catch (error) {
    console.error('❌ Error during monitoring:', error.message);
    
    // Send error notification
    const errorMessage = `❌ DATA MONITORING ERROR\n\nFailed to check data freshness: ${error.message}`;
    await sendTelegramMessage(errorMessage);
  }
}

// Run the monitoring
if (require.main === module) {
  console.log('🚀 Data Freshness Monitor v1.0');
  console.log('================================');
  
  if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
    console.log('💡 To enable Telegram notifications, set these environment variables:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token');
    console.log('   TELEGRAM_CHAT_ID=your_chat_id');
    console.log('');
  }
  
  monitorDataFreshness()
    .then(() => {
      console.log('✅ Monitoring completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { monitorDataFreshness, CONFIG }; 