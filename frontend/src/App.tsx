import React, {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Snackbar,
    Typography,
} from '@mui/material';
import {keyframes} from '@emotion/react';
import ShownCard from './components/ShownCard.tsx';
import OAuthLogin from "./components/OAuth";
import ApiService from './services/ApiService';
import useAuth from './hook/useAuth.tsx';

import {cardSchema, type CardT, Platform, type PublicUserT} from '@shared/schema.ts';
import {z} from 'zod';
import {extractGitHubRepoUrl} from '@shared/validate.ts';
import GitHubForm from "./components/GitHubForm.tsx";
import OhMyGptForm from "./components/OhMyGptForm.tsx";

const apiService = new ApiService(import.meta.env.VITE_BACKEND_URL);


interface EditState {
    cardId: string;
    field: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<PublicUserT | null>(null);
    const [snackbar, setSnackbar] = useState({open: false, message: ''});
    const [cards, setCards] = useState<CardT[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const [editMode, setEditMode] = useState<EditState>({cardId: "", field: ""});
    const [loading, setLoading] = useState<boolean>(true);
    const isLoggedIn = useAuth(import.meta.env.VITE_BACKEND_URL);
    const [platform, setPlatform] = useState<Platform | null>(null);

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
        const fetchUserAndCards = async () => {
            try {
                setLoading(true);
                const fetchedUser = await apiService.fetchUser();
                setUser(fetchedUser);
                const userCards = await apiService.fetchUserCards(fetchedUser.uid);
                setCards(userCards);
                setPlatform(fetchedUser.sourcePlatform || null);
            } catch (err) {
                console.error('Error fetching user and cards:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserAndCards();
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
    const handleFormSubmit = async (formData: any) => {
        try {
            const newCard = cardSchema.parse(formData);
            const repoUrl = extractGitHubRepoUrl(newCard.repoUrl);
            if (!repoUrl) {
                setSnackbar({open: true, message: 'Invalid GitHub repository URL.'});
                return;
            }
            newCard.repoUrl = repoUrl;
            if (!user?.uid) {
                console.error('No user found.');
                return;
            }
            const createdCard = await apiService.createUserCard(newCard, user.uid);
            setCards([...cards, createdCard]);
            setSnackbar({open: true, message: 'Card added successfully.'});
        } catch (error) {
            if (error instanceof z.ZodError) {
                setSnackbar({
                    open: true,
                    message: 'Validation Error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            } else {
                console.error('Error submitting form:', error);
                setSnackbar({open: true, message: 'Failed to submit form'});
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

    const renderCardForm = () => {
        switch (platform) {
            case Platform.GitHub:
                return <GitHubForm onSubmit={handleFormSubmit}/>;
            case Platform.OhMyGPT:
                return <OhMyGptForm onSubmit={handleFormSubmit}/>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Container>
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
                    <Typography variant="h4">Loading...</Typography>
                </Box>
            </Container>
        );
    }

    if (!user || !isLoggedIn) {
        return (
            <Container>
                <OAuthLogin/>
            </Container>
        );
    }

    return (
        <Container>
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="warning">
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Box sx={{my: 4}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4}}>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Avatar src={user.avatarUrl} alt={user.name} sx={{mr: 2}}/>
                        <Typography variant="h6">{user.name}</Typography>
                    </Box>
                    <Button variant="contained" onClick={handleLogout}>Logout</Button>
                </Box>
                <Box>
                    {platform ? renderCardForm() : <Typography>No supported platform found.</Typography>}
                </Box>
                <Box>
                    {cards.map((card, index) => (
                        <ShownCard
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
        </Container>
    );
};

export default App;