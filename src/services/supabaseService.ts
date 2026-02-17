import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Lead, Conversation } from '../types';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getLeadByPhone(phoneNumber: string): Promise<Lead | null> {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching lead:', error);
    }

    return data as Lead | null;
}

export async function createLead(phoneNumber: string, language: string): Promise<Lead | null> {
    const { data, error } = await supabase
        .from('leads')
        .insert({
            phone_number: phoneNumber,
            language,
            current_step: 0,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating lead:', error);
        return null;
    }

    return data as Lead;
}

export async function updateLead(leadId: string, updates: Partial<Lead>): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

    if (error) {
        console.error('Error updating lead:', error);
    }
}

export async function logConversation(
    leadId: string,
    messageType: 'user' | 'bot',
    content: string,
    language: string
): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .insert({
            lead_id: leadId,
            message_type: messageType,
            content,
            language,
        });

    if (error) {
        console.error('Error logging conversation:', error);
    }
}

export async function createCallAppointment(leadId: string): Promise<void> {
    const { error } = await supabase
        .from('call_appointments')
        .insert({
            lead_id: leadId,
            status: 'pending'
        });

    if (error) {
        console.error('Error creating appointment:', error);
    }
}
