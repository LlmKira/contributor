import {useState, useEffect} from 'react';
import axios from 'axios';

function useAuth(apiBaseURL: string) {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const response = await axios.get(`${apiBaseURL}/auth/check`, {withCredentials: true});
                if (response.status === 200) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                setIsLoggedIn(false);
            }
        };

        checkLoginStatus();
    }, [apiBaseURL]);

    return isLoggedIn;
}

export default useAuth;