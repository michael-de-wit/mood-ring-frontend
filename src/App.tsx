import { useEffect, useState } from 'react'
import './App.css'
import { fetchHeartRateTimeSeries } from './services/get_hr_data'

function App() {
  const [heartRateTimeSeries, setHeartRateTimeSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchHeartRateTimeSeries();
        setHeartRateTimeSeries(data);
        console.log(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
  }, []);

  return (
    <>

    </>
  )
}

export default App
