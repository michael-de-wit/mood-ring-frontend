export async function fetchHeartRateTimeSeries() {
  const response = await fetch('http://localhost:8000/heartratetimeseries/live');
  const data = await response.json();
  console.log('data', data);
  return data;
}