import {Box, Button, Container, Typography} from "@mui/material";
import {GitHub} from "@mui/icons-material";

const GithubLogin = ({onLogin}: { onLogin: () => void }) => (
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
const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/github`;
};

export default GithubLogin;
export {handleGithubLogin};