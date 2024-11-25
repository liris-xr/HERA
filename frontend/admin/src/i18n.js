import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import {createI18n} from "vue-i18n";

const locales = [
    { en: en },
    {es: es},
    { fr: fr },
    //add future locales here
];



export const stringLocales = []
const messages = {};
locales.forEach((lang) => {
    const key = Object.keys(lang);
    messages[key] = lang[key];
    stringLocales.push({string: lang[key].locale, value: key[0]})
});


let currentLocale = localStorage.getItem("locale");
if (!currentLocale) currentLocale = "en";

const i18n = createI18n({
    locale: currentLocale,
    fallbackLocale: "en",
    legacy: false,
    messages: messages,
    globalInjection: true
});

export default i18n
