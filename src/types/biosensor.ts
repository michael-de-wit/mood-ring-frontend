// Shared types for biosensor data

export interface HeartRateEntry {
  timestamp: string | null; // e.g. "2026-01-04T22:18:21.700Z"
  measurement_type: string | null; // e.g. "heartrate", "heartrate_session", "hrv", "motion_count"
  measurement_value: number | string | null; // e.g. 57
  measurement_unit: string | null; // e.g. "bpm"
  sensor_mode: string | null; // e.g. "awake", "workout", "live"
  data_source: string | null; // e.g. "oura"
  device_source: string | null; // e.g. "oura_ring_4"
}

// Union type for data series selection
export type DataSeries = 'hr_non_session' | 'hr_session' | 'hrv' | 'motion_count';