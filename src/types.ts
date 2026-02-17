export interface Lead {
    id: string;
    phone_number: string;
    full_name?: string;
    city?: string;
    loan_amount?: number;
    loan_purpose?: string;
    language: 'hebrew' | 'arabic' | 'english';
    current_step: number;
    status: 'new' | 'qualified' | 'rejected' | 'pending_confirmation';
    rejection_reason?: string;
    has_property?: boolean;
    has_family_property?: boolean;
    property_owner?: 'self' | 'spouse' | 'both';
    property_registry?: 'tabo' | 'minhal' | 'lo_rassum' | 'lo_batu';
    building_permit?: 'yes' | 'no' | 'lo_batu';
    bank_issues?: boolean;
    preferred_call_time?: string;
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
