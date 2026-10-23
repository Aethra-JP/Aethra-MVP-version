import { createContext, useContext, useEffect, useState } from 'react'

const T = {
  en: {
    home: 'Home', upload: 'Upload file', analyses: 'Analysis', forecast: 'Forecast', chat: 'Chat with your data',
    documents: 'Documents', actions: 'Action plan', alerts: 'Alerts', contact: 'Contact us', signOut: 'Log out',
    email: 'Email', password: 'Password', fullName: 'Full name', logIn: 'Log in', signUp: 'Create account',
    forgotPassword: 'Forgot password?', sendReset: 'Send reset link', newPassword: 'New password', confirmPassword: 'Confirm password', confirmNewPassword: 'Confirm new password',
    saveNewPassword: 'Save new password', continueGoogle: 'Continue with Google', noAccount: 'No account yet?',
    haveAccount: 'Already have an account?', checkEmail: 'Check your email to confirm your account, then log in.',
    resetSent: 'If that email is registered, a reset link is on its way.',
    workspace: 'Business', createWorkspace: 'Create business', businessName: 'Business name', businessType: 'Business type',
    dataset: 'Data file', chooseFile: 'Choose a CSV or Excel file', uploadBtn: 'Upload and read file', run: 'Run',
    loading: 'Loading...', calcHow: 'How was this calculated?', language: 'Language', send: 'Send',
    typeQuestion: 'Ask about your business...', compareModels: 'Compare all models', runModel: 'Run model',
    descriptive: 'What happened', diagnostic: 'Why it happened', predictive: 'What next', prescriptive: 'What to do',
  },
  hi: {
    home: 'होम', upload: 'फ़ाइल अपलोड', analyses: 'विश्लेषण', forecast: 'पूर्वानुमान', chat: 'डेटा से बात करें',
    documents: 'दस्तावेज़', actions: 'कार्य योजना', alerts: 'अलर्ट', contact: 'संपर्क करें', signOut: 'लॉग आउट',
    email: 'ईमेल', password: 'पासवर्ड', fullName: 'पूरा नाम', logIn: 'लॉग इन करें', signUp: 'खाता बनाएँ',
    forgotPassword: 'पासवर्ड भूल गए?', sendReset: 'रीसेट लिंक भेजें', newPassword: 'नया पासवर्ड', confirmPassword: 'पासवर्ड की पुष्टि करें', confirmNewPassword: 'नए पासवर्ड की पुष्टि करें',
    saveNewPassword: 'नया पासवर्ड सहेजें', continueGoogle: 'Google से जारी रखें', noAccount: 'खाता नहीं है?',
    haveAccount: 'पहले से खाता है?', checkEmail: 'खाता पक्का करने के लिए अपना ईमेल देखें, फिर लॉग इन करें।',
    resetSent: 'अगर यह ईमेल पंजीकृत है, तो रीसेट लिंक भेज दिया गया है।',
    workspace: 'व्यवसाय', createWorkspace: 'व्यवसाय बनाएँ', businessName: 'व्यवसाय का नाम', businessType: 'व्यवसाय का प्रकार',
    dataset: 'डेटा फ़ाइल', chooseFile: 'CSV या Excel फ़ाइल चुनें', uploadBtn: 'अपलोड करें और फ़ाइल पढ़ें', run: 'चलाएँ',
    loading: 'लोड हो रहा है...', calcHow: 'यह कैसे निकाला गया?', language: 'भाषा', send: 'भेजें',
    typeQuestion: 'अपने कारोबार के बारे में पूछें...', compareModels: 'सभी मॉडल की तुलना करें', runModel: 'मॉडल चलाएँ',
    descriptive: 'क्या हुआ', diagnostic: 'क्यों हुआ', predictive: 'आगे क्या होगा', prescriptive: 'अब क्या करें',
  },
  hinglish: {
    home: 'Home', upload: 'File upload', analyses: 'Analysis', forecast: 'Forecast', chat: 'Data se baat karein',
    documents: 'Documents', actions: 'Action plan', alerts: 'Alerts', contact: 'Contact us', signOut: 'Log out',
    email: 'Email', password: 'Password', fullName: 'Poora naam', logIn: 'Log in karein', signUp: 'Account banayein',
    forgotPassword: 'Password bhool gaye?', sendReset: 'Reset link bhejein', newPassword: 'Naya password', confirmPassword: 'Password confirm karein', confirmNewPassword: 'Naya password confirm karein',
    saveNewPassword: 'Naya password save karein', continueGoogle: 'Google se continue karein', noAccount: 'Account nahi hai?',
    haveAccount: 'Pehle se account hai?', checkEmail: 'Account confirm karne ke liye apna email dekhein, phir log in karein.',
    resetSent: 'Agar yeh email registered hai, to reset link bhej diya gaya hai.',
    workspace: 'Business', createWorkspace: 'Business banayein', businessName: 'Business ka naam', businessType: 'Business ka type',
    dataset: 'Data file', chooseFile: 'CSV ya Excel file chunein', uploadBtn: 'Upload karein aur file padhein', run: 'Chalayein',
    loading: 'Load ho raha hai...', calcHow: 'Yeh kaise nikala gaya?', language: 'Bhasha', send: 'Bhejein',
    typeQuestion: 'Apne business ke baare mein poochhein...', compareModels: 'Sabhi models ki tulna karein', runModel: 'Model chalayein',
    descriptive: 'Kya hua', diagnostic: 'Kyun hua', predictive: 'Aage kya hoga', prescriptive: 'Ab kya karein',
  },
}

const Ctx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('aethra_lang') || 'en')
  useEffect(() => {
    localStorage.setItem('aethra_lang', lang)
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en'
  }, [lang])
  const t = (k) => T[lang]?.[k] ?? T.en[k] ?? k
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}
export const useI18n = () => useContext(Ctx)
