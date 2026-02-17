import express from 'express';
import dotenv from 'dotenv';
import { handleIncomingMessage } from './handlers/messageHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// UltrMsg Webhook
app.post('/webhook/whatsapp', async (req, res) => {
    try {
        await handleIncomingMessage(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
