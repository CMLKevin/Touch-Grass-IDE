#!/usr/bin/env node

/**
 * Fetch Top 1000 Twitch Streamers with Categories
 * 
 * Sources:
 *   - Kaggle dataset (top 1000 ranked by watch time)
 *   - Twitch API (for user IDs and current categories)
 * 
 * Usage:
 *   node fetch-top-streamers.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
 *   
 * Output: top-streamers.json
 */

const https = require('https');
const fs = require('fs');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
Usage: node fetch-top-streamers.js <CLIENT_ID> <CLIENT_SECRET>

To get credentials:
  1. Go to https://dev.twitch.tv/console/apps
  2. Click "Register Your Application"
  3. Name: "Touch Grass IDE" (or anything)
  4. OAuth Redirect URL: http://localhost
  5. Category: Application Integration
  6. Click "Create"
  7. Copy the Client ID
  8. Click "New Secret" and copy the Client Secret
`);
  process.exit(1);
}

// CSV URL - top 1000 streamers ranked by watch time
const CSV_URL = 'https://raw.githubusercontent.com/phelpsbp/Twitch-Streamer-Analysis/main/twitchdata-update.csv';

// =============================================================================
// HTTP Helpers
// =============================================================================

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TouchGrassIDE/1.0',
        ...headers
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(url, body = '') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Failed to parse: ' + data));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// =============================================================================
// Twitch API
// =============================================================================

async function getAccessToken() {
  console.log('🔑 Getting Twitch OAuth token...');
  
  const body = 'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&grant_type=client_credentials';
  const { status, data } = await httpPost('https://id.twitch.tv/oauth2/token', body);
  
  if (status !== 200) {
    throw new Error('Failed to get token: ' + JSON.stringify(data));
  }
  
  console.log('✅ Got access token\n');
  return data.access_token;
}

async function fetchUsers(token, logins) {
  // Twitch API allows max 100 users per request
  const params = logins.map(l => 'login=' + encodeURIComponent(l)).join('&');
  const url = 'https://api.twitch.tv/helix/users?' + params;
  
  const { status, data } = await httpGet(url, {
    'Client-ID': CLIENT_ID,
    'Authorization': 'Bearer ' + token
  });
  
  if (status !== 200) {
    console.error('Failed to fetch users: ' + data);
    return [];
  }
  
  return JSON.parse(data).data || [];
}

async function fetchChannels(token, broadcasterIds) {
  // Get channel info (includes game_name)
  const params = broadcasterIds.map(id => 'broadcaster_id=' + id).join('&');
  const url = 'https://api.twitch.tv/helix/channels?' + params;
  
  const { status, data } = await httpGet(url, {
    'Client-ID': CLIENT_ID,
    'Authorization': 'Bearer ' + token
  });
  
  if (status !== 200) {
    console.error('Failed to fetch channels: ' + data);
    return [];
  }
  
  return JSON.parse(data).data || [];
}

// =============================================================================
// Category Mapping
// =============================================================================

function determineCategory(gameName, language) {
  const name = (gameName || '').toLowerCase();
  
  // Just Chatting
  if (name.includes('just chatting')) return 'justChatting';
  
  // Software & Dev
  if (name.includes('software') || name.includes('development') || 
      name.includes('programming') || name.includes('science & technology')) {
    return 'softwareDev';
  }
  
  // Music
  if (name.includes('music') || name.includes('singing') || name.includes('dj set')) {
    return 'music';
  }
  
  // IRL / Creative
  if (name.includes('art') || name.includes('asmr') || name.includes('travel') ||
      name.includes('pool') || name.includes('hot tub') || name.includes('beach') ||
      name.includes('irl') || name.includes('talk show') || name.includes('food')) {
    return 'irl';
  }
  
  // Gambling
  if (name.includes('slots') || name.includes('casino') || name.includes('gambling') ||
      name.includes('poker') || name.includes('blackjack')) {
    return 'gambling';
  }
  
  // Sports / Esports
  if (name.includes('esport') || name.includes('tournament') || 
      name.includes('sports') || name.includes('football') || name.includes('soccer')) {
    return 'sports';
  }
  
  // Default to gaming
  return 'gaming';
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🎮 Fetching Top 1000 Twitch Streamers\n');
  console.log('='.repeat(50));
  
  // Step 1: Download CSV
  console.log('\n📥 Downloading streamer rankings from Kaggle dataset...');
  const { data: csvData } = await httpGet(CSV_URL);
  
  // Parse CSV
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const channelIndex = headers.indexOf('Channel');
  const languageIndex = headers.indexOf('Language');
  
  const rankedStreamers = lines.slice(1).map((line, rank) => {
    // Handle CSV - split by comma
    const cols = line.split(',');
    // Clean the channel name - remove parenthetical alternate names
    let channelName = cols[channelIndex] || '';
    // Handle names like "풍월량 (hanryang1125)" - extract the login in parentheses
    const parenMatch = channelName.match(/\(([a-zA-Z0-9_]+)\)/);
    if (parenMatch) {
      channelName = parenMatch[1];
    }
    
    return {
      rank: rank + 1,
      login: channelName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      originalName: cols[channelIndex],
      csvLanguage: cols[languageIndex] || 'English'
    };
  }).filter(s => s.login.length > 0);
  
  console.log('   Found ' + rankedStreamers.length + ' streamers in ranking\n');
  
  // Step 2: Get Twitch OAuth token
  const token = await getAccessToken();
  
  // Step 3: Fetch user data from Twitch API in batches of 100
  console.log('📡 Fetching user data from Twitch API...');
  
  const allUsers = new Map();
  const batchSize = 100;
  
  for (let i = 0; i < rankedStreamers.length; i += batchSize) {
    const batch = rankedStreamers.slice(i, i + batchSize);
    const logins = batch.map(s => s.login);
    
    const users = await fetchUsers(token, logins);
    
    for (const user of users) {
      allUsers.set(user.login.toLowerCase(), {
        id: user.id,
        login: user.login,
        display_name: user.display_name
      });
    }
    
    const progress = Math.min(i + batchSize, rankedStreamers.length);
    console.log('   Processed ' + progress + '/' + rankedStreamers.length + ' users (' + allUsers.size + ' found)');
    
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n✅ Found ' + allUsers.size + ' users on Twitch\n');
  
  // Step 4: Fetch channel data (for categories) in batches
  console.log('📡 Fetching channel categories from Twitch API...');
  
  const userIds = Array.from(allUsers.values()).map(u => u.id);
  const channelData = new Map();
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const channels = await fetchChannels(token, batch);
    
    for (const channel of channels) {
      channelData.set(channel.broadcaster_id, {
        game_name: channel.game_name || '',
        broadcaster_language: channel.broadcaster_language || 'en'
      });
    }
    
    const progress = Math.min(i + batchSize, userIds.length);
    console.log('   Processed ' + progress + '/' + userIds.length + ' channels');
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Step 5: Build final output maintaining original ranking
  console.log('\n📊 Building final dataset...');
  
  const output = {
    streamers: []
  };
  
  for (const streamer of rankedStreamers) {
    const user = allUsers.get(streamer.login);
    if (!user) continue; // Skip if user not found on Twitch
    
    const channel = channelData.get(user.id) || {};
    const category = determineCategory(channel.game_name, streamer.csvLanguage);
    
    output.streamers.push({
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      category: category
    });
  }
  
  // Step 6: Print stats
  const categoryCount = {};
  for (const s of output.streamers) {
    categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
  }
  
  console.log('\n📁 Category breakdown:');
  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCategories) {
    console.log('   ' + cat + ': ' + count);
  }
  
  // Step 7: Save
  const outputPath = 'top-streamers.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log('\n✅ Saved ' + output.streamers.length + ' streamers to ' + outputPath);
  console.log('\n🎯 Top 10:');
  output.streamers.slice(0, 10).forEach((s, i) => {
    console.log('   ' + (i + 1) + '. ' + s.display_name + ' (' + s.category + ')');
  });
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
