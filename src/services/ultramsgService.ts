import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID!;
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN!;
const ULTRAMSG_API = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}`;

if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_TOKEN) {
    throw new Error('Missing UltraMsg credentials');
}

export async function sendMessage(phoneNumber: string, message: string): Promise<void> {
    try {
        await axios.post(`${ULTRAMSG_API}/messages/chat`, {
            token: ULTRAMSG_TOKEN,
            to: phoneNumber,
            body: message,
        });
        console.log(`Sent message to ${phoneNumber}`);
    } catch (error: any) {
        console.error(`Error sending message to ${phoneNumber}:`, error.response?.data || error.message);
    }
}
