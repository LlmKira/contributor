import React, {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';

import {v4 as uuidv4} from 'uuid';
import {keyframes} from '@emotion/react';
import GithubLogin, {handleGithubLogin} from "./components/GithubLogin.tsx";
import CardComponent from './components/CardComponent';
import ApiService from './services/ApiService';
import {cardSchema, type CardT, type UserT} from "@shared/schema.ts";
import {z} from "zod";
import {extractGitHubRepoUrl} from "@shared/validate.ts";

const apiService = new ApiService(import.meta.env.VITE_BACKEND_URL, localStorage);

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

interface EditState {
    cardId: string;
    field: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<UserT | null>(null);
    const [cards, setCards] = useState<CardT[]>([]);
    const [newCard, setNewCard] = useState<CardT>(
        () => cardSchema.parse({
            cardId: uuidv4(),
            openaiEndpoint: 'https://api.openai.com/v1/',
            apiModel: 'gpt-4o',
            apiKey: '',
            repoUrl: 'https://github.com/LlmKira/contributor',
            userId: '',
            disabled: false,
        })
    );
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: ''
    });
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<EditState>({cardId: "", field: ""});

    const resetInput = useCallback(() => {
        setNewCard(cardSchema.parse({
            cardId: uuidv4(),
            openaiEndpoint: 'https://api.openai.com/v1/',
            apiModel: 'gpt-4o',
            apiKey: '',
            repoUrl: 'https://github.com/LlmKira/contributor',
            userId: '',
            disabled: false,
        }));
    }, []);

    const handleDoubleClick = useCallback((cardId: string, field: string) => {
        setEditMode({cardId, field});
    }, []);

    const handleChange = useCallback((cardId: string, field: string, newValue: string) => {
        setCards(prevCards => prevCards.map(c => c.cardId === cardId ? {...c, [field]: newValue} : c));
    }, []);

    const handleSave = useCallback(async (cardId: string) => {
        const card = cards.find(c => c.cardId === cardId);
        if (!card) {
            console.error('No card found.');
            return;
        }
        try {
            await apiService.updateUserCard(cardId, card);
            setEditMode({cardId: "", field: ""});
            setSnackbar({open: true, message: 'Card updated successfully.'});
        } catch (err) {
            console.error('Error updating card:', err);
            setSnackbar({open: true, message: 'Error updating card.'});
        }
    }, [cards]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const fetchedUser = await apiService.fetchUser();
                setUser(fetchedUser);
                const userCards = await apiService.fetchUserCards(fetchedUser.uid);
                setCards(userCards);
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };

        fetchUser().then(
            () => console.log('User fetched successfully.')
        ).catch(
            (err) => console.error('Error fetching user:', err)
        );
    }, []);

    useEffect(() => {
        let timer: Timer;
        if (confirmDelete) {
            timer = setTimeout(() => {
                setConfirmDelete(null);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [confirmDelete]);

    const handleLogout = useCallback(async () => {
        try {
            await apiService.logout();
            setUser(null);
            setCards([]);
        } catch (err) {
            console.error('Error during logout:', err);
        }
    }, []);

    const handleAddCard = async () => {
        const repoUrl = extractGitHubRepoUrl(newCard.repoUrl);
        if (!repoUrl) {
            setSnackbar({open: true, message: 'Invalid GitHub repository URL.'});
            return;
        }
        setNewCard({...newCard, repoUrl});

        if (!newCard.apiKey || !newCard.apiModel || !newCard.openaiEndpoint || !newCard.repoUrl) {
            setSnackbar({open: true, message: 'Please fill in all fields.'});
            return;
        }

        try {
            if (!user?.uid) {
                console.error('No user found.');
                return;
            }

            const validCard = cardSchema.parse({...newCard, userId: user.uid});
            const createdCard = await apiService.createUserCard(validCard, user.uid);
            setCards([...cards, createdCard]);
            resetInput();
            setSnackbar({open: true, message: 'Card added successfully.'});
        } catch (error) {
            if (error instanceof z.ZodError) {
                setSnackbar({
                    open: true,
                    message: 'Validation Error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            } else {
                console.error('Error adding card:', error);
                setSnackbar({open: true, message: 'Error adding card.'});
            }
        }
    };

    const handleDeleteCard = useCallback(async (cardId: string) => {
        try {
            if (confirmDelete === cardId) {
                await apiService.deleteUserCard(cardId);
                setCards(cards.filter(card => card.cardId !== cardId));
                setSnackbar({open: true, message: 'Card deleted successfully.'});
                setConfirmDelete(null);
            } else {
                setConfirmDelete(cardId);
            }
        } catch (err) {
            console.error('Error deleting card:', err);
        }
    }, [confirmDelete, cards]);

    const handleToggleCard = useCallback(async (cardId: string) => {
        const card = cards.find(c => c.cardId === cardId);
        if (!card) {
            console.error('No card found.');
            return;
        }
        try {
            const updatedCard = {...card, disabled: !card.disabled};
            await apiService.updateUserCard(cardId, updatedCard);
            setCards(cards.map(c => c.cardId === cardId ? updatedCard : c));
            setSnackbar({open: true, message: 'Card updated successfully.'});
        } catch (err) {
            console.error('Error updating card:', err);
            setSnackbar({open: true, message: 'Error updating card.'});
        }
    }, [cards]);

    const handleCloseSnackbar = useCallback(() => {
        setSnackbar({...snackbar, open: false});
    }, [snackbar]);

    return (
        <Container>
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="warning">
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {!user ? (
                <GithubLogin onLogin={handleGithubLogin} storage={localStorage}/>
            ) : (
                <Box sx={{my: 4}}>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4}}>
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <Avatar src={user.avatarUrl} alt={user.name} sx={{mr: 2}}/>
                            <Typography variant="h6">{user.name}</Typography>
                        </Box>
                        <Button variant="contained" onClick={handleLogout}>Logout</Button>
                    </Box>

                    <Card variant="outlined" sx={{
                        mb: 4,
                        boxShadow: 3,
                        transition: 'box-shadow 0.3s, transform 0.3s',
                        animation: `${fadeIn} 0.5s`
                    }}>
                        <CardContent>
                            <Typography variant="h5">Create Token</Typography>
                            <Grid container spacing={2}>
                                {[
                                    {
                                        label: "OpenAI Endpoint",
                                        placeholder: "https://api.openai.com/v1/",
                                        value: newCard.openaiEndpoint,
                                        field: 'openaiEndpoint'
                                    },
                                    {label: "Model", placeholder: "gpt-4", value: newCard.apiModel, field: 'apiModel'},
                                    {
                                        label: "API Key",
                                        placeholder: "sk-123...",
                                        value: newCard.apiKey,
                                        field: 'apiKey'
                                    },
                                    {
                                        label: "Repository URL",
                                        placeholder: "https://github.com/username/repository",
                                        value: newCard.repoUrl,
                                        field: 'repoUrl'
                                    },
                                ].map(({label, placeholder, value, field}, index) => (
                                    <Grid item xs={12} sm={6} key={index}>
                                        <TextField
                                            label={label}
                                            placeholder={placeholder}
                                            fullWidth
                                            margin="normal"
                                            value={value}
                                            onChange={(e) => setNewCard({...newCard, [field]: e.target.value})}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            <Button variant="contained" color="primary" sx={{mt: 2}} onClick={handleAddCard}>Add
                                Card</Button>
                        </CardContent>
                    </Card>

                    <Box>
                        {cards.map((card, index) => (
                            <CardComponent
                                key={card.cardId}
                                card={card}
                                editMode={editMode}
                                confirmDelete={confirmDelete}
                                handleChange={handleChange}
                                showCaption={index === 0}
                                handleSave={handleSave}
                                handleDoubleClick={handleDoubleClick}
                                handleDeleteCard={handleDeleteCard}
                                handleToggleCard={handleToggleCard}
                            />
                        ))}
                    </Box>
                </Box>
            )}
        </Container>
    );
};

export default App;