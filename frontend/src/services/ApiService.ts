// services/ApiService.ts
import axios from 'axios';
import {z} from 'zod';
import {cardSchema, publicUserSchema, type CardT, type PublicUserT} from '@shared/schema.ts';

class ApiService {
    private readonly baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    async fetchUser(): Promise<PublicUserT> {
        const response = await axios.get(`${this.baseURL}/user`, {withCredentials: true});
        return publicUserSchema.parse(response.data);
    }

    async checkLoginStatus(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseURL}/auth/check`, {withCredentials: true});
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async fetchUserCards(userId: string): Promise<CardT[]> {
        const response = await axios.get(`${this.baseURL}/cards`, {
            params: {userId},
            withCredentials: true
        });
        return z.array(cardSchema).parse(response.data);
    }

    async createUserCard(newCard: Omit<CardT, 'cardId' | 'userId'>, userId: string): Promise<CardT> {
        const response = await axios.post(
            `${this.baseURL}/cards`,
            {...newCard, userId},
            {withCredentials: true}
        );
        return cardSchema.parse(response.data);
    }

    async deleteUserCard(cardId: string): Promise<void> {
        await axios.delete(`${this.baseURL}/cards/${cardId}`, {
            withCredentials: true
        });
    }

    async updateUserCard(cardId: string, updatedCard: Partial<CardT>): Promise<CardT> {
        const response = await axios.put(`${this.baseURL}/cards/${cardId}`, updatedCard, {
            withCredentials: true
        });
        return cardSchema.parse(response.data);
    }

    async logout(): Promise<void> {
        await axios.post(`${this.baseURL}/logout`, {}, {withCredentials: true});
    }
}

export default ApiService;