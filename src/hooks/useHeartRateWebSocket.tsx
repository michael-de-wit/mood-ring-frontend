import { useEffect, useState, useRef } from 'react';

interface HeartRateEntry {
  timestamp: string;
  bpm: number;
  source: string;
}

export const useHeartRateWebSocket = (url = 'https://keith-sorbic-huggingly.ngrok-free.dev/ws/heartrate') => {
  const [heartRateTimeSeries, setHeartRateTimeSeries] = useState<HeartRateEntry[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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
            console.log('Fetching initial heart rate data...');
            const response = await fetch('https://keith-sorbic-huggingly.ngrok-free.dev/heartratetimeseries/live', {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const jsonData = await response.json();
            console.log('Initial data fetched:', jsonData.data?.length, 'records');
            setHeartRateTimeSeries(jsonData.data);
          } catch (err) {
            console.error('Error fetching initial data:', err);
            setError('Failed to fetch initial heart rate data');
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket received:', data);

            // Handle different message types
            if (data.type === 'heartrate_update') {
              // Fetch the latest data from the REST endpoint when notified
              console.log('Heart rate update notification received, fetching latest data...');
              try {
                const response = await fetch('https://keith-sorbic-huggingly.ngrok-free.dev/heartratetimeseries/live', {
                  headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const jsonData = await response.json();
                console.log('Updated data fetched:', jsonData.data?.length, 'records');
                setHeartRateTimeSeries(jsonData.data);
              } catch (err) {
                console.error('Error fetching updated data:', err);
                setError('Failed to fetch updated heart rate data');
              }
            } else if (data.data) {
              // Direct data payload
              setHeartRateTimeSeries(data.data);
            } else if (Array.isArray(data)) {
              // Direct array of heart rate entries
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