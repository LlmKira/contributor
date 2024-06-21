import React, {useState, useEffect} from 'react';
import {
    Container,
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    TextField,
    IconButton,
    Grid,
    Switch,
    Snackbar,
    Alert,
    Avatar, Chip,
    TableBody,
    Table, TableRow, TableCell,
} from '@mui/material';

import {CopyToClipboard} from 'react-copy-to-clipboard';
import {v4 as uuidv4} from 'uuid';
import axios from 'axios';
// import {createTheme} from '@mui/material/styles';
import {GitHub, ContentCopy as ContentCopyIcon, Delete as DeleteIcon} from '@mui/icons-material';
import {keyframes} from '@emotion/react';

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

const slideIn = keyframes`
    from {
        transform: translateX(-10px);
    }
    to {
        transform: translateX(0);
    }
`;

const highlightColor = keyframes`
    0% {
        background-color: transparent;
    }
    100% {
        background-color: rgba(0, 0, 0, 0.1);
    }
`;

interface User {
    name: string;
    login: string;
    githubId: string;
    accessToken: string;
}

interface editState {
    cardId: string;
    field: string;
}

const Login = ({onLogin}: { onLogin: () => void }) => (
    <Container>
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center'
        }}>
            <GitHub sx={{fontSize: '100px', mb: 2}}/>
            <Typography variant="h4" component="h1" gutterBottom>
                neutron-nerve
            </Typography>
            <Button variant="contained" color="primary" onClick={onLogin}>
                Login with GitHub
            </Button>
        </Box>
    </Container>
);
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [newCard, setNewCard] = useState({
        cardId: uuidv4(),
        userId: '',
        openaiEndpoint: 'https://api.openai.com/v1/',
        apiModel: '',
        apiKey: '',
        repoUrl: '',
        disabled: false
    });
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

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
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/cards/${cardId}`, card, {
                withCredentials: true,
                headers: {Authorization: `Bearer ${localStorage.getItem('githubToken')}`}
            });
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
        // Validate openaiEndpoint is a URL
        const urlRegex = /^(https?:\/\/)?([^\s$.?#].[^\s]*)$/i;
        if (!urlRegex.test(newCard.openaiEndpoint)) {
            setSnackbarMessage('Invalid OpenAI Endpoint. It should be a URL.');
            setSnackbarOpen(true);
            return;
        }
        // Validate apiKey is not more than 100 characters
        if (newCard.apiKey.length > 100) {
            setSnackbarMessage('API Key should not exceed 100 characters.');
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
                openaiEndpoint: 'https://api.openai.com/v1/',
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

            {!user ? (
                <Login onLogin={handleLogin}/>
            ) : (
                <Box sx={{my: 4}}>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4}}>
                        {user && (
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar src={`https://avatars.githubusercontent.com/u/${user.githubId}`} alt={user.name}
                                        sx={{mr: 2}}/>
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
                                {cards.map(card => (
                                    <Card key={card.cardId} variant="outlined" sx={{
                                        mb: 2,
                                        boxShadow: card.disabled ? 1 : 3,
                                        transition: 'box-shadow 0.3s, opacity 0.3s, transform 0.3s',
                                        opacity: card.disabled ? 0.5 : 1,
                                        animation: `${fadeIn} 0.5s`,
                                        '&:hover': {
                                            transform: 'scale(0.99)'
                                        }
                                    }}>
                                        <CardContent sx={{position: 'relative'}}>
                                            <Typography variant="h6" sx={{
                                                mb: 2,
                                                transition: 'color 0.3s',
                                                color: card.disabled ? 'text.disabled' : 'text.primary',
                                                animation: `${slideIn} 0.5s`
                                            }}>
                                                {card.repoUrl.replace(/\/$/, '').split('/').slice(-1)}
                                            </Typography>

                                            <Box sx={{
                                                border: '1px dashed',
                                                borderRadius: '5px',
                                                p: 1,
                                                mb: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                animation: `${highlightColor} 0.5s`
                                            }}>
                                                <Typography variant="body1"
                                                            sx={{flex: 1}}>UUID: {card.cardId}</Typography>
                                                <CopyToClipboard text={card.cardId}>
                                                    <IconButton>
                                                        <ContentCopyIcon/>
                                                    </IconButton>
                                                </CopyToClipboard>
                                            </Box>

                                            <Table sx={{animation: `${fadeIn} 0.5s`}}>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>OpenAI Endpoint</strong></TableCell>
                                                        <TableCell>
                                                            {editMode.cardId === card.cardId && editMode.field === 'openaiEndpoint' ? (
                                                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={card.openaiEndpoint}
                                                                        onChange={(e) => handleChange(card.cardId, 'openaiEndpoint', e.target.value)}

                                                                    />
                                                                    <Button
                                                                        onClick={() => handleSave(card.cardId)}>Save</Button>
                                                                </Box>
                                                            ) : (
                                                                <Chip
                                                                    label={card.openaiEndpoint}
                                                                    sx={{
                                                                        transition: 'background-color 0.3s',
                                                                        animation: `${fadeIn} 0.5s`,
                                                                        '&:hover': {
                                                                            backgroundColor: 'lightblue',
                                                                            cursor: 'pointer'
                                                                        }
                                                                    }}
                                                                    onDoubleClick={() => handleDoubleClick(card.cardId, 'openaiEndpoint')}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>Model</strong></TableCell>
                                                        <TableCell>
                                                            {editMode.cardId === card.cardId && editMode.field === 'apiModel' ? (
                                                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={card.apiModel}
                                                                        onChange={(e) => handleChange(card.cardId, 'apiModel', e.target.value)}
                                                                    />
                                                                    <Button
                                                                        onClick={() => handleSave(card.cardId)}>Save</Button>
                                                                </Box>
                                                            ) : (
                                                                <Chip
                                                                    label={card.apiModel}
                                                                    sx={{
                                                                        transition: 'background-color 0.3s',
                                                                        animation: `${fadeIn} 0.5s`,
                                                                        '&:hover': {
                                                                            backgroundColor: 'lightblue',
                                                                            cursor: 'pointer'
                                                                        }
                                                                    }}
                                                                    onDoubleClick={() => handleDoubleClick(card.cardId, 'apiModel')}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>API Key</strong></TableCell>
                                                        <TableCell>
                                                            {editMode.cardId === card.cardId && editMode.field === 'apiKey' ? (
                                                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={card.apiKey}
                                                                        onChange={(e) => handleChange(card.cardId, 'apiKey', e.target.value)}
                                                                    />
                                                                    <Button
                                                                        onClick={() => handleSave(card.cardId)}>Save</Button>
                                                                </Box>
                                                            ) : (
                                                                <Chip
                                                                    label={card.apiKey}
                                                                    sx={{
                                                                        transition: 'background-color 0.3s',
                                                                        animation: `${fadeIn} 0.5s`,
                                                                        '&:hover': {
                                                                            backgroundColor: 'lightblue',
                                                                            cursor: 'pointer'
                                                                        }
                                                                    }}
                                                                    onDoubleClick={() => handleDoubleClick(card.cardId, 'apiKey')}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>Repository URL</strong></TableCell>
                                                        <TableCell>
                                                            {editMode.cardId === card.cardId && editMode.field === 'repoUrl' ? (
                                                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={card.repoUrl}
                                                                        onChange={(e) => handleChange(card.cardId, 'repoUrl', e.target.value)}
                                                                    />
                                                                    <Button
                                                                        onClick={() => handleSave(card.cardId)}>Save</Button>
                                                                </Box>
                                                            ) : (
                                                                <Chip
                                                                    label={card.repoUrl}
                                                                    sx={{
                                                                        transition: 'background-color 0.3s',
                                                                        animation: `${fadeIn} 0.5s`,
                                                                        '&:hover': {
                                                                            backgroundColor: 'lightblue',
                                                                            cursor: 'pointer'
                                                                        }
                                                                    }}
                                                                    onDoubleClick={() => handleDoubleClick(card.cardId, 'repoUrl')}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>

                                            <Box sx={{
                                                mt: 2,
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                alignItems: 'center'
                                            }}>
                                                <Switch
                                                    checked={!card.disabled}
                                                    onChange={() => handleToggleCard(card.cardId)}
                                                    sx={{mr: 1}}
                                                />
                                                <IconButton
                                                    edge="end"
                                                    aria-label="delete"
                                                    onClick={() => handleDeleteCard(card.cardId)}
                                                >
                                                    <DeleteIcon/>
                                                </IconButton>
                                            </Box>

                                            <Typography
                                                variant="caption"
                                                sx={{mt: 1, color: 'text.secondary'}}
                                            >
                                                双击编辑
                                            </Typography>
                                        </CardContent>
                                    </Card>
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