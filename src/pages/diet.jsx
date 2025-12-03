
//imports
import '/src/index.css';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
    IconButton,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';

import dayjs from 'dayjs';
import DietGraph from '../components/DietGraph';
import FoodList from '../components/FoodList';

const DietPage = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs()); // Initialize with today's date
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // Dialog
    const calendarButtonRef = useRef(null); // Create a ref for the button
    const [todaysFoods, setTodaysFoods] = useState([]);
    const [isDietSettingsModalOpen, setIsDietSettingsModalOpen] = useState(false);
    const [goals, setGoals] = useState({ kcal: 2000, protein: 120, fiber: 30 });
    const [tempGoals, setTempGoals] = useState({ kcal: 2000, protein: 120, fiber: 30 });

    const isInitialLoad = useRef(true);

    useEffect(() => {
        try {
            const savedGoals = localStorage.getItem('dietGoals');
            if (savedGoals) {
                const parsedGoals = JSON.parse(savedGoals);
                // Basic validation
                if (parsedGoals.kcal !== undefined && parsedGoals.protein !== undefined && parsedGoals.fiber !== undefined) {
                    setGoals(parsedGoals);
                }
            }
        } catch (error) {
            console.error("Failed to parse diet goals from localStorage", error);
        }
    }, []);

    // Save goals to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('dietGoals', JSON.stringify(goals));
    }, [goals]);

     // Effect to LOAD foods when the selectedDate changes
     useEffect(() => {
        const loadFoods = async () => {
            const dateString = selectedDate.format('YYYY-MM-DD');
            const loadedFoods = await window.api.loadFoodsForDate(dateString);
            setTodaysFoods(loadedFoods || []); // Ensure it's an array
        };

        loadFoods();
        // Set a flag to prevent the save effect from running on this initial load
        isInitialLoad.current = true;
    }, [selectedDate]);

    // Effect to SAVE foods when the list changes
    useEffect(() => {
        // Prevent saving on the initial load of foods for a new date
        if (isInitialLoad.current) {
            isInitialLoad.current = false; // Unset the flag for subsequent changes
            return;
        }
        const dateString = selectedDate.format('YYYY-MM-DD');
        window.api.saveFoodsForDate(dateString, todaysFoods);
    }, [todaysFoods]);

    const handleAddFood = useCallback((newFoodEntry) => {
        setTodaysFoods(prevFoods => [...prevFoods, newFoodEntry]);
    }, []);

    const handleDeleteFood = useCallback((foodId) => {
        setTodaysFoods(prevFoods => prevFoods.filter(food => food.id !== foodId));
    }, []);

    const handleUpdateFood = useCallback((updatedFood) => {
        setTodaysFoods(prevFoods => 
            prevFoods.map(food => 
                food.id === updatedFood.id ? updatedFood : food
            )
        );
    }, []);

    const handleOpenDietSettingsModal = () => {
        setTempGoals(goals); // Load current goals into the modal's temporary state
        setIsDietSettingsModalOpen(true);
    };

    const handleCloseDietSettingsModal = () => {
        setIsDietSettingsModalOpen(false);
    };

    const handleGoalChange = (e) => {
        const { name, value } = e.target;
        setTempGoals(prev => ({
            ...prev,
            [name]: value === '' ? '' : parseFloat(value) || 0
        }));
    };

    const handleSaveGoals = () => {
        setGoals(tempGoals);
        handleCloseDietSettingsModal();
    };

    const totals = useMemo(() => {
        return todaysFoods.reduce(
            (acc, food) => {
                if (typeof food === 'object' && food !== null) {
                    acc.protein += food.protein || 0;
                    acc.kcal += food.kcal || 0;
                    acc.fiber += food.fiber || 0;
                }
                return acc;
            },
            { protein: 0, kcal: 0, fiber: 0 }
        );
    }, [todaysFoods]);

    return (
        <div className="diet-layout">
            <div className="Diet-Date">
                <p>
                    {selectedDate.format('MMMM D, YYYY')}
                    <IconButton
                        ref={calendarButtonRef}
                        onClick={() => setIsDatePickerOpen(true)}
                        size="small"
                        color="inherit"
                    >
                        <CalendarTodayIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleOpenDietSettingsModal}
                        size="small"
                        color="inherit"
                    >
                        <SettingsIcon />
                    </IconButton>
                </p>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        
                        open={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        value={selectedDate}
                        onChange={(newValue) => {
                            setSelectedDate(newValue);
                            setIsDatePickerOpen(false); // Close after selection
                        }}
                        // Hide the default text input field, IconButton to open it
                        slotProps={{
                            textField: { style: { display: 'none' } },
                            popper: { anchorEl: calendarButtonRef.current,},
                            }}
                    />
                </LocalizationProvider>

            </div>
            <div className="diet-content-container">
                <FoodList 
                    foods={todaysFoods}
                    totals={totals}
                    goals={goals}
                    onAddFood={handleAddFood}
                    onUpdateFood={handleUpdateFood}
                    onDeleteFood={handleDeleteFood}
                />
                <DietGraph selectedDate={selectedDate} totals={totals} goals={goals} />
            </div>

            {/* Diet Goals Settings Modal */}
            <Dialog open={isDietSettingsModalOpen} onClose={handleCloseDietSettingsModal}>
                <DialogTitle>Set Daily Goals</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="kcal"
                        label="Calorie Goal (kcal)"
                        type="number"
                        fullWidth
                        variant="standard"
                        value={tempGoals.kcal}
                        onChange={handleGoalChange}
                    />
                    <TextField
                        margin="dense"
                        name="protein"
                        label="Protein Goal (g)"
                        type="number"
                        fullWidth
                        variant="standard"
                        value={tempGoals.protein}
                        onChange={handleGoalChange}
                    />
                    <TextField
                        margin="dense"
                        name="fiber"
                        label="Fiber Goal (g)"
                        type="number"
                        fullWidth
                        variant="standard"
                        value={tempGoals.fiber}
                        onChange={handleGoalChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDietSettingsModal}>Cancel</Button>
                    <Button onClick={handleSaveGoals}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
        
    );
};

export default DietPage;