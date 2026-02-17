export interface Lead {
    id: string;
    phone_number: string;
    full_name?: string | null;
    city?: string | null;
    loan_amount?: number | null;
    loan_purpose?: string | null;
    language: 'hebrew' | 'arabic' | 'english';
    current_step: number;
    status: 'new' | 'qualified' | 'rejected' | 'pending_confirmation';
    rejection_reason?: string | null;
    has_property?: boolean | null;
    has_family_property?: boolean | null;
    property_owner?: 'self' | 'spouse' | 'both' | null;
    property_registry?: 'tabo' | 'minhal' | 'lo_rassum' | 'lo_batu' | null;
    building_permit?: 'yes' | 'no' | 'lo_batu' | null;
    bank_issues?: boolean | null;
    preferred_call_time?: string | null;
    last_message_at?: string;
    created_at?: string;
}

export interface Conversation {
    id: string;
    lead_id: string;
    message_type: 'user' | 'bot';
    content: string;
    language: string;
    created_at: string;
}

export interface WebhookPayload {
    data: {
        id: string;
        from: string;
        to: string;
        author: string;
        pushname: string;
        ack: string;
        type: string;
        body: string;
        media: string;
        fromMe: boolean;
        isForwarded: boolean;
        isMentioned: boolean;
        quotedMsg: any;
        mentionedIds: any;
        time: number;
    }
}
