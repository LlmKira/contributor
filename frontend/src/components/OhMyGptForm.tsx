import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    Select,
    MenuItem,
    TextField,
    Typography,
    InputLabel,
    FormControl,
    Paper,
    type SelectChangeEvent,
} from '@mui/material';
import { keyframes } from '@emotion/react';

interface OhMyGptFormProps {
    onSubmit: (data: any) => void;
}

const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const OhMyGptForm: React.FC<OhMyGptFormProps> = ({ onSubmit }) => {
    const initialFormData = {
        apiModel: '',
        repoUrl: '',
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleChange = (e: SelectChangeEvent) => {
        const name = e.target.name as string;
        setFormData({ ...formData, [name]: e.target.value });
    };

    const handleSubmit = () => {
        onSubmit(formData);
        setFormData(initialFormData); // Reset the form
    };

    const modelOptions = ['gpt-4', 'gpt-4o'];

    return (
        <Paper elevation={3} sx={{ p: 2, mb: 4, animation: `${fadeIn} 0.5s` }}>
            <Typography variant="h5" gutterBottom>
                Create Card
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Repository URL"
                        name="repoUrl"
                        placeholder="https://github.com/username/repository"
                        fullWidth
                        margin="normal"
                        value={formData.repoUrl}
                        onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Model</InputLabel>
                        <Select
                            name="apiModel"
                            value={formData.apiModel}
                            onChange={handleChange}
                            label="Model"
                        >
                            {modelOptions.map((model, idx) => (
                                <MenuItem key={idx} value={model}>
                                    {model}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleSubmit}>
                Add Card
            </Button>
        </Paper>
    );
};

export default OhMyGptForm;