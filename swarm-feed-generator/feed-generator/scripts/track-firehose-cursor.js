/**
 * Track Firehose Cursor
 * 
 * This script tracks the firehose cursor and helps recover from disconnections.
 * It periodically checks the firehose health endpoint and logs the status.
 * If the firehose is disconnected, it will attempt to restart the service.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const FEED_GENERATOR_URL = process.env.FEED_GENERATOR_URL || 'https://swarm-feed-generator.onrender.com';
const CHECK_INTERVAL = process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL, 10) : 60000; // 1 minute
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, '../logs/firehose-cursor.log');
const CURSOR_FILE = process.env.CURSOR_FILE || path.join(__dirname, '../data/last-cursor.json');
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_API_KEY = process.env.RENDER_API_KEY;

// Ensure directories exist
const logDir = path.dirname(LOG_FILE);
const dataDir = path.dirname(CURSOR_FILE);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Save cursor to file
function saveCursor(cursor) {
  if (!cursor) return;
  
  try {
    fs.writeFileSync(CURSOR_FILE, JSON.stringify({ cursor, timestamp: new Date().toISOString() }));
    log(`Saved cursor ${cursor} to file`);
  } catch (err) {
    log(`Error saving cursor to file: ${err.message}`);
  }
}

// Load cursor from file
function loadCursor() {
  try {
    if (fs.existsSync(CURSOR_FILE)) {
      const data = JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8'));
      log(`Loaded cursor ${data.cursor} from file (saved at ${data.timestamp})`);
      return data.cursor;
    }
  } catch (err) {
    log(`Error loading cursor from file: ${err.message}`);
  }
  return null;
}

// Check firehose health
async function checkFirehoseHealth() {
  try {
    const response = await axios.get(`${FEED_GENERATOR_URL}/health/firehose`);
    const { status, lastCursor, timestamp } = response.data;
    
    log(`Firehose status: ${status}, lastCursor: ${lastCursor}, timestamp: ${timestamp}`);
    
    if (lastCursor) {
      saveCursor(lastCursor);
    }
    
    return { status, lastCursor, timestamp };
  } catch (err) {
    if (err.response) {
      const { status, data } = err.response;
      log(`Firehose health check failed with status ${status}: ${JSON.stringify(data)}`);
      
      if (data && data.lastCursor) {
        saveCursor(data.lastCursor);
      }
      
      return { status: 'error', lastCursor: data?.lastCursor, error: data };
    } else {
      log(`Firehose health check failed: ${err.message}`);
      return { status: 'error', error: err.message };
    }
  }
}

// Restart Render service
async function restartRenderService() {
  if (!RENDER_SERVICE_ID || !RENDER_API_KEY) {
    log('Cannot restart service: RENDER_SERVICE_ID or RENDER_API_KEY not set');
    return false;
  }
  
  try {
    log(`Attempting to restart Render service ${RENDER_SERVICE_ID}`);
    
    const response = await axios.post(
      `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/restart`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Service restart initiated: ${JSON.stringify(response.data)}`);
    return true;
  } catch (err) {
    log(`Failed to restart service: ${err.message}`);
    return false;
  }
}

// Main function
async function main() {
  log('Starting firehose cursor tracking');
  
  // Load last known cursor
  const savedCursor = loadCursor();
  if (savedCursor) {
    log(`Last known cursor: ${savedCursor}`);
  } else {
    log('No saved cursor found');
  }
  
  // Initial health check
  const initialHealth = await checkFirehoseHealth();
  log(`Initial firehose health: ${initialHealth.status}`);
  
  // Set up interval for regular checks
  let consecutiveFailures = 0;
  
  setInterval(async () => {
    const health = await checkFirehoseHealth();
    
    if (health.status !== 'connected') {
      consecutiveFailures++;
      log(`Firehose disconnected (failure #${consecutiveFailures})`);
      
      // After 3 consecutive failures, try to restart the service
      if (consecutiveFailures >= 3) {
        log('Multiple consecutive failures detected, attempting to restart service');
        const restarted = await restartRenderService();
        
        if (restarted) {
          log('Service restart initiated, resetting failure counter');
          consecutiveFailures = 0;
        }
      }
    } else {
      // Reset failure counter on success
      if (consecutiveFailures > 0) {
        log(`Firehose reconnected after ${consecutiveFailures} failures`);
        consecutiveFailures = 0;
      }
    }
  }, CHECK_INTERVAL);
}

// Run the script
main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
}); 