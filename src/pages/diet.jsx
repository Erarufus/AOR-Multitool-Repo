
//imports
import '/src/index.css';
import React, { useState, useRef, useEffect} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
    IconButton,
    TextField,
    Autocomplete,
    List,
    ListItem,
    ListItemText,
    Typography,
    Dialog,
    Box,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import dayjs from 'dayjs'; // For date manipulation and formatting



const DietPage = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs()); // Initialize with today's date
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // Dialog
    const calendarButtonRef = useRef(null); // Create a ref for the button
    const [foodSearchTerm, setFoodSearchTerm] = useState('');
    const [foodSuggestions, setFoodSuggestions] = useState([]);
    const [todaysFoods, setTodaysFoods] = useState([]);

    const [isGramModalOpen, setIsGramModalOpen] = useState(false);
    const [foodToAdd, setFoodToAdd] = useState(null);
    const [gramAmount, setGramAmount] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [foodToEdit, setFoodToEdit] = useState(null);

    const isInitialLoad = useRef(true);

     // Debounced search effect
     useEffect(() => {
        if (foodSearchTerm.length < 2) { // Don't search for very short strings
            setFoodSuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            const results = await window.api.searchFoods(foodSearchTerm);
            setFoodSuggestions(results);
        }, 300); // Debounce for 300ms

        return () => clearTimeout(handler);
    }, [foodSearchTerm]);

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


    const handleSelectFood = (event, newValue) => {
        if (newValue) {
            setFoodToAdd(newValue);
            setIsGramModalOpen(true);
        }
    };

    const handleCloseGramModal = () => {
        setIsGramModalOpen(false);
        setFoodToAdd(null);
        setGramAmount('');
    };

    const handleConfirmAddFood = async () => {
        const grams = parseFloat(gramAmount);
        if (!foodToAdd || !grams || grams <= 0) {
            return; // Basic validation
        }

        const foodDetails = await window.api.getFoodDetails(foodToAdd);

        // Helper to safely parse nutrient values 
        const parseNutrient = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        };

        const newFoodEntry = {
            id: uuidv4(),
            name: foodToAdd,
            grams: grams,
            protein: 0,
            kcal: 0,
            fiber: 0,
        };

        if (foodDetails) {
            // If food was found, calculate nutrients for the given amount (data is per 100g)
            //  EDIT THESE KEYS to match CSV 
            newFoodEntry.protein = (parseNutrient(foodDetails['Protein (g)']) / 100) * grams;
            newFoodEntry.kcal = (parseNutrient(foodDetails['Calories']) / 100) * grams;
            newFoodEntry.fiber = (parseNutrient(foodDetails['Fiber (g)']) / 100) * grams;
        }

        setTodaysFoods(prevFoods => [...prevFoods, newFoodEntry]);
        handleCloseGramModal();
    };

    const handleDeleteFood = (foodId) => {
        setTodaysFoods(prevFoods => prevFoods.filter(food => food.id !== foodId));
    };

    const handleOpenEditModal = (food) => {
        setFoodToEdit({ ...food }); // Use a copy to avoid direct state mutation
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setFoodToEdit(null);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        const isNumeric = ['grams', 'protein', 'kcal', 'fiber'].includes(name);
        
        setFoodToEdit(prev => ({
            ...prev,
            [name]: isNumeric ? (value === '' ? '' : parseFloat(value) || 0) : value
        }));
    };

    const handleSaveChanges = () => {
        if (!foodToEdit) return;

        setTodaysFoods(prevFoods => 
            prevFoods.map(food => 
                food.id === foodToEdit.id ? foodToEdit : food
            )
        );
        handleCloseEditModal();
    };

    const totals = todaysFoods.reduce(
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
                <div className="food-panel">
                    <Autocomplete
                        // By setting value to null, the component clears after selection
                        value={null} 
                        freeSolo
                        options={foodSuggestions}
                        onInputChange={(event, newInputValue) => {
                            setFoodSearchTerm(newInputValue);
                        }}
                        onChange={handleSelectFood}
                        renderInput={(params) => <TextField {...params} label="Search for a food..." variant="outlined" size="small" />}
                        sx={{ width: '100%', marginBottom: '1rem' }}
                    />
                     <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '4px', mb: 2, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="body2">Calories: <strong>{totals.kcal.toFixed(0)} kcal</strong></Typography>
                        <Typography variant="body2">Protein: <strong>{totals.protein.toFixed(1)} g</strong></Typography>
                        <Typography variant="body2">Fiber: <strong>{totals.fiber.toFixed(1)} g</strong></Typography>
                    </Box>
                    <List className="food-list">
                        {todaysFoods.map((food, index) => {
                            // This handles both the new object format and the old string format for saved foods.
                            if (typeof food === 'object' && food !== null && food.id) {
                                return (
                                    <ListItem key={food.id} disablePadding secondaryAction={
                                        <>
                                            <IconButton edge="end" onClick={() => handleOpenEditModal(food)} sx={{ mr: 1 }}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton edge="end" onClick={() => handleDeleteFood(food.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </>
                                    }>
                                        
                                        <ListItemText 
                                            primary={`${food.name} (${food.grams}g)`}
                                            secondary={`Calories: ${food.kcal?.toFixed(0) ?? 0}kcal, Protein: ${food.protein?.toFixed(1) ?? 0}g, Fiber: ${food.fiber?.toFixed(1) ?? 0}g`}
                                        />
                                        

                                    </ListItem>
                                );
                            } else if (typeof food === 'string') {
                                // Handle old data format gracefully
                                return (
                                    <ListItem key={`${food}-${index}`} disablePadding>
                                        <ListItemText primary={food} secondary="Nutritional data unavailable" />
                                    </ListItem>
                                );
                            }
                            return null; // Ignore any other malformed data
                        })}
                    </List>
                    
                    <p></p>
                </div>
                
                <div className="diet-graph">
                    <p>Graph</p>
                </div>
            </div>

            {/* Grams input modal */}
            <Dialog open={isGramModalOpen} onClose={handleCloseGramModal}>
                <DialogTitle>Enter Amount</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        How many grams of {foodToAdd}?
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="grams"
                        label="Grams"
                        type="number"
                        fullWidth
                        variant="standard"
                        value={gramAmount}
                        onChange={(e) => setGramAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleConfirmAddFood()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseGramModal}>Cancel</Button>
                    <Button onClick={handleConfirmAddFood}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Food Modal */}
            <Dialog open={isEditModalOpen} onClose={handleCloseEditModal}>
                <DialogTitle>Edit Food Entry</DialogTitle>
                <DialogContent>
                    {foodToEdit && (
                        <>
                            <TextField
                                autoFocus
                                margin="dense"
                                name="name"
                                label="Food Name"
                                type="text"
                                fullWidth
                                variant="standard"
                                value={foodToEdit.name}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="grams"
                                label="Grams"
                                type="number"
                                fullWidth
                                variant="standard"
                                value={foodToEdit.grams}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="protein"
                                label="Protein (g)"
                                type="number"
                                fullWidth
                                variant="standard"
                                value={foodToEdit.protein}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="kcal"
                                label="Calories (kcal)"
                                type="number"
                                fullWidth
                                variant="standard"
                                value={foodToEdit.kcal}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="fiber"
                                label="Fiber (g)"
                                type="number"
                                fullWidth
                                variant="standard"
                                value={foodToEdit.fiber}
                                onChange={handleEditFormChange}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
        
    );
};

export default DietPage;