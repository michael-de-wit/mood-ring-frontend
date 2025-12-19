export async function fetchHeartRateTimeSeries() {
  const response = await fetch('http://localhost:8000/heartratetimeseries');
  const data = await response.json();
  return data;
}