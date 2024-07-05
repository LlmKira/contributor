import React, {useEffect, useState} from 'react';
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
// import {createTheme} from '@mui/material/styles';
import {keyframes} from '@emotion/react';
import GithubLogin, {handleGithubLogin} from "./components/GithubLogin.tsx";
import CardComponent from './components/CardComponent';
import ApiService from './services/ApiService';
import {cardInputSchema, type CardInputT, cardSchema, type CardT, type UserT} from "@shared/schema.ts";
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


interface editState {
    cardId: string;
    field: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<UserT | null>(null);
    const [cards, setCards] = useState<CardT[]>([]);
    // Initialize state with validated default values
    const [newCard, setNewCard] = useState<CardInputT>(() => cardInputSchema.parse({
        cardId: uuidv4(),
        openaiEndpoint: 'https://api.openai.com/v1/',
        apiModel: '',
        apiKey: '',
        repoUrl: '',
        userId: '',
        disabled: false,
    }));
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<editState>(
        {
            cardId: "",
            field: ""
        }
    )
    const handleDoubleClick = (cardId: any, field: string) => {
        setEditMode({cardId, field});
    };

    const handleChange = (cardId: any, field: string, newValue: string) => {
        setCards(cards.map(c => c.cardId === cardId ? {...c, [field]: newValue} : c));
    };

    const handleSave = async (cardId: any) => {
        const card = cards.find(c => c.cardId === cardId);
        try {
            if (!card) {
                console.error('No card found.');
                return;
            }
            await apiService.updateUserCard(
                cardId,
                card
            );
            setEditMode({cardId: "", field: ""});
            setSnackbarMessage('Card updated successfully.');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error updating card:', err);
        }
    };
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
            () => console.log('User fetched'),
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
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [confirmDelete]);

    const handleLogout = async () => {
        try {
            await apiService.logout();
            setUser(null);
            setCards([]);
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };


    const handleAddCard = async () => {
        // Validate the GitHub repository URL
        const repoUrl = extractGitHubRepoUrl(newCard.repoUrl);
        if (!repoUrl) {
            setSnackbarMessage('Invalid GitHub repository URL.');
            setSnackbarOpen(true);
            return;
        } else {
            newCard.repoUrl = repoUrl;
        }
        try {
            if (!user?.uid) {
                console.error('No user found.');
                return;
            } else {
                newCard.userId = user.uid;
            }
            const validCard = cardSchema.parse(newCard);
            const createdCard = await apiService.createUserCard(validCard, user.uid);
            setCards([...cards, createdCard]);
            // Reset new card state
            setNewCard(cardInputSchema.parse({
                cardId: uuidv4(),
                openaiEndpoint: 'https://api.openai.com/v1/',
                apiModel: '',
                apiKey: '',
                repoUrl: '',
                userId: user.uid,
                disabled: false,
            }));
            setSnackbarMessage('Card added successfully.');
            setSnackbarOpen(true);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // 显示出错的属性
                setSnackbarMessage(
                    'Validation Error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                );
            } else {
                console.error('Error adding card:', error);
            }
            setSnackbarOpen(true);
        }
    };
    const handleDeleteCard = async (cardId: string) => {
        try {
            if (confirmDelete === cardId) {
                await apiService.deleteUserCard(cardId);
                setCards(cards.filter(card => card.cardId !== cardId));
                setSnackbarMessage('Card deleted successfully.');
                setSnackbarOpen(true);
                setConfirmDelete(null);
            } else {
                setConfirmDelete(cardId);
            }
        } catch (err) {
            console.error('Error deleting card:', err);
        }
    };

    const handleToggleCard = async (cardId: string) => {
        try {
            const card = cards.find(c => c.cardId === cardId);
            if (!card) {
                console.error('No card found.');
                return;
            }
            const updatedCard = {...card, disabled: !card.disabled};
            await apiService.updateUserCard(cardId, updatedCard);
            setCards(cards.map(c => c.cardId === cardId ? updatedCard : c));
            setSnackbarMessage('Card updated successfully.');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error updating card:', err);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };
    return (
        <Container>
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="warning">
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {!user ? (
                <GithubLogin
                    onLogin={handleGithubLogin}
                    storage={localStorage}
                />
            ) : (
                <Box sx={{my: 4}}>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4}}>
                        {user && (
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    sx={{mr: 2}}/>
                                <Typography variant="h6">{user.name}</Typography>
                            </Box>
                        )}
                        <Box>
                            {user ? (
                                <Button variant="contained" onClick={handleLogout}>Logout</Button>
                            ) : (
                                <Button variant="contained" onClick={handleGithubLogin}>
                                    Login with GitHub
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {user ? (
                        <>
                            <Card variant="outlined" sx={{
                                mb: 4,
                                boxShadow: 3,
                                transition: 'box-shadow 0.3s, transform 0.3s',
                                animation: `${fadeIn} 0.5s`
                            }}>
                                <CardContent>
                                    <Typography variant="h5">Create Token</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="OpenAI Endpoint"
                                                placeholder="https://api.openai.com/v1/"
                                                fullWidth
                                                margin="normal"
                                                value={newCard.openaiEndpoint}
                                                onChange={(e) => setNewCard({
                                                    ...newCard,
                                                    openaiEndpoint: e.target.value
                                                })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Model"
                                                placeholder="gpt-4"
                                                fullWidth
                                                margin="normal"
                                                value={newCard.apiModel}
                                                onChange={(e) => setNewCard({...newCard, apiModel: e.target.value})}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="API Key"
                                                placeholder="sk-123..."
                                                fullWidth
                                                margin="normal"
                                                value={newCard.apiKey}
                                                onChange={(e) => setNewCard({...newCard, apiKey: e.target.value})}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Repository URL"
                                                placeholder="https://github.com/username/repository"
                                                fullWidth
                                                margin="normal"
                                                value={newCard.repoUrl}
                                                onChange={(e) => setNewCard({...newCard, repoUrl: e.target.value})}
                                            />
                                        </Grid>
                                    </Grid>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        sx={{mt: 2}}
                                        onClick={handleAddCard}
                                    >
                                        Add Card
                                    </Button>
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
                        </>
                    ) : null}
                </Box>
            )}
        </Container>
    );
};

export default App;