import React from 'react';
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

const HeartRatePlot: React.FC<HeartRatePlotProps> = ({ heartRateTimeSeries, isConnected }) => {
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

  // Data is already filtered to last 24 hours by the API
  const nonNullEntries = getNonNullEntries(heartRateTimeSeries);

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

  return (
    <Plot
      data={[
        {
          x: extractTimestamps(hrNonSessionEntries),
          y: extractHeartRateValues(hrNonSessionEntries),
          type: 'scatter',
          mode: 'lines',
          name: 'Heart Rate (non-session)',
          line: {
            shape: 'spline',
            smoothing: 0.0,
            color: 'red'
          },
        },
        {
          x: extractTimestamps(hrSessionEntries),
          y: extractHeartRateValues(hrSessionEntries),
          type: 'scatter',
          mode: 'lines',
          name: 'Heart Rate (session)',
          line: {
            shape: 'spline',
            smoothing: 0.0,
            color: 'orange'
          },
        },
        {
          x: extractTimestamps(hrvEntries),
          y: extractHeartRateValues(hrvEntries),
          type: 'scatter',
          mode: 'lines',
          name: 'Heart Rate Variability',
          line: {
            shape: 'spline',
            smoothing: 0.0,
            color: 'blue'
          },
        },
        {
          x: extractTimestamps(motionEntries),
          y: extractHeartRateValues(motionEntries),
          type: 'scatter',
          mode: 'lines',
          name: 'Motion Count',
          line: {
            shape: 'spline',
            smoothing: 0.0,
            color: 'green'
          },
        },
      ]}
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
  );
};

export default HeartRatePlot;
