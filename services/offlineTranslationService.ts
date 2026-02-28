// services/offlineTranslationService.ts
// Offline translation service using browser APIs and translation dictionaries

import { translations } from '../data/translations';

// Comprehensive translation dictionary for common UI strings
const offlineTranslations: Record<string, Record<string, string>> = {
  en: {
    'language': 'Language',
    'select_language': 'Select a Language',
    'search_language': 'Search for a language...',
    'price': 'Price',
    'total': 'Total',
    'add_to_cart': 'Add to Cart',
    'checkout': 'Checkout',
    'home': 'Home',
    'products': 'Products',
    'profile': 'Profile',
    'settings': 'Settings',
    'logout': 'Logout',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'confirm': 'Confirm',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'save': 'Save',
    'close': 'Close',
    'search': 'Search',
    'filter': 'Filter',
    'sort': 'Sort',
    'view_all': 'View All',
    'show_more': 'Show More',
    'show_less': 'Show Less',
    'no_results': 'No results found',
    'try_again': 'Try Again',
    'welcome': 'Welcome',
    'goodbye': 'Goodbye',
    'thank_you': 'Thank You',
    'sorry': 'Sorry',
    'hello': 'Hello',
    'currency_symbol': '$',
  },
  es: {
    'language': 'Idioma',
    'select_language': 'Selecciona un idioma',
    'search_language': 'Busca un idioma...',
    'price': 'Precio',
    'total': 'Total',
    'add_to_cart': 'Agregar al carrito',
    'checkout': 'Pagar',
    'home': 'Inicio',
    'products': 'Productos',
    'profile': 'Perfil',
    'settings': 'Configuración',
    'logout': 'Cerrar sesión',
    'loading': 'Cargando...',
    'error': 'Error',
    'success': 'Éxito',
    'confirm': 'Confirmar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'save': 'Guardar',
    'close': 'Cerrar',
    'search': 'Buscar',
    'filter': 'Filtrar',
    'sort': 'Ordenar',
    'view_all': 'Ver todo',
    'show_more': 'Mostrar más',
    'show_less': 'Mostrar menos',
    'no_results': 'No se encontraron resultados',
    'try_again': 'Intentar de nuevo',
    'welcome': 'Bienvenido',
    'goodbye': 'Adiós',
    'thank_you': 'Gracias',
    'sorry': 'Lo siento',
    'hello': 'Hola',
    'currency_symbol': '€',
  },
  fr: {
    'language': 'Langue',
    'select_language': 'Sélectionner une langue',
    'search_language': 'Rechercher une langue...',
    'price': 'Prix',
    'total': 'Total',
    'add_to_cart': 'Ajouter au panier',
    'checkout': 'Passer la commande',
    'home': 'Accueil',
    'products': 'Produits',
    'profile': 'Profil',
    'settings': 'Paramètres',
    'logout': 'Déconnexion',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'success': 'Succès',
    'confirm': 'Confirmer',
    'cancel': 'Annuler',
    'delete': 'Supprimer',
    'edit': 'Modifier',
    'save': 'Enregistrer',
    'close': 'Fermer',
    'search': 'Rechercher',
    'filter': 'Filtrer',
    'sort': 'Trier',
    'view_all': 'Voir tout',
    'show_more': 'Afficher plus',
    'show_less': 'Afficher moins',
    'no_results': 'Aucun résultat trouvé',
    'try_again': 'Réessayer',
    'welcome': 'Bienvenue',
    'goodbye': 'Au revoir',
    'thank_you': 'Merci',
    'sorry': 'Désolé',
    'hello': 'Bonjour',
    'currency_symbol': '€',
  },
  de: {
    'language': 'Sprache',
    'select_language': 'Wählen Sie eine Sprache',
    'search_language': 'Sprache suchen...',
    'price': 'Preis',
    'total': 'Insgesamt',
    'add_to_cart': 'In den Warenkorb',
    'checkout': 'Zur Kasse',
    'home': 'Startseite',
    'products': 'Produkte',
    'profile': 'Profil',
    'settings': 'Einstellungen',
    'logout': 'Abmelden',
    'loading': 'Wird geladen...',
    'error': 'Fehler',
    'success': 'Erfolg',
    'confirm': 'Bestätigen',
    'cancel': 'Abbrechen',
    'delete': 'Löschen',
    'edit': 'Bearbeiten',
    'save': 'Speichern',
    'close': 'Schließen',
    'search': 'Suchen',
    'filter': 'Filtern',
    'sort': 'Sortieren',
    'view_all': 'Alle anzeigen',
    'show_more': 'Mehr anzeigen',
    'show_less': 'Weniger anzeigen',
    'no_results': 'Keine Ergebnisse gefunden',
    'try_again': 'Erneut versuchen',
    'welcome': 'Willkommen',
    'goodbye': 'Auf Wiedersehen',
    'thank_you': 'Danke',
    'sorry': 'Entschuldigung',
    'hello': 'Hallo',
    'currency_symbol': '€',
  },
  zh: {
    'language': '语言',
    'select_language': '选择语言',
    'search_language': '搜索语言...',
    'price': '价格',
    'total': '总计',
    'add_to_cart': '加入购物车',
    'checkout': '结账',
    'home': '首页',
    'products': '产品',
    'profile': '个人资料',
    'settings': '设置',
    'logout': '登出',
    'loading': '加载中...',
    'error': '错误',
    'success': '成功',
    'confirm': '确认',
    'cancel': '取消',
    'delete': '删除',
    'edit': '编辑',
    'save': '保存',
    'close': '关闭',
    'search': '搜索',
    'filter': '筛选',
    'sort': '排序',
    'view_all': '查看全部',
    'show_more': '显示更多',
    'show_less': '显示更少',
    'no_results': '未找到结果',
    'try_again': '重试',
    'welcome': '欢迎',
    'goodbye': '再见',
    'thank_you': '谢谢',
    'sorry': '抱歉',
    'hello': '你好',
    'currency_symbol': '¥',
  },
  ja: {
    'language': '言語',
    'select_language': '言語を選択',
    'search_language': '言語を検索...',
    'price': '価格',
    'total': '合計',
    'add_to_cart': 'カートに追加',
    'checkout': 'チェックアウト',
    'home': 'ホーム',
    'products': '商品',
    'profile': 'プロフィール',
    'settings': '設定',
    'logout': 'ログアウト',
    'loading': '読み込み中...',
    'error': 'エラー',
    'success': '成功',
    'confirm': '確認',
    'cancel': 'キャンセル',
    'delete': '削除',
    'edit': '編集',
    'save': '保存',
    'close': '閉じる',
    'search': '検索',
    'filter': 'フィルター',
    'sort': 'ソート',
    'view_all': 'すべて表示',
    'show_more': 'もっと表示',
    'show_less': '表示を減らす',
    'no_results': '結果が見つかりませんでした',
    'try_again': '再度お試しください',
    'welcome': 'ようこそ',
    'goodbye': 'さようなら',
    'thank_you': 'ありがとうございます',
    'sorry': '申し訳ありません',
    'hello': 'こんにちは',
    'currency_symbol': '¥',
  },
  ar: {
    'language': 'اللغة',
    'select_language': 'اختر لغة',
    'search_language': 'ابحث عن لغة...',
    'price': 'السعر',
    'total': 'الإجمالي',
    'add_to_cart': 'أضف إلى السلة',
    'checkout': 'الدفع',
    'home': 'الرئيسية',
    'products': 'المنتجات',
    'profile': 'الملف الشخصي',
    'settings': 'الإعدادات',
    'logout': 'تسجيل الخروج',
    'loading': 'جاري التحميل...',
    'error': 'خطأ',
    'success': 'نجاح',
    'confirm': 'تأكيد',
    'cancel': 'إلغاء',
    'delete': 'حذف',
    'edit': 'تعديل',
    'save': 'حفظ',
    'close': 'إغلاق',
    'search': 'بحث',
    'filter': 'تصفية',
    'sort': 'ترتيب',
    'view_all': 'عرض الكل',
    'show_more': 'عرض المزيد',
    'show_less': 'عرض أقل',
    'no_results': 'لم يتم العثور على نتائج',
    'try_again': 'حاول مرة أخرى',
    'welcome': 'أهلا وسهلا',
    'goodbye': 'وداعا',
    'thank_you': 'شكرا',
    'sorry': 'آسف',
    'hello': 'مرحبا',
    'currency_symbol': 'ر.س',
  },
  hi: {
    'language': 'भाषा',
    'select_language': 'एक भाषा चुनें',
    'search_language': 'एक भाषा खोजें...',
    'price': 'कीमत',
    'total': 'कुल',
    'add_to_cart': 'कार्ट में जोड़ें',
    'checkout': 'चेकआउट',
    'home': 'होम',
    'products': 'उत्पाद',
    'profile': 'प्रोफ़ाइल',
    'settings': 'सेटिंग्स',
    'logout': 'लॉग आउट',
    'loading': 'लोड का जा रहा है...',
    'error': 'त्रुटि',
    'success': 'सफलता',
    'confirm': 'नुष्टि करें',
    'cancel': 'रद्द करें',
    'delete': 'हटाएं',
    'edit': 'संपादित करें',
    'save': 'सहेजें',
    'close': 'बंद करें',
    'search': 'खोज',
    'filter': 'फिल्टर',
    'sort': 'सॉर्ट',
    'view_all': 'सब देखें',
    'show_more': 'अधिक दिखाएं',
    'show_less': 'कम दिखाएं',
    'no_results': 'कोई परिणाम नहीं मिले',
    'try_again': 'पुनः प्रयास करें',
    'welcome': 'स्वागत है',
    'goodbye': 'अलविदा',
    'thank_you': 'धन्यवाद',
    'sorry': 'क्षमा करें',
    'hello': 'नमस्ते',
    'currency_symbol': '₹',
  },
};

/**
 * Get offline translation for a key in a specific language
 * Falls back to English if translation not found
 */
export const getOfflineTranslation = (key: string, langCode: string): string => {
  // Try to get translation from offline translations
  const langTranslations = offlineTranslations[langCode];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }

  // Try pre-loaded translations
  const preloadedTranslations = translations as any;
  if (preloadedTranslations[langCode] && preloadedTranslations[langCode][key]) {
    return preloadedTranslations[langCode][key];
  }

  // Fallback to English
  if (offlineTranslations['en'] && offlineTranslations['en'][key]) {
    return offlineTranslations['en'][key];
  }

  // Return the key if no translation found
  return key;
};

/**
 * Format price with locale and currency
 * Works offline using browser's Intl API
 */
export const formatPriceOffline = (
  amount: number,
  currencyCode: string = 'USD',
  langCode: string = 'en'
): string => {
  try {
    // Map language code to locale (e.g., 'en' to 'en-US')
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      'pt-br': 'pt-BR',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      'zh-tw': 'zh-TW',
      ar: 'ar-SA',
      hi: 'hi-IN',
      bn: 'bn-BD',
      pa: 'pa-IN',
      jv: 'id-ID',
      vi: 'vi-VN',
      te: 'te-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      tr: 'tr-TR',
      ur: 'ur-PK',
      gu: 'gu-IN',
      pl: 'pl-PL',
      uk: 'uk-UA',
      ro: 'ro-RO',
      nl: 'nl-NL',
      el: 'el-GR',
      hu: 'hu-HU',
      sv: 'sv-SE',
      cs: 'cs-CZ',
      fi: 'fi-FI',
      da: 'da-DK',
      no: 'nb-NO',
      he: 'he-IL',
      id: 'id-ID',
      ms: 'ms-MY',
      th: 'th-TH',
      af: 'af-ZA',
      am: 'am-ET',
      az: 'az-AZ',
      be: 'be-BY',
      bg: 'bg-BG',
      ca: 'ca-ES',
      co: 'it-IT',
      cy: 'cy-GB',
      et: 'et-EE',
      eo: 'en-US',
      eu: 'eu-ES',
      fa: 'fa-IR',
      tl: 'fil-PH',
      ga: 'ga-IE',
      gd: 'gd-GB',
    };

    const locale = localeMap[langCode] || `${langCode.split('-')[0]}-${langCode.toUpperCase()}`;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to simple format if Intl API fails
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      INR: '₹',
      CNY: '¥',
      KRW: '₩',
      BRL: 'R$',
      RUB: '₽',
      TRY: '₺',
      ILS: '₪',
      IDR: 'Rp',
      MYR: 'RM',
      THB: '฿',
      ZAR: 'R',
      PKR: 'Rs',
      BDT: '৳',
      VND: '₫',
    };

    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol}${amount.toFixed(2)}`;
  }
};

/**
 * Format date with locale
 * Works offline using browser's Intl API
 */
export const formatDateOffline = (
  date: Date,
  langCode: string = 'en'
): string => {
  try {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      'pt-br': 'pt-BR',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      'zh-tw': 'zh-TW',
      ar: 'ar-SA',
      hi: 'hi-IN',
    };

    const locale = localeMap[langCode] || `${langCode.split('-')[0]}-${langCode.toUpperCase()}`;

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
};

/**
 * Get language direction (LTR or RTL)
 */
export const getLanguageDirection = (langCode: string): 'ltr' | 'rtl' => {
  const rtlLanguages = ['ar', 'he', 'ur', 'fa', 'dv', 'ckb', 'ps', 'sd', 'yi'];
  return rtlLanguages.includes(langCode) ? 'rtl' : 'ltr';
};

/**
 * Translate an entire object (deep translation)
 * Works offline using predefined translations
 */
export const translateObjectOffline = async (
  obj: any,
  targetLang: string
): Promise<any> => {
  if (targetLang === 'en') return obj;

  const translate = (value: any): any => {
    if (typeof value === 'string') {
      return getOfflineTranslation(value, targetLang);
    }
    if (Array.isArray(value)) {
      return value.map(translate);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, translate(v)])
      );
    }
    return value;
  };

  return translate(obj);
};
