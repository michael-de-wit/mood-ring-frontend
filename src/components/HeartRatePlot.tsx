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

  const getHeartRatesToPlot = (heartRateData: HeartRateEntry[] | null, xCountToPlot: number) => {
    if (!heartRateData || !Array.isArray(heartRateData)) return [];
    const ObjectsToExtractValuesFrom = heartRateData.slice(-xCountToPlot);
    const ValuesToPlot = ObjectsToExtractValuesFrom
      .filter((entry) => entry.measurement_value !== null)
      .map((entry) => {
        const value = entry.measurement_value;
        return typeof value === 'string' ? parseFloat(value) : Number(value);
      });
    return ValuesToPlot;
  };

  const getTimestampsToPlot = (heartRateData: HeartRateEntry[] | null, xCountToPlot: number) => {
    if (!heartRateData || !Array.isArray(heartRateData)) return [];
    const ObjectsToExtractValuesFrom = heartRateData.slice(-xCountToPlot);
    const ValuesToPlot = ObjectsToExtractValuesFrom
      .filter((entry) => entry.timestamp !== null)
      .map((entry) => {
        const date = new Date(entry.timestamp!); // Non-null assertion since we filtered
        date.setHours(date.getHours() - 8); // Convert from UTC to PST
        return date.toISOString().replace('Z', ''); // Remove the Z signifier for UTC
      });
    return ValuesToPlot;
  };

  const xCountToPlot = 100

  const heartRates = getHeartRatesToPlot(heartRateTimeSeries, xCountToPlot);
  const timestamps = getTimestampsToPlot(heartRateTimeSeries, xCountToPlot);

  console.log('Heart rates:', heartRates);
  console.log('Timestamps:', timestamps);

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
      layout={{ width: 1200, height: 600, title: { text: 'Heart Rate' } }}
    />
  );
};

export default HeartRatePlot;
