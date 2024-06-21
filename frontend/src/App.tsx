import React, {useState, useEffect} from 'react';
import {
    Container, Box, Typography, Button, Card, CardContent, TextField, IconButton,
    Switch
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
        userId: '',
        repoUrl: '',
        disabled: false
    });

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

    const handleAddCard = async () => {
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
        } catch (err) {
            console.error('Error updating card:', err);
        }
    };

    return (
        <Container>
            <Box sx={{my: 4, textAlign: 'center'}}>
                {user ? (
                    <>
                        <Typography variant="h4">Hello, {user.name}</Typography>
                        <Typography variant="body1">Username: {user.login}</Typography>
                        <Button variant="contained" onClick={handleLogout}>Logout</Button>

                        <Card variant="outlined" sx={{mt: 4}}>
                            <CardContent>
                                <Typography variant="h5">Add a New Card</Typography>
                                <TextField
                                    label="OpenAI Endpoint"
                                    fullWidth
                                    margin="normal"
                                    value={newCard.openaiEndpoint}
                                    onChange={(e) => setNewCard({...newCard, openaiEndpoint: e.target.value})}
                                />
                                <TextField
                                    label="Model"
                                    fullWidth
                                    margin="normal"
                                    value={newCard.apiModel}
                                    onChange={(e) => setNewCard({...newCard, apiModel: e.target.value})}
                                />
                                <TextField
                                    label="API Key"
                                    fullWidth
                                    margin="normal"
                                    value={newCard.apiKey}
                                    onChange={(e) => setNewCard({...newCard, apiKey: e.target.value})}
                                />
                                <TextField
                                    label="Repository URL"
                                    fullWidth
                                    margin="normal"
                                    value={newCard.repoUrl}
                                    onChange={(e) => setNewCard({...newCard, repoUrl: e.target.value})}
                                />
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

                        <Box sx={{mt: 4}}>
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
                                        <Box sx={{mt: 2}}>
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
                ) : (
                    <Button variant="contained" onClick={handleLogin}>
                        Login with GitHub
                    </Button>
                )}
            </Box>
        </Container>
    );
};

export default App;