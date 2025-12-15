// Test script to check backend connection
// Run this in browser console: import('./test-connection.js')

import axios from 'axios';

export async function testBackendConnection() {
  try {
    console.log('Testing backend connection...');
    const response = await axios.get('http://localhost:8000/health');
    console.log('✅ Backend is reachable:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Backend is not running. Start it with: python main.py');
    }
    return false;
  }
}

