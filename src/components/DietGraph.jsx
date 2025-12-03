import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
    Box,
    ButtonGroup,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import dayjs from 'dayjs';

const DietGraphComponent = ({ selectedDate, totals, goals }) => {
    const [timePeriod, setTimePeriod] = useState(7);
    const [graphMetric, setGraphMetric] = useState('Calories');
    const [rawGraphData, setRawGraphData] = useState([]);

    // Effect to FETCH raw historical data when the date or time period changes
    useEffect(() => {
        const fetchHistoricalData = async () => {
            const endDate = selectedDate;
            const startDate = endDate.subtract(timePeriod - 1, 'day');

            const startDateString = startDate.format('YYYY-MM-DD');
            const endDateString = endDate.format('YYYY-MM-DD');

            const data = await window.api.loadFoodsForDateRange(startDateString, endDateString);
            setRawGraphData(data);
        };

        fetchHistoricalData();
    }, [selectedDate, timePeriod]);

    const processedGraphData = useMemo(() => {
        if (rawGraphData.length === 0) return [];

        const todayString = selectedDate.format('YYYY-MM-DD');

        const mergedData = rawGraphData.map(dayData => {
            if (dayData.date === todayString) {
                return { ...dayData, kcal: totals.kcal, protein: totals.protein, fiber: totals.fiber };
            }
            return dayData;
        });

        return mergedData.map(item => ({
            name: dayjs(item.date).format('MMM D'),
            Calories: parseFloat(item.kcal.toFixed(0)),
            Protein: parseFloat(item.protein.toFixed(1)),
            Fiber: parseFloat(item.fiber.toFixed(1)),
        }));
    }, [rawGraphData, totals, selectedDate]);

    const graphConfig = {
        Calories: { dataKey: 'Calories', goal: goals.kcal, unit: 'kcal' },
        Protein: { dataKey: 'Protein', goal: goals.protein, unit: 'g' },
        Fiber: { dataKey: 'Fiber', goal: goals.fiber, unit: 'g' },
    };
    const currentMetricConfig = graphConfig[graphMetric];

    return (
        <div className="diet-graph" style={{ flexBasis: '100%', minHeight: '350px', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, ml: 7.5 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Metric</InputLabel>
                    <Select
                        value={graphMetric}
                        label="Metric"
                        onChange={(e) => setGraphMetric(e.target.value)}
                    >
                        <MenuItem value={'Calories'}>Calories</MenuItem>
                        <MenuItem value={'Protein'}>Protein</MenuItem>
                        <MenuItem value={'Fiber'}>Fiber</MenuItem>
                    </Select>
                </FormControl>
                <ButtonGroup variant="outlined" sx={{ '& .MuiButton-root': { py: 0.25, px: 1, fontSize: '0.75rem' } }}>
                    <Button onClick={() => setTimePeriod(7)} variant={timePeriod === 7 ? 'contained' : 'outlined'}>7 Days</Button>
                    <Button onClick={() => setTimePeriod(30)} variant={timePeriod === 30 ? 'contained' : 'outlined'}>30 Days</Button>
                    <Button onClick={() => setTimePeriod(90)} variant={timePeriod === 90 ? 'contained' : 'outlined'}>90 Days</Button>
                </ButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedGraphData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} ${currentMetricConfig.unit}`} />
                    <Legend />
                    <ReferenceLine y={currentMetricConfig.goal} label={{ value: `Goal`, position: 'insideTopRight', fill: 'red', dy: -10 }} stroke="red" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey={currentMetricConfig.dataKey} name={graphMetric} stroke="var(--theme-primary)" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const DietGraph = React.memo(DietGraphComponent);

export default DietGraph;