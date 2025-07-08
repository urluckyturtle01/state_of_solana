// Background service for automatic chart data updates
class AutoUpdater {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('⚡ Auto-updater already running');
      return;
    }

    console.log('🚀 Starting automatic chart data updater (every 10 minutes)');
    this.isRunning = true;

    // Run immediately on start (after a short delay)
    setTimeout(() => {
      this.performUpdate();
    }, 30000); // Wait 30 seconds after app start

    // Set up recurring updates
    this.intervalId = setInterval(() => {
      this.performUpdate();
    }, this.UPDATE_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto-updater stopped');
  }

  private async performUpdate() {
    try {
      console.log('⏰ Triggering automatic chart data update...');
      
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-update-temp-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Automatic update completed successfully');
        console.log(`📊 Next update scheduled for: ${result.nextUpdate}`);
      } else {
        // Don't log errors for "too soon" messages - those are expected
        if (!result.message?.includes('Too soon to update')) {
          console.warn('⚠️ Automatic update failed:', result.message);
        }
      }
    } catch (error) {
      console.error('❌ Error during automatic update:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.UPDATE_INTERVAL / (60 * 1000)
    };
  }
}

// Create singleton instance
const autoUpdater = new AutoUpdater();

// Start auto-updater when this module is imported (in server environment)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only start in production or development server
  autoUpdater.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    autoUpdater.stop();
  });
  
  process.on('SIGINT', () => {
    autoUpdater.stop();
    process.exit(0);
  });
}

export default autoUpdater; 