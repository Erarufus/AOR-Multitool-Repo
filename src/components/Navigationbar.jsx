import React from 'react';
import { Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';

function Navigation({ onSettingsClick}) {
  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/notes">Notes</Link></li>
        <li><Link to="/diet">Diet</Link></li>
      </ul>
      <IconButton onClick={onSettingsClick} title="Settings" sx={{ color: 'var(--text-secondary)' }}>
        <SettingsIcon />
      </IconButton>
    </nav>
  );
}

export default Navigation;