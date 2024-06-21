import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {Container, Typography, Button, Box} from '@mui/material';

const App: React.FC = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user`, {withCredentials: true});
                setUser(response.data);
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };

        fetchUser();
    }, []);

    const handleLogin = () => {
        window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/github`;
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/logout`, {}, {withCredentials: true});
            setUser(null);
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    return (
        <Container>
            <Box sx={{my: 4, textAlign: 'center'}}>
                {user ? (
                    <>
                        <Typography variant="h4">Hello, {user.name}</Typography>
                        <Typography variant="body1">Username: {user.login}</Typography>
                        <Button variant="contained" onClick={handleLogout}>
                            Logout
                        </Button>
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