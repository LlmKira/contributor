// services/ApiService.ts
import axios from 'axios';
import {z} from 'zod';
import {cardSchema, userSchema, type CardT, type UserT} from '@shared/schema.ts';

class ApiService {
    private readonly baseURL: string;
    private storage: Storage;

    constructor(baseURL: string, storage: Storage) {
        this.baseURL = baseURL;
        this.storage = storage;
    }

    private getAuthHeaders() {
        const token = this.storage.getItem('githubToken');
        if (!token) {
            throw new Error('No GitHub token found');
        }
        return {Authorization: `Bearer ${token}`};
    }

    async fetchUser(): Promise<UserT> {
        const response = await axios.get(`${this.baseURL}/user`, {withCredentials: true});
        const user = userSchema.parse(response.data);
        this.storage.setItem('githubToken', user.accessToken);
        return user;
    }

    async fetchUserCards(userId: string): Promise<CardT[]> {
        const response = await axios.get(`${this.baseURL}/cards`, {
            params: {userId},
            headers: this.getAuthHeaders()
        });
        return z.array(cardSchema).parse(response.data);
    }

    async createUserCard(newCard: Omit<CardT, 'cardId' | 'userId'>, userId: string): Promise<CardT> {
        const response = await axios.post(
            `${this.baseURL}/cards`,
            {...newCard, userId},
            {withCredentials: true, headers: this.getAuthHeaders()}
        );
        return cardSchema.parse(response.data);
    }

    async deleteUserCard(cardId: string): Promise<void> {
        await axios.delete(`${this.baseURL}/cards/${cardId}`, {
            withCredentials: true,
            headers: this.getAuthHeaders()
        });
    }

    async updateUserCard(cardId: string, updatedCard: Partial<CardT>): Promise<CardT> {
        const response = await axios.put(`${this.baseURL}/cards/${cardId}`, updatedCard, {
            withCredentials: true,
            headers: this.getAuthHeaders()
        });
        return cardSchema.parse(response.data);
    }

    async logout(): Promise<void> {
        await axios.post(`${this.baseURL}/logout`, {}, {withCredentials: true});
        this.storage.removeItem('githubToken');
    }
}

export default ApiService;