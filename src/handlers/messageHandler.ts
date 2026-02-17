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
        // Check for reset command
        if (userInput.trim() === 'אפס את השיחה') {
            await updateLead(lead.id, {
                current_step: 1, // Reset to step 1 (name question) directly, or 0 to send greeting again?
                // Better to just clear data and restart from greeting?
                // User said: "reset the service to forget I spoke with it"
                // Let's clear relevant fields
                full_name: null,
                city: null,
                loan_amount: null,
                loan_purpose: null,
                status: 'new',
                rejection_reason: null,
                has_property: null,
                has_family_property: null,
                property_owner: null,
                property_registry: null,
                building_permit: null,
                bank_issues: null,
                preferred_call_time: null
            } as any); // Type cast might be needed if types are strict about nulls

            const msgs = templates[lead.language as 'hebrew' | 'arabic' | 'english'];
            await sendMessage(phoneNumber, 'השיחה אופסה בהצלחה. נתחיל מחדש.');
            await sendMessage(phoneNumber, msgs.greeting);
            await updateLead(lead.id, { current_step: 1 }); // Move to name input
            await sendMessage(phoneNumber, msgs.step_1);
            return;
        }

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
