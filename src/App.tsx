import './App.css'
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Container, Box, Alert, Chip, Typography, AppBar, Toolbar } from '@mui/material';
import BiosensorPlot from './components/BiosensorPlot';
import { useBiosensorWebSocket } from './hooks/useBiosensorWebSocket';
import { theme } from './theme';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

function App() {
  const { biosensorTimeSeries, isConnected, error } = useBiosensorWebSocket();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
        {/* App Bar */}
        <AppBar position="static" elevation={1} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
          <Toolbar>
            <MonitorHeartIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 400 }}>
              Biosensor Monitor
            </Typography>
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: '0.8rem' }} />}
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <BiosensorPlot biosensorTimeSeries={biosensorTimeSeries} isConnected={isConnected} />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
