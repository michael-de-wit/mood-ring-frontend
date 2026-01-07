import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { BiosensorEntry, DataSeries } from '../types/biosensor';
import { API_ENDPOINTS, API_HEADERS } from '../constants/api';

interface BiosensorPlotProps {
  biosensorTimeSeries: BiosensorEntry[] | null;
  isConnected: boolean;
}

const BiosensorPlot: React.FC<BiosensorPlotProps> = ({ biosensorTimeSeries, isConnected }) => {
  // State to track which data series are selected for display
  // Default to show all available data series
  const [selectedSeries, setSelectedSeries] = useState<DataSeries[]>([
    'hr_non_session',
    'hr_session',
    'hrv'
    // ,'motion_count' // Exclude motion count from initial default
  ]);

  // State for datetime range controls
  const [customData, setCustomData] = useState<BiosensorEntry[] | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [startDatetime, setStartDatetime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 24); // Set default start datetime to 24 hours prior to current time
                                         // e.g. 'Sun Jan 04 2026 14:52:28 GMT-0800 (Pacific Standard Time)'
    const date_iso8601 = date.toISOString().slice(0, 16); // Format for UTC ISO-8601 string
                                                          // e.g. '2026-01-04T22:51'
    return date_iso8601;
  });
  const [endDatetime, setEndDatetime] = useState(() => {
    return new Date().toISOString().slice(0, 16); // i.e. default to the current time
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const toggleSeries = (series: DataSeries) => { // e.g. User unchecks 'HRV'
    setSelectedSeries(prev =>
      prev.includes(series) // e.g. Does the previous set of selected series include a checked 'HRV'
        ? prev.filter(s => s !== series) // e.g. If 'HRV' is in the set, remove it
                                         // i.e. Go through each data series in the current set, only keep the series
                                         // which do not equal the selected series
        : [...prev, series] // e.g. If 'HRV' is not in the set, add it
    );
  };

  const fetchCustomRange = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const start = new Date(startDatetime).toISOString();
      const end = isLiveMode ? new Date().toISOString() : new Date(endDatetime).toISOString();

      const apiUrl = `${API_ENDPOINTS.OURA_TIMESERIES_LIVE}?start_datetime=${start}&end_datetime=${end}`;

      console.log('Fetching custom range:', start, 'to', end);

      const response = await fetch(apiUrl, {
        headers: API_HEADERS.NGROK_SKIP_WARNING
      });

      const jsonData = await response.json();

      // Check if we hit the record limit in the API response
      const recordCount = jsonData.count || jsonData.data?.length || 0;
      const recordLimit = jsonData.limit || 10000;

      // If we do hit the API record limit, alert the user
      if (recordCount >= recordLimit) {
        alert(`API Record Limit Reached.\n\nThe query returned ${recordCount} records (the maximum limit of ${recordLimit}). There may be more data available in the range which is not being displayed. Try narrowing your date range.`);
      }

      setCustomData(jsonData.data);
      console.log(`Data fetched (custom date range): ${recordCount} records (limit: ${recordLimit})`);
    } catch (err) {
      console.error('Error fetching custom range:', err);
      setFetchError('Failed to fetch custom date range data');
    } finally {
      setIsLoading(false); // Flip the loading state back to false
    }
  };

  // Auto-fetch data when inputs change
  useEffect(() => {
    // Fetch custom range whenever start/end datetime or live mode changes
    fetchCustomRange();
  }, [startDatetime, endDatetime, isLiveMode]);

  // Auto-refresh when WebSocket sends new data in Live mode
  const previousWebSocketDataRef = useRef<BiosensorEntry[] | null>(null);

  useEffect(() => {
    // Check if WebSocket data actually changed (not just initial render)
    const webSocketDataChanged = previousWebSocketDataRef.current !== biosensorTimeSeries;
    previousWebSocketDataRef.current = biosensorTimeSeries;

    // If in Live mode AND WebSocket data updated, refresh the data
    if (isLiveMode && webSocketDataChanged && biosensorTimeSeries) {
      console.log('WebSocket notification of new data received in Live mode - auto-refreshing...');
      fetchCustomRange();
    }
  }, [biosensorTimeSeries]); // Trigger when WebSocket data changes

  const getNonNullEntries = (data: BiosensorEntry[] | null): BiosensorEntry[] => {
    if (!data || !Array.isArray(data)) {
      console.log('getNonNullEntries: No data or not an array');
      return [];
    }
    const filtered = data.filter((entry) => entry.timestamp !== null && entry.measurement_value !== null);
    return filtered;
  };

  const filterByMeasurementType = (entries: BiosensorEntry[], measurementType: string): BiosensorEntry[] => {
    return entries.filter((entry) => entry.measurement_type === measurementType);
  };

  const convertUtcToPst = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    date.setHours(date.getHours() - 8); // Convert from UTC to PST (UTC-8)
    return date.toISOString().replace('Z', '');
  };

  const extractMeasurementValues = (entries: BiosensorEntry[]): number[] => {
    return entries.map((entry) => {
      const value = entry.measurement_value;
      return typeof value === 'string' ? parseFloat(value) : Number(value);
    });
  };

  const extractTimestamps = (entries: BiosensorEntry[]): string[] => {
    return entries.map((entry) => convertUtcToPst(entry.timestamp!));
  };

  // Use custom data if available, otherwise use live WebSocket data
  const dataToUse = customData || biosensorTimeSeries;
  const nonNullEntries = getNonNullEntries(dataToUse);

  // Log first few timestamps to see format
  if (nonNullEntries.length > 0) {
    console.log('First timestamp in data:', nonNullEntries.slice(0, 1).map(e => e.timestamp), 'Last timestamp in data:', nonNullEntries.slice(-1).map(e => e.timestamp));
  }
  const dateFilteredEntries = nonNullEntries;

  const hrNonSessionEntries = filterByMeasurementType(dateFilteredEntries, 'heartrate');
  const hrSessionEntries = filterByMeasurementType(dateFilteredEntries, 'heartrate_session');
  const hrvEntries = filterByMeasurementType(dateFilteredEntries, 'hrv');
  const motionEntries = filterByMeasurementType(dateFilteredEntries, 'motion_count');

  // Summary info
  console.log('Unique sensor modes in data:', [...new Set(dateFilteredEntries.map(e => e.sensor_mode))]);
  console.log('Unique measurement types in data:', [...new Set(dateFilteredEntries.map(e => e.measurement_type))]);
  console.log('Total entries in data:', nonNullEntries.length);
  console.log('Total non-session heart rate entries in data:', hrNonSessionEntries.length, 'values');
  console.log('Total session heart rate entries in data:', hrSessionEntries.length, 'values');
  console.log('Total session HRV entries in data:', hrvEntries.length, 'values');
  console.log('Total session motion count entries in data:', motionEntries.length, 'values');
  console.log('Sample session entry:', hrSessionEntries[0]);
  console.log('Sample non-session entry:', hrNonSessionEntries[0]);

  // If no data yet, show a message
  if (!biosensorTimeSeries || biosensorTimeSeries.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p>Waiting for biosensor data from database...</p>
      </div>
    );
  }

  // Build data array based on selected series
  const plotData = [];

  if (selectedSeries.includes('hr_non_session')) {
    plotData.push({
      x: extractTimestamps(hrNonSessionEntries),
      y: extractMeasurementValues(hrNonSessionEntries),
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
      y: extractMeasurementValues(hrSessionEntries),
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
      y: extractMeasurementValues(hrvEntries),
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
      y: extractMeasurementValues(motionEntries),
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
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '5px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'left', flexWrap: 'wrap' }}>
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
            Live
          </label>
          {isLoading && (
            <span style={{ color: '#666', fontStyle: 'italic' }}>Loading...</span>
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
        <strong style={{ marginRight: '15px' }}>Measurement Type:</strong>
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
          title: { text: 'Biosensor Data' },
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

export default BiosensorPlot;
