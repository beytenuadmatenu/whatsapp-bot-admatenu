import { sendMessage } from './ultramsgService';
import { supabase, updateLead, createCallAppointment, getLeadByPhone } from './supabaseService';
import { sendNewLeadEmail } from './emailService';
import { Lead } from '../types';

/**
 * מזהה שפה על בסיס תווים
 */
export function detectLanguage(text: string): 'hebrew' | 'arabic' | 'english' {
    if (/[\u0590-\u05FF]/.test(text)) return 'hebrew';
    if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
    return 'english';
}

/**
 * פונקציית עזר לתרגום מילים בעברית למספרים (NLP בסיסי)
 */
function parseHebrewWords(input: string): number {
    let total = 0;
    const clean = input.replace(/ ו/g, ' ').replace(/[\-\,]/g, ' ').trim();
    const words = clean.split(/\s+/);

    const map: { [key: string]: number } = {
        'מאה': 100, 'מאתיים': 200, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9,
        'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50, 'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90,
        'אחד': 1, 'שניים': 2, 'עשר': 10, 'אחת': 1, 'שתיים': 2
    };

    if (clean.includes('שלוש מאות')) total += 300;
    else if (clean.includes('ארבע מאות')) total += 400;
    else if (clean.includes('חמש מאות')) total += 500;
    else if (clean.includes('שש מאות')) total += 600;
    else if (clean.includes('שבע מאות')) total += 700;
    else if (clean.includes('שמונה מאות')) total += 800;
    else if (clean.includes('תשע מאות')) total += 900;
    else if (clean.includes('מאתיים')) total += 200;
    else if (clean.includes('מאה')) total += 100;

    for (const word of words) {
        if (map[word] && map[word] < 100) total += map[word];
    }
    return total;
}

/**
 * מנוע פיענוח סכומים - מטפל במיליונים, אלפים, שברים ומילים
 */
function parseAmount(input: string): number {
    if (!input) return 0;
    let clean = input.toLowerCase().replace(/,/g, '').replace(/שח|ש"ח|שקלים|₪|nis/g, '').trim();

    // 1. טיפול במיליונים
    if (clean.includes('מיליון') || clean.includes(' m') || clean.includes('מלيون')) {
        const parts = clean.split(/מיליון| m|מלيون/);
        let millionsBase = 1;
        const firstPart = parts[0].trim();
        if (firstPart) {
            const num = parseFloat(firstPart.match(/(\d+(\.\d+)?)/)?.[0] || "0");
            if (num > 0) millionsBase = num;
            else {
                const wordNum = parseHebrewWords(firstPart);
                if (wordNum > 0) millionsBase = wordNum;
            }
        }
        let total = millionsBase * 1000000;
        const secondPart = parts[1]?.trim();
        if (secondPart) {
            if (secondPart.includes('חצי') || secondPart.includes('וחצי')) total += 500000;
            else if (secondPart.includes('רבע')) total += 250000;
            else {
                const rest = parseAmount(secondPart);
                total += (rest < 1000 && rest > 0) ? rest * 1000 : rest;
            }
        }
        return total;
    }

    // 2. טיפול באלפים
    let multiplier = 1;
    if (clean.includes('אלף') || clean.includes('k') || clean.includes('ألف')) multiplier = 1000;

    const numberMatch = clean.match(/(\d+(\.\d+)?)/);
    let base = 0;
    if (numberMatch) {
        base = parseFloat(numberMatch[0]);
        if (clean.includes('וחצי') || (clean.includes('חצי') && base < 1000)) base += 0.5;
    } else {
        base = parseHebrewWords(clean);
        if (base === 0) {
            if (clean.includes('חצי')) base = 0.5;
            else if (clean.includes('רבע')) base = 0.25;
        }
    }
    return base * multiplier;
}

const templates = {
    hebrew: {
        greeting: 'שלום רב, תודה שפנית ל"אדמתנו ביתנו" – הבית הפיננסי של החברה הערבית בישראל. 🏠',
        step_1: 'כדי שנוכל להעניק לך שירות אישי ומקצועי, נשמח לדעת איך קוראים לך?',
        step_2: 'מאיזה יישוב אתה בארץ?',
        step_3: 'יפה! היישוב שלך מוכר לנו היטב. כדי שנתקדם, מה סכום הכסף המבוקש?',
        step_3_under_min: 'חשוב לציין שאנו מטפלים בבקשות החל מ-200,000 ש"ח. האם זה עדיין רלוונטי עבורך?',
        step_3_below_min_final: 'סליחה, כרגע אין באפשרותנו לסייע. נשמח לעמוד לרשותך בעתיד במידה והצרכים ישתנו. בהצלחה!',
        step_4: 'למה מיועד הכסף? (למשל: רכישת נכס, שיפוץ, סגירת חובות, או כל מטרה אחרת)',
        step_5: 'כדי לבחון את אפשרויות המימון, האם יש בבעלותך נכס כלשהו? (כן / לא)',
        step_5_no_family: 'לפעמים ניתן לקבל אישור על בסיס נכס של המשפחה הקרובה. האם קיים נכס כזה בבעלות הורים או משפחה מדרגה ראשונה? (כן / לא)',
        step_5_no_family_final: 'תודה על הכנות. התהליכים שלנו מבוססים על קיומו של נכס בבעלותך או בבעלות משפחתך. נשמח לעזור בעתיד אם התנאים ישתנו. בהצלחה ויום נעים!',
        step_6: 'על שם מי רשום הנכס? (על שמך / על בן או בת זוג / על שניכם)',
        step_8: 'האם קיים היתר/רישיון בנייה מסודר? (כן / לא / לא בטוח)',
        step_9: 'האם היו בעיות בחשבון הבנק שלך ב-3 השנים האחרונות? (כגון החזרות צ\'קים, הגבלות או עיקולים)? (כן / לא)',
        step_10_a: 'הבנתי! שימו לב גם אם אמרו לכם *לא* אל תמהרו לוותר. אפשר לדבר, להבין את המצב, ולראות אם יש דרך לסייע לכם. בשקט, בכבוד ובלי הבטחות באוויר.',
        step_10_b: 'מתי נוח לך שנציג יחזור לשיחת ייעוץ ללא עלות?',
        completion: 'הבקשה נקלטה בהצלחה והפרטים הועברו לבחינה ראשונית. מאחלים לך יום מצוין ותודה שבחרת ב"אדמתנו ביתנו"! 🌷',
    },
    arabic: {
        greeting: 'أهلاً وسهلاً بيك في "أرضنا بيتنا" – البيت الدافي للحلول التمويلية في المجتمع العربي. 🏠 إحنا هون عشان نساعدك تلاقي أحسن الشروط. قبل ما نبلش، كيف حالك اليوم؟',
        step_1: 'عشان نقدر نعطيك خدمة شخصية ومهنية، شو الاسم الكريم؟',
        step_2: 'من وين إنت بالبلاد؟ (أي مدينة أو قرية)',
        step_3: 'حلو! منطقتך معروفة إلنا منيح. عشان نتقدم، قديش مبلغ التمويل (القرض) اللي محتاجه؟',
        step_3_under_min: 'مهم نذكر إنه إحنا بنعالج طلبات من 200,000 شيكل وفوق. هل هاد الإشي بعده ملائم إلك؟',
        step_3_below_min_final: 'بما إنه تخصصنا بالقروض بمبالغ أعلى، للأسف حالياً ما في عنا مسار مناسب لطلبك. بنتشرف نخدمك بالمستقبل إذا تغيرت الاحتياجات. بالتوفيق!',
        step_4: 'لشو محتاج المصاري؟ (مثلاً: ترميم بيت، تسكير ديون، شراء عقار أو أي هدف ثاني)',
        step_5: 'عشان نفحص خيارات التمويل، في بملكيتك أي عقار (شقة، بيت أو أرض)؟ (نعم / لا)',
        step_5_no_family: 'مرات ممكن نحصل على موافقة بناءً على عقار للعيلة القريبة. هل في عقار بملكية الأهل أو قرايب درجة أولى؟ (نعم / لا)',
        step_5_no_family_final: 'شكراً على صراحتك. شغلنا بيعتمد على وجود عقار بملكيتك أو ملكية العيلة. بنكون مبسوطين نساعدك بالمستقبل إذا تغيرت الظروف. يومك سعيد وموفق!',
        step_6: 'باسم مين مسجل العقار حالياً؟ (باسمك / باسم الزوج أو الزوجة / باسمكم الاثنين)',
        step_8: 'هل في رخصة بناء منظمة ومنסقة للعقار؟ (نعم / لا / مش متأكد)',
        step_9: 'عشان نحضر الملف بأفضل شكل قدام البنوك، هل واجهת أي مشاكل بالحساب بآخر 3 سنين؟ (زي شيكات راجعة، تقييدات أو حجوزات)؟ (نعم / لا)',
        step_10_a: 'ممتاز! وخلي ببالك، حتى لو حكولكم "لأ" بمحل ثاني، ما تستعجلوا وتيأسوا. بنقدر نحكي، نفهم الوضع، ونشوف كيف ممكن نساعدكم. بهدوء، باحترام وبدون وعود عالفاضي.',
        step_10_b: 'إمتى بناسبك يرجعلك مندوبنا لمكالمة استشارة بدون تكلفة؟',
        completion: 'الطلب وصل بنجاح والتفاصيل انتقلت للفحص الأولي. بنتمنى لك يوم ممتاز وشكراً إنك اخترت "أرضنا بيتنا"! 🌷',
    },
    english: {
        greeting: 'Hello, thank you for contacting "Our Land Our Home" – experts in financing and mortgage solutions. 🏠 We are here to help you find the most cost-effective path. Before we start, how are you today?',
        step_1: 'To provide you with personal and professional service, what is your name?',
        step_2: 'Which city do you live in?',
        step_3: 'What is the loan amount you need? (This helps us match the most relevant loan tracks for you)',
        step_3_under_min: 'Please note that we handle requests starting from 200,000 NIS. Could this amount or higher be relevant for you?',
        step_3_below_min_final: 'Since we specialize in higher loan amounts, we currently don\'t have a track suitable for your request. We\'d be happy to assist in the future if your needs change. Good luck!',
        step_4: 'What is the purpose of the loan? (e.g., home renovation, debt consolidation, property purchase, etc.)',
        step_5: 'To review financing options, do you own any property (apartment, house, or land)? (Yes / No)',
        step_5_no_family: 'Sometimes approval can be obtained based on a property owned by immediate family. Does a parent or first-degree relative own such a property? (Yes / No)',
        step_5_no_family_final: 'Thank you for your honesty. Our processes are based on property ownership by you or your family. We\'d be happy to help in the future if conditions change. Have a great day!',
        step_6: 'Who is the property currently registered under? (You / Your spouse / Both)',
        step_8: 'Does the property have an official building permit? (Yes / No / Not sure)',
        step_9: 'To best prepare your file for the banks, have there been any account challenges in the last 3 years (such as returned checks or liens)? (Yes / No)',
        step_10_a: 'Your details have been forwarded to our experts for review.',
        step_10_b: 'What is the best time for a representative to call you for a brief consultation?',
        completion: 'Your request has been successfully received. Wishing you a great day and thank you for choosing "Our Land Is Our Home"! 🌷',
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

        case 1: {
            const fullName = userInput.trim();
            await updateLead(leadId, { full_name: fullName, current_step: 2 });

            let greeting = '';
            if (language === 'hebrew') greeting = `נעים מאוד ${fullName}! ${msgs.step_2}`;
            else if (language === 'arabic') greeting = `تشرفنا يا ${fullName}! ${msgs.step_2}`;
            else greeting = `Pleasure to meet you, ${fullName}! ${msgs.step_2}`;

            await sendMessage(phoneNumber, greeting);
            break;
        }

        case 2:
            await updateLead(leadId, { city: userInput, current_step: 3 });
            await sendMessage(phoneNumber, msgs.step_3);
            break;

        case 3: {
            const loanAmount = parseAmount(userInput);

            if (isNaN(loanAmount) || loanAmount < minLoanAmount) {
                await updateLead(leadId, {
                    loan_amount: loanAmount,
                    current_step: 35,
                    status: 'pending_confirmation'
                });
                await sendMessage(phoneNumber, msgs.step_3_under_min);
            } else {
                await updateLead(leadId, { loan_amount: loanAmount, current_step: 4 });

                let confirmationText = msgs.step_4;
                if (language === 'hebrew') confirmationText = `קיבלתי, ${loanAmount.toLocaleString()} ש"ח. ${msgs.step_4}`;
                if (language === 'arabic') confirmationText = `تم استلام ${loanAmount.toLocaleString()} شيكل. ${msgs.step_4}`;

                await sendMessage(phoneNumber, confirmationText);
            }
            break;
        }

        case 35: {
            const response = userInput.toLowerCase();
            const isPositive = response.includes('כן') || response.includes('نعم') ||
                response.includes('yes') || response.includes('רלוונטי') ||
                response.includes('בטח');

            if (isPositive) {
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
            const hasProperty = response.includes('כן') || response.includes('نعم') || response.includes('yes');

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
            const hasFamily = response.includes('כן') || response.includes('نعم') || response.includes('yes');

            if (hasFamily) {
                await updateLead(leadId, { has_family_property: true, current_step: 8 });
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

        case 6: {
            const input = userInput.toLowerCase();
            const owner = input.includes('שניכם') || input.includes('كليكما') || input.includes('both') ? 'both' :
                input.includes('בן') || input.includes('בת') || input.includes('زوج') ? 'spouse' : 'self';
            await updateLead(leadId, { property_owner: owner, current_step: 8 });
            await sendMessage(phoneNumber, msgs.step_8);
            break;
        }

        case 8: {
            const response = userInput.toLowerCase();
            const permit = response.includes('כן') || response.includes('نعم') || response.includes('yes') ? 'yes' :
                response.includes('לא') || response.includes('لا') || response.includes('no') ? 'no' : 'lo_batu';
            await updateLead(leadId, { building_permit: permit, current_step: 9 });
            await sendMessage(phoneNumber, msgs.step_9);
            break;
        }

        case 9: {
            const response = userInput.toLowerCase();
            const hasBankIssues = response.includes('כן') || response.includes('نعم') || response.includes('yes');
            await updateLead(leadId, { bank_issues: hasBankIssues, current_step: 10 });

            // שליחת שתי ההודעות המפוצלות
            await sendMessage(phoneNumber, msgs.step_10_a);
            await sendMessage(phoneNumber, msgs.step_10_b);
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

            // שליחת מייל לצוות
            const fullLead = await getLeadByPhone(phoneNumber);
            if (fullLead) {
                await sendNewLeadEmail(fullLead);

                // שליחת הודעה לקבוצת "לידים חמים 🔥"
                const groupID = '120363406522778698@g.us';
                const summary = `
שם: ${fullLead.full_name}
עיר: ${fullLead.city}
סכום: ${fullLead.loan_amount}
מטרה: ${fullLead.loan_purpose}
נכס: ${fullLead.has_property ? 'יש' : 'אין'}
בעיות אשראי: ${fullLead.bank_issues ? 'כן' : 'לא'}
`.trim();

                const groupMessage = `התקבל ליד חדש בשם ${fullLead.full_name} וסיכום קצר על השיחה שלו אפשר לקבל את
פרטי הלקוח:
${summary}`;

                await sendMessage(groupID, groupMessage);
            }
            break;
        }

        default:
            console.log(`Unknown step: ${currentStep}`);
    }
}

export { templates };