import './App.css'
import React from 'react';
import BiosensorPlot from './components/BiosensorPlot';
import { useBiosensorWebSocket } from './hooks/useBiosensorWebSocket';

function App() {
  const { biosensorTimeSeries, isConnected, error } = useBiosensorWebSocket();

  return (
    <>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px' }}>
        {error && <span style={{ color: 'red', marginLeft: '10px' }}>Error: {error}</span>}
      </div>
      <BiosensorPlot biosensorTimeSeries={biosensorTimeSeries} isConnected={isConnected} />
      <strong>WebSocket Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </>
  )
}

export default App
