// API configuration constants

// TO UPDATE FOR PRODUCTION: Replace ngrok URL with production API URL
export const API_BASE_URL = 'https://keith-sorbic-huggingly.ngrok-free.dev';

export const API_ENDPOINTS = {
  WEBSOCKET: `wss://keith-sorbic-huggingly.ngrok-free.dev/ws/ouratimeseries`,
  OURA_TIMESERIES_LIVE: `${API_BASE_URL}/ouratimeseries/live`,
  HEARTRATE_TIMESERIES_LIVE: `${API_BASE_URL}/heartratetimeseries/live`,
} as const;

export const API_HEADERS = {
  NGROK_SKIP_WARNING: { 'ngrok-skip-browser-warning': 'true' },
} as const;

// API limits
export const API_LIMITS = {
  DEFAULT_RECORD_LIMIT: 10000,
} as const;