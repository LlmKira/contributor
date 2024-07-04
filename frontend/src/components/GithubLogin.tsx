import {Box, Button, Container, LinearProgress, Typography} from "@mui/material";
import {GitHub} from "@mui/icons-material";
import {useEffect, useState} from 'react';

const GithubLogin = (
    {
        onLogin,
        storage
    }: {
        onLogin: () => void,
        storage: Storage
    }
) => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Replace this with your actual check for GithubToken
        const checkForGithubToken = () => {
            const token = storage.getItem('githubToken');
            if (token) {
                setIsLoading(false);
            }
        };
        checkForGithubToken()
    }, []);
    const handleLogin = () => {
        setIsLoading(true);
        onLogin();
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

                <GitHub sx={{fontSize: '100px', mb: 2}}/>
                <Typography variant="h4" component="h1" gutterBottom>
                    neutron-nerve
                </Typography>
                <Button variant="contained" color="primary" onClick={handleLogin}>
                    Login with GitHub
                </Button>
            </Box>
        </Container>
    );
};

const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/github`;
};

export default GithubLogin;
export {handleGithubLogin};