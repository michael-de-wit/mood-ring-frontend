export async function fetchHeartRateTimeSeries() {
  const response = await fetch('https://keith-sorbic-huggingly.ngrok-free.dev/heartratetimeseries/live', {
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  });

  // Ngrok returns text at endpoint; may need modify if endpoint returns JSON
  // Log the response to debug
  const text = await response.text();
  console.log('Response text:', text);

  // Check if response is OK
  if (!response.ok) {
    throw new Error(`HTTP error; status: ${response.status}`);
  }

  // Try to parse as JSON
  try {
    const data = JSON.parse(text);
    console.log('data', data);
    return data;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    console.error('Response was:', text);
    throw new Error('Invalid JSON response from server');
  }
}