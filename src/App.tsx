import './App.css'
import React from 'react';
import HeartRatePlot from './components/HeartRatePlot';
import { useHeartRateWebSocket } from './hooks/useHeartRateWebSocket';

function App() {
  const { heartRateTimeSeries, isConnected, error } = useHeartRateWebSocket();

  return (
    <>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px' }}>
        <strong>WebSocket Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {error && <span style={{ color: 'red', marginLeft: '10px' }}>Error: {error}</span>}
      </div>
      <HeartRatePlot heartRateTimeSeries={heartRateTimeSeries} isConnected={isConnected} />
    </>
  )
}

export default App
