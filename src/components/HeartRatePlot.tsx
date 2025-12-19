import React from 'react';
import Plot from 'react-plotly.js';

interface HeartRateEntry {
  timestamp: string;
  bpm: number;
  source: string;
}

interface HeartRatePlotProps {
  heartRateTimeSeries: HeartRateEntry[] | null;
}

const HeartRatePlot: React.FC<HeartRatePlotProps> = ({ heartRateTimeSeries }) => {
  console.log('Raw heartRateTimeSeries:', heartRateTimeSeries);

  const getHeartRatesToPlot = (heartRateData: HeartRateEntry[] | null, xCountToPlot: number) => {
    if (!heartRateData || !Array.isArray(heartRateData)) return [];
    const ObjectsToExtractValuesFrom = heartRateData.slice(-xCountToPlot);
    const ValuesToPlot = ObjectsToExtractValuesFrom.map((entry) => entry.bpm)
    return ValuesToPlot;
  };

  const getTimestampsToPlot = (heartRateData: HeartRateEntry[] | null, xCountToPlot: number) => {
    if (!heartRateData || !Array.isArray(heartRateData)) return [];
    const ObjectsToExtractValuesFrom = heartRateData.slice(-xCountToPlot);
    const ValuesToPlot = ObjectsToExtractValuesFrom.map((entry) => {
      const date = new Date(entry.timestamp);
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
          marker: { color: 'red' },
        },
      ]}
      layout={{ width: 1200, height: 600, title: { text: 'Heart Rate' } }}
    />
  );
};

export default HeartRatePlot;
