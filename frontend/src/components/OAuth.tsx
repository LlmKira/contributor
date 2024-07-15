import {Box, Button, Container, LinearProgress, Typography} from "@mui/material";
import {GitHub, Hive} from "@mui/icons-material";
import React, {useState} from 'react';

interface Provider {
    name: string;
    icon: React.ElementType;
    color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary';
    loginUrl: string;
}

const providers: Provider[] = [
    {
        name: 'OhMyGPT',
        icon: Hive,
        color: 'success',
        loginUrl: `${import.meta.env.VITE_BACKEND_URL}/auth/ohmygpt`
    },
    {
        name: 'GitHub',
        icon: GitHub,
        color: 'primary',
        loginUrl: `${import.meta.env.VITE_BACKEND_URL}/auth/github`
    },
];

const OAuthLogin = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (url: string) => {
        setIsLoading(true);
        window.location.href = url;
    };

    return (
        <Container>
            {isLoading && <LinearProgress sx={{position: 'fixed', top: 0, left: 0, right: 0}}/>}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                textAlign: 'center'
            }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    neutron-nerve
                </Typography>
                {providers.map((provider) => (
                    <Button
                        key={provider.name}
                        variant="contained"
                        color={provider.color}
                        onClick={() => handleLogin(provider.loginUrl)}
                        startIcon={<provider.icon/>}
                        sx={{mt: 2}}
                    >
                        Login with {provider.name}
                    </Button>
                ))}
            </Box>
        </Container>
    );
};

export default OAuthLogin;