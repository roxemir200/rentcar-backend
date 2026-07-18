// Dictionnaire de traductions — FR / EN / AR
export type Lang = "fr" | "en" | "ar";

export const LANGS: { code: Lang; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇹🇳", dir: "rtl" },
];

// Clés de traduction partagées (chrome + nouvelles pages)
const dict = {
  // Navbar / navigation
  "nav.home": { fr: "Accueil", en: "Home", ar: "الرئيسية" },
  "nav.cars": { fr: "Voitures", en: "Cars", ar: "السيارات" },
  "nav.reservations": { fr: "Mes réservations", en: "My reservations", ar: "حجوزاتي" },
  "nav.payments": { fr: "Paiements", en: "Payments", ar: "المدفوعات" },
  "nav.reviews": { fr: "Avis", en: "Reviews", ar: "التقييمات" },
  "nav.notifications": { fr: "Notifications", en: "Notifications", ar: "الإشعارات" },
  "nav.profile": { fr: "Mon profil", en: "My profile", ar: "ملفي الشخصي" },
  "nav.documents": { fr: "Factures & documents", en: "Invoices & documents", ar: "الفواتير والوثائق" },
  "nav.changePassword": { fr: "Changer le mot de passe", en: "Change password", ar: "تغيير كلمة المرور" },
  "nav.support": { fr: "Support", en: "Support", ar: "الدعم" },
  "nav.login": { fr: "Connexion", en: "Sign in", ar: "تسجيل الدخول" },
  "nav.register": { fr: "S'inscrire", en: "Sign up", ar: "إنشاء حساب" },
  "nav.logout": { fr: "Se déconnecter", en: "Sign out", ar: "تسجيل الخروج" },
  "nav.admin": { fr: "Admin", en: "Admin", ar: "الإدارة" },
  "nav.menu": { fr: "Menu", en: "Menu", ar: "القائمة" },

  // Actions communes
  "action.save": { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  "action.cancel": { fr: "Annuler", en: "Cancel", ar: "إلغاء" },
  "action.view": { fr: "Voir", en: "View", ar: "عرض" },
  "action.download": { fr: "Télécharger PDF", en: "Download PDF", ar: "تحميل PDF" },
  "action.export": { fr: "Exporter", en: "Export", ar: "تصدير" },
  "action.send": { fr: "Envoyer", en: "Send", ar: "إرسال" },
  "action.today": { fr: "Aujourd'hui", en: "Today", ar: "اليوم" },

  // Documents
  "docs.title": { fr: "Factures & documents", en: "Invoices & documents", ar: "الفواتير والوثائق" },
  "docs.subtitle": { fr: "Consultez et téléchargez tous vos documents.", en: "View and download all your documents.", ar: "اطلع على جميع وثائقك وقم بتحميلها." },
  "docs.contracts": { fr: "Contrats", en: "Contracts", ar: "العقود" },
  "docs.invoices": { fr: "Factures", en: "Invoices", ar: "الفواتير" },
  "docs.contractNo": { fr: "N° Contrat", en: "Contract No.", ar: "رقم العقد" },
  "docs.invoiceNo": { fr: "N° Facture", en: "Invoice No.", ar: "رقم الفاتورة" },
  "docs.car": { fr: "Voiture", en: "Car", ar: "السيارة" },
  "docs.dates": { fr: "Dates", en: "Dates", ar: "التواريخ" },
  "docs.amount": { fr: "Montant", en: "Amount", ar: "المبلغ" },
  "docs.date": { fr: "Date", en: "Date", ar: "التاريخ" },
  "docs.status": { fr: "Statut", en: "Status", ar: "الحالة" },
  "docs.actions": { fr: "Actions", en: "Actions", ar: "إجراءات" },
  "docs.emptyContracts": { fr: "Aucun contrat pour le moment.", en: "No contracts yet.", ar: "لا توجد عقود بعد." },
  "docs.emptyInvoices": { fr: "Aucune facture pour le moment.", en: "No invoices yet.", ar: "لا توجد فواتير بعد." },

  // Password
  "pwd.title": { fr: "Changer le mot de passe", en: "Change password", ar: "تغيير كلمة المرور" },
  "pwd.subtitle": { fr: "Sécurisez votre compte avec un nouveau mot de passe.", en: "Secure your account with a new password.", ar: "قم بتأمين حسابك بكلمة مرور جديدة." },
  "pwd.current": { fr: "Mot de passe actuel", en: "Current password", ar: "كلمة المرور الحالية" },
  "pwd.new": { fr: "Nouveau mot de passe", en: "New password", ar: "كلمة المرور الجديدة" },
  "pwd.confirm": { fr: "Confirmer le nouveau mot de passe", en: "Confirm new password", ar: "تأكيد كلمة المرور الجديدة" },
  "pwd.strength": { fr: "Force du mot de passe", en: "Password strength", ar: "قوة كلمة المرور" },
  "pwd.update": { fr: "Mettre à jour le mot de passe", en: "Update password", ar: "تحديث كلمة المرور" },
  "pwd.success": { fr: "Mot de passe mis à jour avec succès.", en: "Password updated successfully.", ar: "تم تحديث كلمة المرور بنجاح." },

  // Support chat
  "chat.title": { fr: "Support RentCar", en: "RentCar Support", ar: "دعم RentCar" },
  "chat.online": { fr: "En ligne", en: "Online", ar: "متصل" },
  "chat.placeholder": { fr: "Écrivez votre message…", en: "Type your message…", ar: "اكتب رسالتك…" },
  "chat.greeting": { fr: "Bonjour 👋 Comment pouvons-nous vous aider aujourd'hui ?", en: "Hello 👋 How can we help you today?", ar: "مرحبًا 👋 كيف يمكننا مساعدتك اليوم؟" },
  "chat.auto": { fr: "Merci pour votre message ! Un conseiller vous répondra très bientôt.", en: "Thanks for your message! An advisor will reply shortly.", ar: "شكرًا لرسالتك! سيرد عليك مستشار قريبًا." },

  // Theme
  "theme.light": { fr: "Mode clair", en: "Light mode", ar: "الوضع الفاتح" },
  "theme.dark": { fr: "Mode sombre", en: "Dark mode", ar: "الوضع الداكن" },
} as const;

export type TranslationKey = keyof typeof dict;

export function translate(key: TranslationKey, lang: Lang): string {
  const entry = dict[key];
  return entry ? entry[lang] : key;
}
