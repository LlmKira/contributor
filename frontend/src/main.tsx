import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {CssBaseline} from '@mui/material';
import {ThemeProvider} from '@emotion/react';
import theme from './theme';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <App/>
        </ThemeProvider>
    </React.StrictMode>,
);
