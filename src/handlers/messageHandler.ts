import { WebhookPayload } from '../types';
import { getLeadByPhone, createLead, updateLead, logConversation } from '../services/supabaseService';
import { handleStateTransition, detectLanguage, templates } from '../services/botService';
import { sendMessage } from '../services/ultramsgService';

export async function handleIncomingMessage(payload: WebhookPayload) {
    if (!payload.data || payload.data.fromMe) return;

    const message = payload.data;
    const phoneNumber = message.from.replace(/[^\d]/g, '');
    const userInput = message.body || '';

    console.log(`Received message from ${phoneNumber}: ${userInput}`);

    let lead = await getLeadByPhone(phoneNumber);
    const detectedLanguage = detectLanguage(userInput);

    // If new lead
    if (!lead) {
        lead = await createLead(phoneNumber, detectedLanguage);
        if (lead) {
            const msgs = templates[lead.language as 'hebrew' | 'arabic' | 'english'];
            await sendMessage(phoneNumber, msgs.greeting);

            // Advance to step 1 automatically after greeting or wait for response? 
            // User logic had "Step 0 -> Step 1: greeting sent, update step to 1"
            // Then next message is name.
            await updateLead(lead.id, { current_step: 1 });
            await sendMessage(phoneNumber, msgs.step_1); // Ask for name immediately after greeting
        }
    } else {
        // Existing lead
        await handleStateTransition(
            lead.id,
            phoneNumber,
            lead.language as 'hebrew' | 'arabic' | 'english',
            lead.current_step,
            userInput
        );
    }

    // Log conversation if lead exists (it should now)
    if (lead) {
        await logConversation(lead.id, 'user', userInput, detectedLanguage);
    }
}
