import React, {useState, useEffect} from 'react';
import {
    Container, Box, Typography, Button, Card, CardContent, TextField, IconButton,
    Switch, Grid, Snackbar, Alert, Avatar
} from '@mui/material';
// @ts-ignore
import {CopyToClipboard} from 'react-copy-to-clipboard';
import DeleteIcon from '@mui/icons-material/Delete';
import {v4 as uuidv4} from 'uuid';
import axios from 'axios';

interface User {
    name: string;
    login: string;
    githubId: string;
    avatarUrl: string;
    accessToken: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [newCard, setNewCard] = useState({
        cardId: uuidv4(),
        openaiEndpoint: '',
        apiModel: '',
        apiKey: '',
        repoUrl: '',
        disabled: false
    });
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user`, {withCredentials: true});
                setUser(response.data);
                await fetchUserCards(response.data.githubId);
                localStorage.setItem('githubToken', response.data.accessToken);
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };

        fetchUser().then(
            () => console.log('User fetched'),
            (err) => console.error('Error fetching user:', err)
        );
    }, []);

    const fetchUserCards = async (userId: string) => {
        try {
            if (!localStorage.getItem('githubToken')) {
                console.log('No GitHub token found');
                return;
            }
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/cards`, {
                params: {userId},
                headers: {Authorization: `Bearer ${localStorage.getItem('githubToken')}`}
            });
            setCards(response.data);
        } catch (err) {
            console.error('Error fetching cards:', err);
        }
    };

    const handleLogin = () => {
        window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/github`;
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/logout`, {}, {withCredentials: true});
            setUser(null);
            setCards([]);
            localStorage.removeItem('githubToken');
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    const validateRepoUrl = (url: string) => {
        const regex = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+(\/)?$/;
        return regex.test(url);
    };

    const handleAddCard = async () => {
        if (!newCard.openaiEndpoint || !newCard.apiModel || !newCard.apiKey || !newCard.repoUrl) {
            setSnackbarMessage('All fields are required to add a new card.');
            setSnackbarOpen(true);
            return;
        }
        if (!validateRepoUrl(newCard.repoUrl)) {
            setSnackbarMessage('Invalid repository URL.');
            setSnackbarOpen(true);
            return;
        }
        try {
            if (!localStorage.getItem('githubToken')) {
                console.log('No GitHub token found');
                return;
            }
            if (!user) {
                console.log('No user found');
                return;
            }
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/cards`,
                {...newCard, userId: user.githubId},
                {
                    withCredentials: true,
                    headers: {Authorization: `Bearer ${localStorage.getItem('githubToken')}`}
                }
            );
            setCards([...cards, response.data]);
            setNewCard({
                cardId: uuidv4(),
                openaiEndpoint: '',
                apiModel: '',
                apiKey: '',
                repoUrl: '',
                userId: user.githubId,
                disabled: false,
            });
            setSnackbarMessage('Card added successfully.');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error adding card:', err);
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        try {
            if (!localStorage.getItem('githubToken')) {
                console.log('No GitHub token found');
                return;
            }
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/cards/${cardId}`, {
                withCredentials: true,
                headers: {Authorization: `Bearer ${localStorage.getItem('githubToken')}`}
            });
            setCards(cards.filter(card => card.cardId !== cardId));
            setSnackbarMessage('Card deleted successfully.');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error deleting card:', err);
        }
    };

    const handleToggleCard = async (cardId: string) => {
        try {
            const card = cards.find(c => c.cardId === cardId);
            const updatedCard = {...card, disabled: !card.disabled};
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/cards/${cardId}`, updatedCard, {
                withCredentials: true,
                headers: {Authorization: `Bearer ${localStorage.getItem('githubToken')}`}
            });
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
            <Box sx={{my: 4}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4}}>
                    {user && (
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <Avatar src={user.avatarUrl} alt={user.name} sx={{mr: 2}}/>
                            <Typography variant="h6">{user.name}</Typography>
                        </Box>
                    )}
                    <Box>
                        {user ? (
                            <Button variant="contained" onClick={handleLogout}>Logout</Button>
                        ) : (
                            <Button variant="contained" onClick={handleLogin}>
                                Login with GitHub
                            </Button>
                        )}
                    </Box>
                </Box>

                {user ? (
                    <>
                        <Card variant="outlined" sx={{mb: 4}}>
                            <CardContent>
                                <Typography variant="h5">Add a New Card</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="OpenAI Endpoint"
                                            placeholder="https://api.openai.com/v1/"
                                            fullWidth
                                            margin="normal"
                                            value={newCard.openaiEndpoint || 'https://api.openai.com/v1/'}
                                            onChange={(e) => setNewCard({...newCard, openaiEndpoint: e.target.value})}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Model"
                                            placeholder="gpt-4o"
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
                            {cards.map(card => (
                                <Card key={card.cardId} variant="outlined" sx={{mb: 2}}>
                                    <CardContent>
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <Typography variant="h6" sx={{mr: 2}}>UUID: {card.cardId}</Typography>
                                            <CopyToClipboard text={card.cardId}>
                                                <Button variant="outlined">Copy</Button>
                                            </CopyToClipboard>
                                        </Box>
                                        <Typography>OpenAI Endpoint: {card.openaiEndpoint}</Typography>
                                        <Typography>Model: {card.apiModel}</Typography>
                                        <Typography>API Key: {card.apiKey}</Typography>
                                        <Typography>Repository URL: {card.repoUrl}</Typography>
                                        <Box sx={{mt: 2, display: 'flex', alignItems: 'center'}}>
                                            <Switch
                                                checked={!card.disabled}
                                                onChange={() => handleToggleCard(card.cardId)}
                                            />
                                            <IconButton
                                                edge="end"
                                                aria-label="delete"
                                                onClick={() => handleDeleteCard(card.cardId)}
                                            >
                                                <DeleteIcon/>
                                            </IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </>
                ) : null}
            </Box>
        </Container>
    );
};

export default App;