import mongoose, {Document, Schema} from "mongoose";
import {v4 as uuidv4} from "uuid";

type CardDocument = Document & {
    cardId: string;
    openaiEndpoint: string;
    apiModel: string;
    apiKey: string;
    userId: string;
    repoUrl: string;
    disabled: boolean;
}

const CardSchema: Schema = new Schema({
    cardId: {type: String, default: uuidv4, unique: true},
    openaiEndpoint: {type: String, required: true},
    apiModel: {type: String, required: true},
    apiKey: {type: String, required: true},
    userId: {type: String, required: true},
    repoUrl: {type: String, required: true},
    disabled: {type: Boolean, default: false},
});
export const Card = mongoose.model<CardDocument>('Card', CardSchema);

interface IUser extends Document {
    uid: string;
    name: string;
    login: string;
    accessToken: string;
}

const UserSchema: Schema = new Schema({
    uid: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    login: {type: String, required: true},
    accessToken: {type: String, required: true},
});
export const User = mongoose.model<IUser>('User', UserSchema);