import nodemailer from 'nodemailer';
import { Lead } from '../types';

// תצורת הטרנספורטר - יש להגדיר משתני סביבה ב-Render
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'beytenuadmatenu@gmail.com', // המייל השולח
        pass: process.env.EMAIL_PASS, // סיסמת אפליקציה של Gmail
    },
});

export async function sendNewLeadEmail(lead: Lead) {
    try {
        const subject = `ליד חדש - ${lead.full_name || 'לקוח ללא שם'}`;

        // יצירת סיכום קצר (עד 200 תווים)
        const summary = `
שם: ${lead.full_name}
עיר: ${lead.city}
סכום: ${lead.loan_amount}
מטרה: ${lead.loan_purpose}
נכס: ${lead.has_property ? 'יש' : 'אין'}
בעיות אשראי: ${lead.bank_issues ? 'כן' : 'לא'}
`.trim().substring(0, 200);

        const text = `
שלום רב,

התקבל ליד חדש בבוט הוואטסאפ.

פרטי הלקוח:
${summary}

מועד רצוי לחזרה: ${lead.preferred_call_time || 'לא צוין'}

בברכה,
הבוט של אדמתנו ביתנו
        `.trim();

        const info = await transporter.sendMail({
            from: '"Admatenu Bot" <beytenuadmatenu@gmail.com>',
            to: 'admateinu.beitenu@gmail.com',
            subject: subject,
            text: text,
        });

        console.log('Email sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
