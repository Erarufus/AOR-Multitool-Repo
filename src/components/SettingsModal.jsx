import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
} from '@mui/material';

const SettingsModal = ({ open, onClose, currentTheme, onThemeChange }) => {
    const handleThemeChange = (event) => {
        onThemeChange(event.target.value);
    };

    return (
        <Dialog open={open} onClose={onClose} scroll={'paper'}>
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <FormControl component="fieldset" margin="normal">
                    <FormLabel component="legend">Theme</FormLabel>
                    <RadioGroup
                        name="theme-group"
                        value={currentTheme}
                        onChange={handleThemeChange}
                    >
                        <FormControlLabel value="light" control={<Radio />} label="Default" />
                        <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsModal;
