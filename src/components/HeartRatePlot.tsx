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

  const getCleanedEntries = (data: HeartRateEntry[] | null, pointsToDisplay: number): HeartRateEntry[] => {
    if (!data || !Array.isArray(data)) return [];

    // Filter for entries that have BOTH valid timestamp AND valid measurement_value
    return data
      .filter((entry) => entry.timestamp !== null && entry.measurement_value !== null)
      .slice(-pointsToDisplay);
  };

  const convertUtcToPst = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    date.setHours(date.getHours() - 8); // Convert from UTC to PST (UTC-8)
    return date.toISOString().replace('Z', ''); // Remove Z to indicate it's no longer UTC
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

  const pointsToDisplay = 100;

  const cleanedEntries = getCleanedEntries(heartRateTimeSeries, pointsToDisplay);
  console.log('cleanedEntries',cleanedEntries);
  const heartRates = extractHeartRateValues(cleanedEntries);
  const timestamps = extractTimestamps(cleanedEntries);

  console.log('heartRates',heartRates);
  console.log('timestamps',timestamps);
  console.log('Heart rates to plot:', heartRates.length, 'values');
  console.log('Timestamps to plot:', timestamps.length, 'values');

  return (
    <Plot
      data={[
        {
          x: timestamps,
          y: heartRates,
          type: 'scatter',
          mode: 'lines',
          line: {
            shape: 'spline',
            smoothing: 0.0
          },
          marker: { color: 'red' },
        },
      ]}
      layout={{
        width: 1200,
        height: 600,
        title: { text: 'Heart Rate' }
      }}
    />
  );
};

export default HeartRatePlot;
