#!/bin/bash
# Data Freshness Monitor Runner
# This script automatically loads .env variables and runs the monitor

cd /root/state_of_solana

# Load environment variables from .env file
export $(cat .env | xargs)

# Run the monitoring script
node monitor-data-freshness.js 

# hello world