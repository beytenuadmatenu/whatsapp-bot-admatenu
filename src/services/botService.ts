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
        greeting: 'שלום רב, תודה שפנית ל"אדמתנו ביתנו" – מומחים לפתרונות מימון ומשכנתאות. 🏠 אנחנו כאן כדי לעזור לך למצוא את המסלול המשתלם ביותר עבורך.',
        step_1: 'כדי שנוכל להעניק לך שירות אישי ומקצועי, איך קוראים לך?',
        step_2: 'נעים מאוד! מאיזה יישוב אתה בארץ?',
        step_3: 'מהו סכום המימון שאתה זקוק לו? (זה יעזור לנו להתאים עבורך את מסלולי ההלוואה הרלוונטיים ביותר)',
        step_3_under_min: 'חשוב לציין שאנו מטפלים בבקשות החל מ-200,000 ש"ח. האם סכום זה או גבוה ממנו עשוי להיות רלוונטי עבורך?',
        step_3_below_min_final: 'מכיוון שאנו מתמחים בהלוואות בסכומים גבוהים יותר, כרגע אין לנו מסלול שמתאים לפנייתך. נשמח לעמוד לרשותך בעתיד במידה והצרכים ישתנו. בהצלחה!',
        step_4: 'למען איזו מטרה מיועדת ההלוואה? (למשל: שיפוץ הבית, סגירת חובות, רכישת נכס או כל מטרה אחרת)',
        step_5: 'כדי לבחון את אפשרויות המימון, האם יש בבעלותך נכס כלשהו (דירה, בית או מגרש)? (כן / לא)',
        step_5_no_family: 'לפעמים ניתן לקבל אישור על בסיס נכס של המשפחה הקרובה. האם קיים נכס כזה בבעלות הורים או משפחה מדרגה ראשונה? (כן / לא)',
        step_5_no_family_final: 'תודה על הכנות. התהליכים שלנו מבוססים על קיומו של נכס בבעלותך או בבעלות משפחתך. נשמח לעזור בעתיד אם התנאים ישתנו. יום נעים!',
        step_6: 'על שם מי רשום הנכס כיום? (על שמך / על שם בן או בת זוג / על שם שניכם)',
        step_7: 'היכן רשום הנכס? (טאבו / מינהל מקרקעי ישראל / לא רשום / לא בטוח)',
        step_8: 'האם קיים לנכס היתר בנייה מוסדר? (כן / לא / לא בטוח)',
        step_9: 'כדי שנוכל להכין את התיק בצורה הטובה ביותר מול הבנקים, האם היו אתגרים בחשבון ב-3 השנים האחרונות? (כגון חזרות צ\'קים, הגבלות או עיקולים)? (כן / לא)',
        step_10: 'הפרטים שלך הועברו למומחים שלנו לבחינה ראשונית. מתי השעה הנוחה לך ביותר שבו נציג יחזור אליך לשיחת ייעוץ קצרה?',
        completion: 'הבקשה נקלטה בהצלחה. מאחלים לך יום מצוין ותודה שבחרת ב"אדמתנו ביתנו"! 🌷',
    },
    arabic: {
        greeting: 'أهلاً بك في "أرضنا بيتنا" – متخصصون في الحلول التمويلية والقروض السكنية. 🏠 نحن هنا لمساعدتك في الحصول على أفضل الشروط. قبل أن نبدأ، كيف حالك اليوم؟',
        step_1: 'من أجل تقديم خدمة شخصية ومهنية، ما هو اسمك الكريم؟',
        step_2: 'تشرفنا! في أي مدينة أو قرية تسكن؟',
        step_3: 'ما هو مبلغ التمويل الذي تحتاجه؟ (هذا سيساعدنا في ملائمة أفضل المسارات لك)',
        step_3_under_min: 'يرجى ملاحظة أننا نعالج الطلبات ابتداءً من 200,000 شيكل وما فوق. هل هذا المبلغ أو أكثر قد يكون مناسباً لك؟',
        step_3_below_min_final: 'بما أننا متخصصون في القروض بمبالغ أعلى، للأسف لا يوجد لدينا مسار مناسب لطلبك حالياً. سنكون سعداء بخدمتك في المستقبل إذا تغيرت الاحتياجات. بالتوفيق!',
        step_4: 'ما هو الغرض من القرض؟ (مثلاً: ترميم البيت، تسديد ديون، شراء عقار أو أي هدف آخر)',
        step_5: 'من أجل فحص خيارات التمويل، هل تملك أي عقار (شقة، بيت أو أرض)؟ (نعم / لا)',
        step_5_no_family: 'في بعض الأحيان يمكن الحصول على موافقة بناءً على عقار للعائلة القريبة. هل يوجد عقار بملكية الوالدين أو الأقارب من الدرجة الأولى؟ (نعم / لا)',
        step_5_no_family_final: 'شكراً لصدقك. إجراءاتنا تعتمد على وجود عقار بملكيتك أو ملكية عائلتك. سنكون سعداء بمساعدتك في المستقبل إذا تغيرت الظروف. يوماً سعيداً!',
        step_6: 'باسم من مسجل العقار حالياً؟ (باسمك / باسم الزوج أو الزوجة / باسمكما معاً)',
        step_7: 'أين مسجل العقار؟ (طابو / دائرة أراضي إسرائيل / غير مسجل / لست متأكداً)',
        step_8: 'هل العقار حاصل على رخصة بناء قانونية؟ (نعم / لا / لست متأكداً)',
        step_9: 'لكي نتمكن من تحضير الملف بأفضل شكل أمام البنوك، هل واجهت أي تحديات في الحساب خلال السنوات الثلاث الأخيرة؟ (مثل شيكات راجعة أو حجوزات)؟ (نعم / لا)',
        step_10: 'تم تحويل بياناتك إلى خبرائنا للفحص الأولي. ما هو الوقت الأنسب لك ليتصل بك مندوبنا للاستشارة؟',
        completion: 'تم استلام طلبك بنجاح. نتمنى لك يوماً رائعاً وشكراً لاختيارك "أرضنا بيتنا"! 🌷',
    },
    english: {
        greeting: 'Hello, thank you for contacting "Our Land Our Home" – experts in financing and mortgage solutions. 🏠 We are here to help you find the most cost-effective path. Before we start, how are you today?',
        step_1: 'To provide you with personal and professional service, what is your name?',
        step_2: 'Pleasure to meet you! Which city do you live in?',
        step_3: 'What is the loan amount you need? (This helps us match the most relevant loan tracks for you)',
        step_3_under_min: 'Please note that we handle requests starting from 200,000 NIS. Could this amount or higher be relevant for you?',
        step_3_below_min_final: 'Since we specialize in higher loan amounts, we currently don\'t have a track suitable for your request. We\'d be happy to assist in the future if your needs change. Good luck!',
        step_4: 'What is the purpose of the loan? (e.g., home renovation, debt consolidation, property purchase, etc.)',
        step_5: 'To review financing options, do you own any property (apartment, house, or land)? (Yes / No)',
        step_5_no_family: 'Sometimes approval can be obtained based on a property owned by immediate family. Does a parent or first-degree relative own such a property? (Yes / No)',
        step_5_no_family_final: 'Thank you for your honesty. Our processes are based on property ownership by you or your family. We\'d be happy to help in the future if conditions change. Have a great day!',
        step_6: 'Who is the property currently registered under? (You / Your spouse / Both)',
        step_7: 'Where is the property registered? (Taboo / Land Authority / Not registered / Not sure)',
        step_8: 'Does the property have an official building permit? (Yes / No / Not sure)',
        step_9: 'To best prepare your file for the banks, have there been any account challenges in the last 3 years (such as returned checks or liens)? (Yes / No)',
        step_10: 'Your details have been forwarded to our experts for review. What is the best time for a representative to call you for a brief consultation?',
        completion: 'Your request has been successfully received. Wishing you a great day and thank you for choosing "Our Land Our Home"! 🌷',
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
                    current_step: 35,
                    status: 'pending_confirmation'
                });
                await sendMessage(phoneNumber, msgs.step_3_under_min);
            } else {
                await updateLead(leadId, { loan_amount: loanAmount, current_step: 4 });
                await sendMessage(phoneNumber, msgs.step_4);
            }
            break;
        }

        case 35: {
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
                await updateLead(leadId, { has_property: false, current_step: 55 });
                await sendMessage(phoneNumber, msgs.step_5_no_family);
            }
            break;
        }

        case 55: {
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
