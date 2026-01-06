import { useEffect, useState, useRef } from 'react';
import type { HeartRateEntry } from '../types/biosensor';
import { API_ENDPOINTS, API_HEADERS } from '../constants/api';

export const useHeartRateWebSocket = (url = API_ENDPOINTS.WEBSOCKET) => {
  const [heartRateTimeSeries, setHeartRateTimeSeries] = useState<HeartRateEntry[] | null>(null);
  const [isConnected, setIsConnected] = useState(false); // Websocket connection
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null); // Websocket connection persists across re-renders
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Helper function to get last 24 hours datetime range
  const getLast24HoursRange = () => {
    const endDateTime = new Date();
    const startDateTime = new Date(endDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    return {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString()
    };
  };

  // Helper function to fetch biosensor data with datetime parameters
  const fetchBiosensorData = async () => {
    const { start, end } = getLast24HoursRange();
    const apiUrl = `${API_ENDPOINTS.OURA_TIMESERIES_LIVE}?start_datetime=${start}&end_datetime=${end}`;

    console.log('Fetching from: API URL:', apiUrl);

    // UPDATE FOR PRODUCTION - RM NGROK
    const response = await fetch(apiUrl, {
      headers: API_HEADERS.NGROK_SKIP_WARNING
    });

    const jsonData = await response.json();
    console.log('Response data:', jsonData);
    console.log('Data fetched (initial):', jsonData.data?.length, 'records');

    if (jsonData.data && jsonData.data.length > 0) {
      console.log('First timestamp in response:', jsonData.data[0].timestamp);
      console.log('Last timestamp in response:', jsonData.data[jsonData.data.length - 1].timestamp);
    }

    return jsonData.data;
  };

  useEffect(() => {
    const connect = () => {
      try {
        console.log('Connecting to WebSocket:', url);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = async () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);

          // Fetch initial data immediately on connect
          try {
            console.log('Fetching INITIAL biosensor data...');
            const data = await fetchBiosensorData();
            setHeartRateTimeSeries(data);
          } catch (err) {
            console.error('Error fetching initial data:', err);
            setError('Failed to fetch initial biosensor data');
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket notification received:', data);

            // Handle different message types from backend-v2
            if (data.type === 'heartrate_update' || data.type === 'session_update') {
              // Backend-v2 sends heartrate_update and session_update notifications
              console.log(`${data.type} notification received:`, data.message);
              console.log('Fetching LATEST biosensor data...');
              try {
                const latestData = await fetchBiosensorData();
                setHeartRateTimeSeries(latestData);
              } catch (err) {
                console.error('Error fetching updated data:', err);
                setError('Failed to fetch updated biosensor data');
              }
            } else if (data.type === 'pong') {
              // Echo/pong message from server - connection is alive
              console.log('Received pong from server:', data.message);
            } else if (data.data) {
              // Direct data payload
              setHeartRateTimeSeries(data.data);
            } else if (Array.isArray(data)) {
              // Direct array of biosensor entries
              setHeartRateTimeSeries(data);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
            setError('Failed to parse WebSocket message');
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 5000);
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { heartRateTimeSeries, isConnected, error };
};