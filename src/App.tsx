import { useEffect, useState } from 'react'
import './App.css'
import { fetchHeartRateTimeSeries } from './services/get_hr_data'
import React from 'react';
import HeartRatePlot from './components/HeartRatePlot';

function App() {
  const [heartRateTimeSeries, setHeartRateTimeSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchHeartRateTimeSeries();
        setHeartRateTimeSeries(response.data);
        console.log('response.data', response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div>Loading heart rate data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <HeartRatePlot heartRateTimeSeries={heartRateTimeSeries} />
    </>
  )
}

export default App
