import React, {useState, useEffect} from "react";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { HashRouter, Routes, Route } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import NotesPage from "./pages/notes";
import HomePage from "./pages/home";
import DietPage from "./pages/diet";

import Navigation from './components/Navigationbar';
import SettingsModal from './components/SettingsModal';

const App =() =>{
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [muiTheme, setMuiTheme] = useState(createTheme({ palette: { mode: 'light' } }));

  useEffect(() => {
    // Set the data-theme attribute on the root element
    document.documentElement.setAttribute('data-theme', theme);
    // Save the theme preference to local storage
    localStorage.setItem('theme', theme);

    const styles = getComputedStyle(document.documentElement);
    const newMuiTheme = createTheme({
      palette: {
        mode: theme, // 'light' or 'dark'
        primary: {
          main: styles.getPropertyValue('--theme-primary').trim(),
        },
        background: {
          paper: styles.getPropertyValue('--bg-main').trim(),
          default: styles.getPropertyValue('--bg-alt').trim(),
        },
        text: {
          primary: styles.getPropertyValue('--text-main').trim(),
          secondary: styles.getPropertyValue('--text-secondary').trim(),
          disabled: styles.getPropertyValue('--text-disabled').trim(),
        },
      },
    });
  
    setMuiTheme(newMuiTheme);
  }, [theme]);



  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
    <HashRouter>
      <Navigation onSettingsClick={() => setIsSettingsOpen(true)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/diet" element={<DietPage />} />
      </Routes>
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
      />
    </HashRouter>
    </ThemeProvider>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App/>);