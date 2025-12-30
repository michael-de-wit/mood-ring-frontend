import { useEffect, useState, useRef } from 'react';

interface HeartRateEntry {
  timestamp: string | null;
  measurement_type: string | null;
  measurement_value: number | string | null;
  measurement_unit: string | null;
  sensor_mode: string | null;
  data_source: string | null;
  device_source: string | null;
}

export const useHeartRateWebSocket = (url = 'wss://keith-sorbic-huggingly.ngrok-free.dev/ws/ouratimeseries') => {
  const [heartRateTimeSeries, setHeartRateTimeSeries] = useState<HeartRateEntry[] | null>(null);
  const [isConnected, setIsConnected] = useState(false); // Websocket connection
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null); // Websocket connection persists across re-renders
  const reconnectTimeoutRef = useRef<number | null>(null);

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
            console.log('Fetching initial biosensor data...');
            const response = await fetch('https://keith-sorbic-huggingly.ngrok-free.dev/ouratimeseries/live', {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const jsonData = await response.json();
            console.log("jsonData", {jsonData});
            console.log('Initial data fetched:', jsonData.data?.length, 'records');
            setHeartRateTimeSeries(jsonData.data);
          } catch (err) {
            console.error('Error fetching initial data:', err);
            setError('Failed to fetch initial biosensor data');
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket received:', data);

            // Handle different message types
            if (data.type === 'ouratimeseries_update' || data.type === 'heartrate_update') {
              // Fetch the latest data from the REST endpoint when notified
              console.log('Biosensor data update notification received, fetching latest data...');
              try {
                const response = await fetch('https://keith-sorbic-huggingly.ngrok-free.dev/ouratimeseries/live', {
                  headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const jsonData = await response.json();
                console.log('Updated data fetched:', jsonData.data?.length, 'records');
                setHeartRateTimeSeries(jsonData.data);
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