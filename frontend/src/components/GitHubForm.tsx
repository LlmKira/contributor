import React, {useState} from 'react';
import {Box, Button, Card, CardContent, Grid, TextField, Typography} from '@mui/material';
import {keyframes} from "@emotion/react";

interface GitHubFormProps {
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

const GitHubForm: React.FC<GitHubFormProps> = ({onSubmit}) => {
    const initialFormData = {
        openaiEndpoint: '',
        apiModel: '',
        apiKey: '',
        repoUrl: '',
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleSubmit = () => {
        onSubmit(formData);
        setFormData(initialFormData); // Reset the form
    };

    return (
        <Card variant="outlined" sx={{
            mb: 4,
            boxShadow: 3,
            transition: 'box-shadow 0.3s, transform 0.3s',
            '&:hover': {boxShadow: 6, transform: 'translateY(-5px)'}
        }}>
            <CardContent sx={{animation: `${fadeIn} 0.5s`}}>
                <Typography variant="h5">Create Card</Typography>
                <Grid container spacing={2}>
                    {[
                        {
                            label: "OpenAI Endpoint",
                            name: "openaiEndpoint",
                            placeholder: "https://api.openai.com/v1/",
                            value: formData.openaiEndpoint,
                        },
                        {
                            label: "Model",
                            name: "apiModel",
                            placeholder: "gpt-4",
                            value: formData.apiModel,
                        },
                        {
                            label: "API Key",
                            name: "apiKey",
                            placeholder: "sk-123...",
                            value: formData.apiKey,
                        },
                        {
                            label: "Repository URL",
                            name: "repoUrl",
                            placeholder: "https://github.com/username/repository",
                            value: formData.repoUrl,
                        },
                    ].map((field, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <TextField
                                label={field.label}
                                name={field.name}
                                placeholder={field.placeholder}
                                fullWidth
                                margin="normal"
                                value={field.value}
                                onChange={handleChange}
                            />
                        </Grid>
                    ))}
                </Grid>
                <Button variant="contained" color="primary" sx={{mt: 2}} onClick={handleSubmit}>Add Card</Button>
            </CardContent>
        </Card>

    );
};

export default GitHubForm;