import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { BiosensorEntry, DataSeries } from '../types/biosensor';
import { API_ENDPOINTS, API_HEADERS } from '../constants/api';
import {
  Paper,
  Box,
  FormControlLabel,
  Checkbox,
  TextField,
  Switch,
  CircularProgress,
  Typography,
  Divider,
  Stack,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import TimelineIcon from '@mui/icons-material/Timeline';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

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
      <Card elevation={1}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <MonitorHeartIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Waiting for biosensor data from database...
          </Typography>
        </CardContent>
      </Card>
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
        color: '#C2583E', // Terracotta red
        width: 2
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
        color: '#E5A852', // Warm amber
        width: 2
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
        color: '#5B8A9F', // Dusty blue
        width: 2
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
        color: '#7A9F6B', // Sage green
        width: 2
      },
    });
  }

  return (
    <Box>
      {/* Datetime Range Controls */}
      <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
          Time Range
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" useFlexGap>
          <TextField
            label="Start"
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="End"
            type="datetime-local"
            value={endDatetime}
            onChange={(e) => setEndDatetime(e.target.value)}
            disabled={isLiveMode}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 220 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isLiveMode}
                onChange={(e) => setIsLiveMode(e.target.checked)}
                color="primary"
              />
            }
            label="Live Mode"
          />
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          )}
        </Stack>
        {fetchError && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {fetchError}
          </Typography>
        )}
      </Paper>

      {/* Data Series Selection Controls */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
          Measurement Types
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedSeries.includes('hr_non_session')}
                onChange={() => toggleSeries('hr_non_session')}
                icon={<FavoriteIcon sx={{ color: '#C2583E' }} />}
                checkedIcon={<FavoriteIcon sx={{ color: '#C2583E' }} />}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#C2583E' }} />
                <Typography variant="body2">Heart Rate (Non-Session)</Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedSeries.includes('hr_session')}
                onChange={() => toggleSeries('hr_session')}
                icon={<MonitorHeartIcon sx={{ color: '#E5A852' }} />}
                checkedIcon={<MonitorHeartIcon sx={{ color: '#E5A852' }} />}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#E5A852' }} />
                <Typography variant="body2">Heart Rate (Session)</Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedSeries.includes('hrv')}
                onChange={() => toggleSeries('hrv')}
                icon={<TimelineIcon sx={{ color: '#5B8A9F' }} />}
                checkedIcon={<TimelineIcon sx={{ color: '#5B8A9F' }} />}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#5B8A9F' }} />
                <Typography variant="body2">HRV</Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedSeries.includes('motion_count')}
                onChange={() => toggleSeries('motion_count')}
                icon={<DirectionsRunIcon sx={{ color: '#7A9F6B' }} />}
                checkedIcon={<DirectionsRunIcon sx={{ color: '#7A9F6B' }} />}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#7A9F6B' }} />
                <Typography variant="body2">Motion Count</Typography>
              </Box>
            }
          />
        </Stack>
      </Paper>

      {/* Plot */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            height: 600,
            title: {
              text: 'Biosensor Data',
              font: { family: 'Roboto, Helvetica, Arial, sans-serif', size: 20, color: '#3E3E3E' }
            },
            xaxis: {
              title: 'Time (PST)',
              gridcolor: 'rgba(107, 142, 35, 0.1)',
            },
            yaxis: {
              title: 'Value',
              gridcolor: 'rgba(107, 142, 35, 0.1)',
            },
            showlegend: true,
            legend: {
              x: 1,
              xanchor: 'right',
              y: 1
            },
            paper_bgcolor: '#FFFFFF',
            plot_bgcolor: '#FAFAF8',
            font: { family: 'Roboto, Helvetica, Arial, sans-serif', color: '#3E3E3E' }
          }}
          useResizeHandler
          style={{ width: '100%' }}
        />
      </Paper>
    </Box>
  );
};

export default BiosensorPlot;
