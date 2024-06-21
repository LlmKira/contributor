import mongoose, {Schema} from "mongoose";
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