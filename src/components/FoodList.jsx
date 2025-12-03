import React, { useState, useEffect, useCallback  } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
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
    IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const FoodListComponent = ({ foods, totals, goals, onAddFood, onUpdateFood, onDeleteFood }) => {
    const [foodSearchTerm, setFoodSearchTerm] = useState('');
    const [foodSuggestions, setFoodSuggestions] = useState([]);
    const [isGramModalOpen, setIsGramModalOpen] = useState(false);
    const [foodDetailsForModal, setFoodDetailsForModal] = useState(null);
    const [gramAmount, setGramAmount] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [foodToEdit, setFoodToEdit] = useState(null);

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

    const handleSelectFood = useCallback(async (event, newValue) => {
        if (newValue) {
            const details = await window.api.getFoodDetails(newValue);
            if (details) {
                setFoodDetailsForModal(details);
            } else {
                setFoodDetailsForModal({ name: newValue });
            }
            setIsGramModalOpen(true);
        }
    }, []);

    const handleCloseGramModal =  useCallback(() => {
        setIsGramModalOpen(false);
        setFoodDetailsForModal(null);
        setGramAmount('');
    }, []);

    const handleConfirmAddFood =  useCallback(async () => {
        const grams = parseFloat(gramAmount);
        if (!foodDetailsForModal || !grams || grams <= 0) {
            return; // Basic validation
        }

        const foodDetails = foodDetailsForModal;

        const parseNutrient = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        };

        const newFoodEntry = {
            id: uuidv4(),
            name: foodDetails.name,
            grams: grams,
            protein: 0,
            kcal: 0,
            fiber: 0,
        };

        if (foodDetails['Protein (g)']) { // Check if it's a known food from CSV
            newFoodEntry.protein = (parseNutrient(foodDetails['Protein (g)']) / 100) * grams;
            newFoodEntry.kcal = (parseNutrient(foodDetails['Calories']) / 100) * grams;
            newFoodEntry.fiber = (parseNutrient(foodDetails['Fiber (g)']) / 100) * grams;
        }

        onAddFood(newFoodEntry);
        handleCloseGramModal();
    }, [gramAmount, foodDetailsForModal, onAddFood, handleCloseGramModal]);

    const handleOpenEditModal =  useCallback((food) => {
        setFoodToEdit({ ...food });
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal =  useCallback(() => {
        setIsEditModalOpen(false);
        setFoodToEdit(null);
    }, []);

    const handleEditFormChange =  useCallback((e) => {
        const { name, value } = e.target;
        const isNumeric = ['grams', 'protein', 'kcal', 'fiber'].includes(name);
        
        setFoodToEdit(prev => ({
            ...prev,
            [name]: isNumeric ? (value === '' ? '' : parseFloat(value) || 0) : value
        }));
    }, []);

    const handleSaveChanges =  useCallback(() => {
        if (!foodToEdit) return;
        onUpdateFood(foodToEdit);
        handleCloseEditModal();
    }, [foodToEdit, onUpdateFood, handleCloseEditModal]);

    return (
        <div className="food-panel">
            <Autocomplete
                value={null} 
                freeSolo
                options={foodSuggestions}
                onInputChange={(event, newInputValue) => {
                    setFoodSearchTerm(newInputValue);
                }}
                onChange={handleSelectFood}
                renderInput={(params) => <TextField {...params} label="Search for a food..." variant="outlined" size="small" />}
                sx={{ width: '100%', marginBottom: '0rem' }}
            />
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '4px', mb: 2, display: 'flex', justifyContent: 'space-around', gap: 2 }}>
                <Typography variant="body2">Calories: <strong>{totals.kcal.toFixed(0)} / {goals.kcal} kcal</strong></Typography>
                <Typography variant="body2">Protein: <strong>{totals.protein.toFixed(1)} / {goals.protein} g</strong></Typography>
                <Typography variant="body2">Fiber: <strong>{totals.fiber.toFixed(1)} / {goals.fiber} g</strong></Typography>
            </Box>
            <List className="food-list">
                {foods.map((food, index) => {
                    if (typeof food === 'object' && food !== null && food.id) {
                        return (
                            <ListItem key={food.id} disablePadding secondaryAction={
                                <>
                                    <IconButton edge="end" onClick={() => handleOpenEditModal(food)} sx={{ mr: 1 }}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton edge="end" onClick={() => onDeleteFood(food.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </>
                            }>
                                <ListItemText sx={{ ml: 7.5 }}
                                    primary={`${food.name} (${food.grams}g)`}
                                    secondary={`Calories: ${food.kcal?.toFixed(0) ?? 0}kcal, Protein: ${food.protein?.toFixed(1) ?? 0}g, Fiber: ${food.fiber?.toFixed(1) ?? 0}g`}
                                />
                            </ListItem>
                        );
                    } else if (typeof food === 'string') {
                        return (
                            <ListItem key={`${food}-${index}`} disablePadding>
                                <ListItemText primary={food} secondary="Nutritional data unavailable" />
                            </ListItem>
                        );
                    }
                    return null;
                })}
            </List>
            
            <p></p>

            {/* Grams input modal */}
            <Dialog open={isGramModalOpen} onClose={handleCloseGramModal}>
                <DialogTitle>Enter Amount</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        How many grams of {foodDetailsForModal?.name}?
                    </DialogContentText>
                    {foodDetailsForModal && foodDetailsForModal['Serving Weight 1 (g)'] && (
                        <DialogContentText sx={{ mt: 1, fontSize: '0.9rem', color: 'text.secondary' }}>
                            Serving size: {foodDetailsForModal['Serving Weight 1 (g)']}g
                            {foodDetailsForModal['Serving Description 1 (g)'] && ` (${foodDetailsForModal['Serving Description 1 (g)']})`}
                        </DialogContentText>
                    )}
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

const FoodList = React.memo(FoodListComponent);

export default FoodList;