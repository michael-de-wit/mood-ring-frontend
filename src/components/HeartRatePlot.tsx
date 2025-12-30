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
  console.log('Raw heartRateTimeSeries:', heartRateTimeSeries);

  const getNonNullEntries = (data: HeartRateEntry[] | null): HeartRateEntry[] => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter((entry) => entry.timestamp !== null && entry.measurement_value !== null);
  };

  const filterByDateRange = (entries: HeartRateEntry[], startDate: string, endDate: string): HeartRateEntry[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp!);
      return entryDate >= start && entryDate <= end;
    });
  };

  const filterByMeasurementType = (entries: HeartRateEntry[], measurementType: string): HeartRateEntry[] => {
    return entries.filter((entry) => entry.measurement_type === measurementType);
  };

  const filterBySensorMode = (entries: HeartRateEntry[], sensorMode: string): HeartRateEntry[] => {
    return entries.filter((entry) => entry.sensor_mode === sensorMode);
  };

  const filterBySensorModeNot = (entries: HeartRateEntry[], excludeSensorMode: string): HeartRateEntry[] => {
    return entries.filter((entry) => entry.sensor_mode !== excludeSensorMode);
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

  // Date range: Dec 29, 2025, 6-hour window (adjust as needed)
  const startDate = '2025-12-29T10:00:00Z';
  const endDate = '2025-12-30T01:00:00Z';

  const nonNullEntries = getNonNullEntries(heartRateTimeSeries);
  const dateFilteredEntries = filterByDateRange(nonNullEntries, startDate, endDate);

  console.log('Total entries in date range:', dateFilteredEntries.length);
  console.log('Unique measurement types:', [...new Set(dateFilteredEntries.map(e => e.measurement_type))]);
  console.log('Unique sensor modes:', [...new Set(dateFilteredEntries.map(e => e.sensor_mode))]);

  // Get all heartrate entries first
  const allHREntries = filterByMeasurementType(dateFilteredEntries, 'heartrate');
  console.log('Total heartrate entries:', allHREntries.length);
  console.log('Sample heartrate entry:', allHREntries[0]);

  // Split data into three series
  const hrNonSessionEntries = filterBySensorModeNot(
    filterByMeasurementType(dateFilteredEntries, 'heartrate'),
    'session'
  );
  const hrSessionEntries = filterBySensorMode(
    filterByMeasurementType(dateFilteredEntries, 'heartrate'),
    'session'
  );
  const hrvEntries = filterByMeasurementType(dateFilteredEntries, 'heart_rate_variability');

  console.log('HR (non-session):', hrNonSessionEntries.length, 'values');
  console.log('Sample non-session entry:', hrNonSessionEntries[0]);
  console.log('HR (session):', hrSessionEntries.length, 'values');
  console.log('Sample session entry:', hrSessionEntries[0]);
  console.log('HRV:', hrvEntries.length, 'values');
  console.log('Sample HRV entry:', hrvEntries[0]);

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
      ]}
      layout={{
        width: 1200,
        height: 600,
        title: { text: 'Biosensor Data - Dec 29, 2025 (6-hour window)' },
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
