import { createTheme } from '@mui/material/styles';

// Earthy, minimalist, clean Material Design theme
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6B8E23', // Olive green - earthy and calming
      light: '#8BA641',
      dark: '#556B1E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#8B7355', // Warm brown - earthy and grounding
      light: '#A68968',
      dark: '#6B5A44',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAF8', // Warm off-white
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3E3E3E', // Soft black
      secondary: '#6B6B6B', // Medium gray
    },
    error: {
      main: '#C2583E', // Terracotta red
    },
    warning: {
      main: '#E5A852', // Warm amber
    },
    info: {
      main: '#5B8A9F', // Dusty blue
    },
    success: {
      main: '#7A9F6B', // Sage green
    },
    divider: 'rgba(107, 142, 35, 0.12)', // Subtle olive divider
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 300,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontWeight: 300,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontWeight: 400,
      letterSpacing: '0em',
    },
    h4: {
      fontWeight: 400,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontWeight: 400,
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.0075em',
    },
    body1: {
      letterSpacing: '0.00938em',
    },
    body2: {
      letterSpacing: '0.01071em',
    },
  },
  shape: {
    borderRadius: 8, // Soft, modern corners
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(107, 142, 35, 0.08)',
    '0px 4px 8px rgba(107, 142, 35, 0.12)',
    '0px 6px 12px rgba(107, 142, 35, 0.12)',
    '0px 8px 16px rgba(107, 142, 35, 0.14)',
    '0px 10px 20px rgba(107, 142, 35, 0.14)',
    '0px 12px 24px rgba(107, 142, 35, 0.16)',
    '0px 14px 28px rgba(107, 142, 35, 0.16)',
    '0px 16px 32px rgba(107, 142, 35, 0.18)',
    '0px 18px 36px rgba(107, 142, 35, 0.18)',
    '0px 20px 40px rgba(107, 142, 35, 0.2)',
    '0px 22px 44px rgba(107, 142, 35, 0.2)',
    '0px 24px 48px rgba(107, 142, 35, 0.22)',
    '0px 26px 52px rgba(107, 142, 35, 0.22)',
    '0px 28px 56px rgba(107, 142, 35, 0.24)',
    '0px 30px 60px rgba(107, 142, 35, 0.24)',
    '0px 32px 64px rgba(107, 142, 35, 0.26)',
    '0px 34px 68px rgba(107, 142, 35, 0.26)',
    '0px 36px 72px rgba(107, 142, 35, 0.28)',
    '0px 38px 76px rgba(107, 142, 35, 0.28)',
    '0px 40px 80px rgba(107, 142, 35, 0.3)',
    '0px 42px 84px rgba(107, 142, 35, 0.3)',
    '0px 44px 88px rgba(107, 142, 35, 0.32)',
    '0px 46px 92px rgba(107, 142, 35, 0.32)',
    '0px 48px 96px rgba(107, 142, 35, 0.34)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // More modern, less shouty
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0px 2px 4px rgba(107, 142, 35, 0.2)',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(107, 142, 35, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Clean, flat design
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(107, 142, 35, 0.08)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(107, 142, 35, 0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(107, 142, 35, 0.1)',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(107, 142, 35, 0.15)',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#6B8E23',
          '&.Mui-checked': {
            color: '#6B8E23',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});