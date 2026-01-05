import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

interface HeartRateEntry {
  timestamp: string | null;
  measurement_type: string | null;
  measurement_value: number | string | null;
  measurement_unit: string | null;
  sensor_mode: string | null;
  data_source: string | null;
  device_source: string | null;
}

interface HeartRatePlotProps {
  heartRateTimeSeries: HeartRateEntry[] | null;
  isConnected: boolean;
}

type DataSeries = 'hr_non_session' | 'hr_session' | 'hrv' | 'motion_count';

const HeartRatePlot: React.FC<HeartRatePlotProps> = ({ heartRateTimeSeries, isConnected }) => {
  // State to track which data series are selected
  const [selectedSeries, setSelectedSeries] = useState<DataSeries[]>([
    'hr_non_session',
    'hr_session',
    'hrv',
    'motion_count'
  ]);

  // State for datetime range controls
  const [customData, setCustomData] = useState<HeartRateEntry[] | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [startDatetime, setStartDatetime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 24);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  });
  const [endDatetime, setEndDatetime] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const toggleSeries = (series: DataSeries) => {
    setSelectedSeries(prev =>
      prev.includes(series)
        ? prev.filter(s => s !== series)
        : [...prev, series]
    );
  };

  const fetchCustomRange = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const start = new Date(startDatetime).toISOString();
      const end = isLiveMode ? new Date().toISOString() : new Date(endDatetime).toISOString();

      const apiUrl = `https://keith-sorbic-huggingly.ngrok-free.dev/ouratimeseries/live?start_datetime=${start}&end_datetime=${end}`;

      console.log('Fetching custom range:', start, 'to', end);

      const response = await fetch(apiUrl, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      const jsonData = await response.json();

      // Check if we hit the API limit (assuming backend returns max 1000 records)
      if (jsonData.data && jsonData.data.length >= 1000) {
        alert('⚠️ API Record Limit Reached!\n\nThe query returned 1000 records (the maximum). There may be more data available. Try narrowing your date range to see all data.');
      }

      setCustomData(jsonData.data);
      console.log('Custom data fetched:', jsonData.data?.length, 'records');
    } catch (err) {
      console.error('Error fetching custom range:', err);
      setFetchError('Failed to fetch custom date range data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLive = () => {
    setCustomData(null);
    setIsLiveMode(true);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setStartDatetime(yesterday.toISOString().slice(0, 16));
    setEndDatetime(now.toISOString().slice(0, 16));
  };

  // Auto-refresh custom range when WebSocket sends new data in Live mode
  const previousWebSocketDataRef = useRef<HeartRateEntry[] | null>(null);

  useEffect(() => {
    // Check if WebSocket data actually changed (not just initial render)
    const webSocketDataChanged = previousWebSocketDataRef.current !== heartRateTimeSeries;
    previousWebSocketDataRef.current = heartRateTimeSeries;

    // If we're viewing custom data AND in Live mode AND WebSocket data updated
    if (customData && isLiveMode && webSocketDataChanged && heartRateTimeSeries) {
      console.log('WebSocket notification received in Live mode - auto-refreshing custom range...');
      fetchCustomRange();
    }
  }, [heartRateTimeSeries]); // Trigger when WebSocket data changes

  console.log('=== HeartRatePlot Debug ===');
  console.log('Raw heartRateTimeSeries:', heartRateTimeSeries);
  console.log('Is array?', Array.isArray(heartRateTimeSeries));
  console.log('Length:', heartRateTimeSeries?.length);

  if (heartRateTimeSeries && heartRateTimeSeries.length > 0) {
    console.log('First entry:', heartRateTimeSeries[0]);
    console.log('Last entry:', heartRateTimeSeries[heartRateTimeSeries.length - 1]);
  }

  const getNonNullEntries = (data: HeartRateEntry[] | null): HeartRateEntry[] => {
    if (!data || !Array.isArray(data)) {
      console.log('getNonNullEntries: No data or not an array');
      return [];
    }
    const filtered = data.filter((entry) => entry.timestamp !== null && entry.measurement_value !== null);
    console.log(`getNonNullEntries: Filtered ${data.length} -> ${filtered.length} entries`);
    return filtered;
  };

  const filterByDateRange = (entries: HeartRateEntry[], startDate: string, endDate: string): HeartRateEntry[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp!);
      const inRange = entryDate >= start && entryDate <= end;
      return inRange;
    });

    // Debug: show what got filtered
    if (entries.length > 0) {
      console.log('Date filter - Start:', start.toISOString());
      console.log('Date filter - End:', end.toISOString());
      console.log('Sample entry dates (first 3):');
      entries.slice(0, 3).forEach((entry, i) => {
        const entryDate = new Date(entry.timestamp!);
        console.log(`  ${i}: ${entry.timestamp} -> ${entryDate.toISOString()}`);
      });
    }

    return filtered;
  };

  const filterByMeasurementType = (entries: HeartRateEntry[], measurementType: string): HeartRateEntry[] => {
    return entries.filter((entry) => entry.measurement_type === measurementType);
  };

  const convertUtcToPst = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    date.setHours(date.getHours() - 8); // Convert from UTC to PST (UTC-8)
    return date.toISOString().replace('Z', '');
  };

  const extractHeartRateValues = (entries: HeartRateEntry[]): number[] => {
    return entries.map((entry) => {
      const value = entry.measurement_value;
      return typeof value === 'string' ? parseFloat(value) : Number(value);
    });
  };

  const extractTimestamps = (entries: HeartRateEntry[]): string[] => {
    return entries.map((entry) => convertUtcToPst(entry.timestamp!));
  };

  // Use custom data if available, otherwise use live WebSocket data
  const dataToUse = customData || heartRateTimeSeries;
  const nonNullEntries = getNonNullEntries(dataToUse);

  console.log('Total non-null entries:', nonNullEntries.length);

  // Log first few timestamps to see format
  if (nonNullEntries.length > 0) {
    console.log('First 5 timestamps:', nonNullEntries.slice(0, 5).map(e => e.timestamp));
    console.log('Last 5 timestamps:', nonNullEntries.slice(-5).map(e => e.timestamp));
  }

  // Use all entries (already filtered to 24 hours by API)
  const dateFilteredEntries = nonNullEntries;

  console.log('Total entries in date range:', dateFilteredEntries.length);
  console.log('Unique measurement types:', [...new Set(dateFilteredEntries.map(e => e.measurement_type))]);
  console.log('Unique sensor modes:', [...new Set(dateFilteredEntries.map(e => e.sensor_mode))]);

  // Get all heartrate entries first
  const allHREntries = filterByMeasurementType(dateFilteredEntries, 'heartrate');
  console.log('Total heartrate entries:', allHREntries.length);
  console.log('Sample heartrate entry:', allHREntries[0]);

  // Split data into four series
  // Backend-v2 measurement types:
  // - 'heartrate' (from /heartrate endpoint, sensor_mode varies)
  // - 'heartrate_session' (from /session endpoint)
  // - 'hrv' (heart rate variability from /session endpoint)
  // - 'motion_count' (motion data from /session endpoint)

  const hrNonSessionEntries = filterByMeasurementType(dateFilteredEntries, 'heartrate');
  const hrSessionEntries = filterByMeasurementType(dateFilteredEntries, 'heartrate_session');
  const hrvEntries = filterByMeasurementType(dateFilteredEntries, 'hrv');
  const motionEntries = filterByMeasurementType(dateFilteredEntries, 'motion_count');

  console.log('HR (non-session/heartrate):', hrNonSessionEntries.length, 'values');
  console.log('Sample non-session entry:', hrNonSessionEntries[0]);
  console.log('HR (session/heartrate_session):', hrSessionEntries.length, 'values');
  console.log('Sample session entry:', hrSessionEntries[0]);
  console.log('HRV:', hrvEntries.length, 'values');
  console.log('Sample HRV entry:', hrvEntries[0]);
  console.log('Motion Count:', motionEntries.length, 'values');
  console.log('Sample motion entry:', motionEntries[0]);

  // If no data at all, show a message
  if (!heartRateTimeSeries || heartRateTimeSeries.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>No Data Available</h3>
        <p>Waiting for biosensor data from backend-v2...</p>
        <p>WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      </div>
    );
  }

  // Build data array based on selected series
  const plotData = [];

  if (selectedSeries.includes('hr_non_session')) {
    plotData.push({
      x: extractTimestamps(hrNonSessionEntries),
      y: extractHeartRateValues(hrNonSessionEntries),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Heart Rate (Non-Session)',
      line: {
        shape: 'spline' as const,
        smoothing: 0.0,
        color: 'red'
      },
    });
  }

  if (selectedSeries.includes('hr_session')) {
    plotData.push({
      x: extractTimestamps(hrSessionEntries),
      y: extractHeartRateValues(hrSessionEntries),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Heart Rate (Session)',
      line: {
        shape: 'spline' as const,
        smoothing: 0.0,
        color: 'orange'
      },
    });
  }

  if (selectedSeries.includes('hrv')) {
    plotData.push({
      x: extractTimestamps(hrvEntries),
      y: extractHeartRateValues(hrvEntries),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Heart Rate Variability',
      line: {
        shape: 'spline' as const,
        smoothing: 0.0,
        color: 'blue'
      },
    });
  }

  if (selectedSeries.includes('motion_count')) {
    plotData.push({
      x: extractTimestamps(motionEntries),
      y: extractHeartRateValues(motionEntries),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Motion Count',
      line: {
        shape: 'spline' as const,
        smoothing: 0.0,
        color: 'green'
      },
    });
  }

  return (
    <div>
      {/* Datetime Range Controls */}
      <div style={{
        padding: '15px',
        backgroundColor: '#e8f4f8',
        border: '1px solid #b3d9e6',
        borderRadius: '5px',
        marginBottom: '10px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Date Range:</strong> {customData ? '📅 Custom Range' : '🔴 Live (Last 24 Hours)'}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <strong>Start:</strong>
            <input
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              style={{ marginLeft: '5px', padding: '5px' }}
            />
          </label>
          <label>
            <strong>End:</strong>
            <input
              type="datetime-local"
              value={endDatetime}
              onChange={(e) => setEndDatetime(e.target.value)}
              disabled={isLiveMode}
              style={{ marginLeft: '5px', padding: '5px' }}
            />
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isLiveMode}
              onChange={(e) => setIsLiveMode(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Live (Now)
          </label>
          <button
            onClick={fetchCustomRange}
            disabled={isLoading}
            style={{
              padding: '5px 15px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            {isLoading ? 'Loading...' : 'Fetch Range'}
          </button>
          {customData && (
            <button
              onClick={resetToLive}
              style={{
                padding: '5px 15px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Reset to Live
            </button>
          )}
        </div>
        {fetchError && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            ⚠️ {fetchError}
          </div>
        )}
      </div>

      {/* Data Series Selection Controls */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '5px',
        marginBottom: '15px'
      }}>
        <strong style={{ marginRight: '15px' }}>Select Data to Display:</strong>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSeries.includes('hr_non_session')}
            onChange={() => toggleSeries('hr_non_session')}
            style={{ marginRight: '5px' }}
          />
          <span style={{ color: 'red' }}>●</span> Heart Rate (Non-Session)
        </label>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSeries.includes('hr_session')}
            onChange={() => toggleSeries('hr_session')}
            style={{ marginRight: '5px' }}
          />
          <span style={{ color: 'orange' }}>●</span> Heart Rate (Session)
        </label>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSeries.includes('hrv')}
            onChange={() => toggleSeries('hrv')}
            style={{ marginRight: '5px' }}
          />
          <span style={{ color: 'blue' }}>●</span> HRV
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSeries.includes('motion_count')}
            onChange={() => toggleSeries('motion_count')}
            style={{ marginRight: '5px' }}
          />
          <span style={{ color: 'green' }}>●</span> Motion Count
        </label>
      </div>

      {/* Plot */}
      <Plot
        data={plotData}
        layout={{
          width: 1200,
          height: 600,
          title: { text: 'Biosensor Data - Last 24 Hours (Backend-v2)' },
          xaxis: { title: 'Time (PST)' },
          yaxis: { title: 'Value' },
          showlegend: true,
          legend: {
            x: 1,
            xanchor: 'right',
            y: 1
          }
        }}
      />
    </div>
  );
};

export default HeartRatePlot;
