import { sendMessage } from './ultramsgService';
import { supabase, updateLead, createCallAppointment } from './supabaseService';
import { Lead } from '../types';

export function detectLanguage(text: string): 'hebrew' | 'arabic' | 'english' {
    if (/[\u0590-\u05FF]/.test(text)) return 'hebrew';
    if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
    return 'english';
}

const templates = {
    hebrew: {
        greeting: 'שלום רב, תודה שפנית ל\'אדמתנו ביתנו\'. אנחנו כאן כדי לספק את הפתרונות הטובים ביותר עבורך. לפני שנתקדם – מה שלומך היום?',
        step_1: 'כדי שנוכל לדבר בצורה אישית, איך קוראים לך?',
        step_2: 'תודה. באיזה יישוב אתה גר?',
        step_3: 'איזה סכום אתה מעוניין לקבל בש"ח?',
        step_3_under_min: 'לצערנו אנו מטפלים בבקשות החל מ-200,000 ש"ח. אם סכום זה רלוונטי עבורך, נשמח לעזור בשיחת ייעוץ.',
        step_3_below_min_final: 'מצטערים, אך אנחנו לא מספקים את השירות המתאים עבורך. נשמח לעמוד לרשותך בהמשך!',
        step_4: 'לאיזו מטרה מיועדת ההלוואה? (לדוגמה: שיפוץ, סגירת חובות, רכב חדש)',
        step_5: 'האם בבעלותך נכס כלשהו? (כן / לא)',
        step_5_no_family: 'האם קיים נכס בבעלות הורים או משפחה מדרגה ראשונה? (כן / לא)',
        step_5_no_family_final: 'תודה, התהליך מתאים למקרים בהם קיים נכס בבעלות הלקוח או משפחתו. כמובן שנשמח לעמוד לרשותך בעתיד במידה והמצב ישתנה. בהצלחה!',
        step_6: 'על שם מי רשום הנכס? (על שמך / על שם בן או בת זוג / על שם שניכם)',
        step_7: 'היכן רשום הנכס? (טאבו / מינהל / לא רשום / לא בטוח)',
        step_8: 'האם קיים לנכס היתר בנייה? (כן / לא / לא בטוח)',
        step_9: 'האם היו לך בעיות מול הבנקים ב-3 השנים האחרונות? כגון חזרות צ\'קים, הגבלות חשבון או עיקולים? (כן / לא)',
        step_10: 'הפרטים שלך הועברו לנציג מטעמנו. מתי נוח לך שהוא יחזור אליך?',
        completion: 'מעולה, מאחלים לך יום מקסים ותודה שבחרת בנו! 🌷',
    },
    arabic: {
        greeting: 'السلام عليكم ورحمة الله وبركاته. شكرا لتواصلك مع "أرضنا بيتنا". نحن هنا لتقديم أفضل الحلول لك. قبل أن نمضي قدما - كيف حالك اليوم؟',
        step_1: 'لكي نتمكن من التحدث بشكل شخصي، ما اسمك من فضلك؟',
        step_2: 'شكرا. في أي مدينة أنت تسكن؟',
        step_3: 'كم المبلغ الذي تريد الحصول عليه بالشيكل؟',
        step_3_under_min: 'للأسف، نتعامل فقط مع الطلبات من 200,000 شيكل فما فوق. إذا كان هذا المبلغ مناسبا لك، يسعدنا مساعدتك في استشارة هاتفية.',
        step_3_below_min_final: 'نعتذر، لكننا لا نقدم الخدمة المناسبة لك. يسعدنا مساعدتك في المستقبل!',
        step_4: 'لأي غرض تحتاج القرض؟ (مثال: تجديد، سداد ديون، سيارة جديدة)',
        step_5: 'هل تمتلك أي ممتلكات؟ (نعم / لا)',
        step_5_no_family: 'هل هناك ممتلكات بمالك والديك أو أقاربك من الدرجة الأولى؟ (نعم / لا)',
        step_5_no_family_final: 'شكرا، العملية مناسبة للحالات التي يكون فيها لديك ملكية عقارية. بالطبع يسعدنا مساعدتك في المستقبل إذا تغير الوضع. حظا موفقا!',
        step_6: 'على من مسجل الملك العقاري؟ (باسمك / باسم زوجك أو زوجتك / باسميكما)',
        step_7: 'أين مسجل الملك؟ (تابو / مصلحة الحكومة / غير مسجل / لست متأكدا)',
        step_8: 'هل لدى الملك رخصة بناء؟ (نعم / لا / لست متأكدا)',
        step_9: 'هل واجهت مشاكل مع البنوك في آخر 3 سنوات؟ مثل فحص الشيكات، تجميد الحساب أو رسوم قانونية؟ (نعم / لا)',
        step_10: 'تم تحويل بياناتك إلى فريقنا المتخصص. متى يناسبك أن يتصل بك؟',
        completion: 'ممتاز، نتمنى لك يوما رائعا وشكرا لاختيارك لنا! 🌷',
    },
    english: {
        greeting: 'Hello! Thank you for contacting "Our Land Our Home". We are here to provide the best solutions for you. Before we proceed - how are you today?',
        step_1: 'To communicate with you personally, what is your name please?',
        step_2: 'Thank you. What city do you live in?',
        step_3: 'What amount do you want to receive in NIS?',
        step_3_under_min: 'Unfortunately, we only handle requests from 200,000 NIS and above. If this amount is relevant to you, we would be happy to help with a free consultation call.',
        step_3_below_min_final: 'Sorry, we cannot provide the service suitable for you. We are happy to assist you in the future!',
        step_4: 'What is the loan for? (Example: renovation, debt consolidation, new car)',
        step_5: 'Do you own any property? (Yes / No)',
        step_5_no_family: 'Do your parents or first-degree family members own any property? (Yes / No)',
        step_5_no_family_final: 'Thank you, this process is suitable for cases where there is property ownership. Of course, we would be happy to help you in the future if the situation changes. Good luck!',
        step_6: 'Who is the property registered under? (You / Your spouse / Both)',
        step_7: 'Where is the property registered? (Taboo / Government office / Not registered / Not sure)',
        step_8: 'Does the property have a building permit? (Yes / No / Not sure)',
        step_9: 'Have you had problems with banks in the last 3 years? Such as check returns, account restrictions or seizures? (Yes / No)',
        step_10: 'Your details have been forwarded to our specialist. When is it convenient for you to be called?',
        completion: 'Excellent! We wish you a wonderful day and thank you for choosing us! 🌷',
    },
};

export async function handleStateTransition(
    leadId: string,
    phoneNumber: string,
    language: 'hebrew' | 'arabic' | 'english',
    currentStep: number,
    userInput: string
): Promise<void> {
    const msgs = templates[language];
    const minLoanAmount = 200000;

    switch (currentStep) {
        case 0:
            await sendMessage(phoneNumber, msgs.step_1);
            await updateLead(leadId, { current_step: 1 });
            break;

        case 1:
            await updateLead(leadId, { full_name: userInput, current_step: 2 });
            await sendMessage(phoneNumber, msgs.step_2);
            break;

        case 2:
            await updateLead(leadId, { city: userInput, current_step: 3 });
            await sendMessage(phoneNumber, msgs.step_3);
            break;

        case 3: {
            const loanAmount = parseInt(userInput.replace(/[^\d]/g, ''));

            if (isNaN(loanAmount) || loanAmount < minLoanAmount) {
                await updateLead(leadId, {
                    loan_amount: loanAmount,
                    current_step: 3.5,
                    status: 'pending_confirmation'
                });
                await sendMessage(phoneNumber, msgs.step_3_under_min);
            } else {
                await updateLead(leadId, { loan_amount: loanAmount, current_step: 4 });
                await sendMessage(phoneNumber, msgs.step_4);
            }
            break;
        }

        case 3.5: {
            const response = userInput.toLowerCase();
            if (response.includes('כן') || response.includes('نعم') || response.includes('yes')) {
                await updateLead(leadId, { current_step: 4 });
                await sendMessage(phoneNumber, msgs.step_4);
            } else {
                await updateLead(leadId, {
                    status: 'rejected',
                    rejection_reason: 'loan_amount_below_minimum',
                    current_step: -1
                });
                await sendMessage(phoneNumber, msgs.step_3_below_min_final);
            }
            break;
        }

        case 4:
            await updateLead(leadId, { loan_purpose: userInput, current_step: 5 });
            await sendMessage(phoneNumber, msgs.step_5);
            break;

        case 5: {
            const response = userInput.toLowerCase();
            const hasProperty =
                response.includes('כן') || response.includes('نعم') || response.includes('yes');

            if (hasProperty) {
                await updateLead(leadId, { has_property: true, current_step: 6 });
                await sendMessage(phoneNumber, msgs.step_6);
            } else {
                await updateLead(leadId, { has_property: false, current_step: 5.5 });
                await sendMessage(phoneNumber, msgs.step_5_no_family);
            }
            break;
        }

        case 5.5: {
            const response = userInput.toLowerCase();
            const hasFamily =
                response.includes('כן') || response.includes('نعم') || response.includes('yes');

            if (hasFamily) {
                await updateLead(leadId, { has_family_property: true, current_step: 8 }); // Skip ownership for family property? User logic said step 8
                await sendMessage(phoneNumber, msgs.step_8);
            } else {
                await updateLead(leadId, {
                    has_family_property: false,
                    status: 'rejected',
                    rejection_reason: 'no_property',
                    current_step: -1
                });
                await sendMessage(phoneNumber, msgs.step_5_no_family_final);
            }
            break;
        }

        case 6:
            const owner = userInput.toLowerCase().includes('שניכם') ||
                userInput.toLowerCase().includes('كليكما') ? 'both' :
                userInput.toLowerCase().includes('בן') || userInput.toLowerCase().includes('ابن') ? 'spouse' : 'self';
            await updateLead(leadId, { property_owner: owner, current_step: 7 });
            await sendMessage(phoneNumber, msgs.step_7);
            break;

        case 7: {
            const registry = userInput.toLowerCase().includes('טאבו') || userInput.toLowerCase().includes('تابو') ? 'tabo' :
                userInput.toLowerCase().includes('מינהל') || userInput.toLowerCase().includes('حكومة') ? 'minhal' :
                    userInput.toLowerCase().includes('רשום') || userInput.toLowerCase().includes('مسجل') ? 'lo_rassum' : 'lo_batu';
            await updateLead(leadId, { property_registry: registry, current_step: 8 });
            await sendMessage(phoneNumber, msgs.step_8);
            break;
        }

        case 8: {
            const permit = userInput.toLowerCase().includes('כן') || userInput.toLowerCase().includes('نعم') || userInput.toLowerCase().includes('yes') ? 'yes' :
                userInput.toLowerCase().includes('לא') || userInput.toLowerCase().includes('لا') || userInput.toLowerCase().includes('no') ? 'no' : 'lo_batu';
            await updateLead(leadId, { building_permit: permit, current_step: 9 });
            await sendMessage(phoneNumber, msgs.step_9);
            break;
        }

        case 9: {
            const response = userInput.toLowerCase();
            const hasBankIssues =
                response.includes('כן') || response.includes('نعم') || response.includes('yes');
            await updateLead(leadId, { bank_issues: hasBankIssues, current_step: 10 });
            await sendMessage(phoneNumber, msgs.step_10);
            break;
        }

        case 10: {
            await updateLead(leadId, {
                preferred_call_time: userInput,
                current_step: 11,
                status: 'qualified'
            });

            await createCallAppointment(leadId);
            await sendMessage(phoneNumber, msgs.completion);
            break;
        }

        default:
            console.log(`Unknown step: ${currentStep}`);
    }
}

export { templates };
