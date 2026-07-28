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
  "nav.recommendations": { fr: "Recommandation", en: "Recommendations", ar: "التوصيات" },
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

  // Pages — Voitures (CarsList)
  "cars.pageTitle": { fr: "Nos voitures disponibles", en: "Our available cars", ar: "سياراتنا المتاحة" },
  "cars.pageSubtitle": { fr: "Trouvez le véhicule idéal parmi notre flotte premium.", en: "Find the ideal vehicle among our premium fleet.", ar: "اعثر على المركبة المثالية ضمن أسطولنا المتميز." },
  "cars.searchPlaceholder": { fr: "Marque ou modèle...", en: "Brand or model...", ar: "الماركة أو الموديل..." },
  "cars.fuelLabel": { fr: "Carburant", en: "Fuel type", ar: "نوع الوقود" },
  "cars.transmissionLabel": { fr: "Transmission", en: "Transmission", ar: "ناقل الحركة" },
  "cars.minPrice": { fr: "Prix min", en: "Min price", ar: "السعر الأدنى" },
  "cars.maxPrice": { fr: "Prix max", en: "Max price", ar: "السعر الأقصى" },
  "cars.categories": { fr: "Catégories :", en: "Categories:", ar: "الفئات :" },
  "cars.resetFilters": { fr: "Réinitialiser", en: "Reset filters", ar: "إعادة التعيين" },
  "cars.foundCount_one": { fr: "{{count}} véhicule trouvé", en: "{{count}} vehicle found", ar: "تم العثور على مركبة واحدة" },
  "cars.foundCount_other": { fr: "{{count}} véhicules trouvés", en: "{{count}} vehicles found", ar: "تم العثور على {{count}} مركبة" },
  "cars.noResult": { fr: "Aucun véhicule ne correspond à vos filtres.", en: "No vehicles match your filters.", ar: "لا توجد مركبات تطابق عوامل التصفية الخاصة بك." },
  "cars.tryBroaden": { fr: "Essayez d'élargir vos critères de recherche.", en: "Try broadening your search criteria.", ar: "حاول توسيع معايير البحث الخاصة بك." },

  // Voitures — Statuts (Badge CarCard)
  "car.status.AVAILABLE": { fr: "Disponible", en: "Available", ar: "متاح" },
  "car.status.RESERVED": { fr: "Réservée", en: "Reserved", ar: "محجوز" },
  "car.status.RENTED": { fr: "Louée", en: "Rented", ar: "مؤجر" },

  // Voitures — Carte (CarCard)
  "car.noReviews": { fr: "Aucun avis", en: "No reviews", ar: "لا توجد تقييمات" },
  "car.reviewsCount_one": { fr: "{{count}} avis", en: "{{count}} review", ar: "تقييم واحد" },
  "car.reviewsCount_other": { fr: "{{count}} avis", en: "{{count}} reviews", ar: "{{count}} تقييمات" },
  "car.transmission.autoShort": { fr: "Auto", en: "Auto", ar: "أوتوماتيكي" },
  "car.transmission.manualShort": { fr: "Man.", en: "Manual", ar: "يدوي" },
  "car.perDay": { fr: "/jour", en: "/day", ar: "/يوم" },
  "car.viewDetails": { fr: "Voir détails", en: "View details", ar: "عرض التفاصيل" },

  // Filtres statiques (Options selects)
  "opt.anyFuel": { fr: "Tous carburants", en: "All fuels", ar: "كل أنواع الوقود" },
  "opt.anyTransmission": { fr: "Toutes transmissions", en: "All transmissions", ar: "كل أنواع ناقلات الحركة" },

  // Catégories voitures (Badges CarCard + Chips filtres) — les + courantes
  "categ.SUV / Spacieux": { fr: "SUV / Spacieux", en: "SUV / Spacious", ar: "دفع رباعي / واسع" },
  "categ.Berline / Confort": { fr: "Berline / Confort", en: "Sedan / Comfort", ar: "سيدان / مريح" },
  "categ.ÉCONOMIQUE": { fr: "ÉCONOMIQUE", en: "ECONOMY", ar: "اقتصادي" },
  "categ.Economique": { fr: "Économique", en: "Economy", ar: "اقتصادي" },
  "categ.Citadine": { fr: "Citadine", en: "City car", ar: "مدينة" },
  "categ.Utilitaire": { fr: "Utilitaire", en: "Van", ar: "شاحنة" },
  "categ.Luxe": { fr: "Luxe", en: "Luxury", ar: "فاخر" },
  "categ.Cabriolet": { fr: "Cabriolet", en: "Convertible", ar: "مكشوف" },
  "categ.Hybride / Electrique": { fr: "Hybride / Électrique", en: "Hybrid / Electric", ar: "هجين / كهربائي" },
  "categ.Familiale": { fr: "Familiale", en: "Family", ar: "عائلية" },
  "categ.Sport": { fr: "Sport", en: "Sport", ar: "رياضي" },
  "categ.Pickup": { fr: "Pick-up", en: "Pickup truck", ar: "بيك آب" },
  "categ.Autre": { fr: "Autre", en: "Other", ar: "أخرى" },

  // Carburants (Libellés données API)
  "fuel.Essence": { fr: "Essence", en: "Petrol", ar: "بنزين" },
  "fuel.Diesel": { fr: "Diesel", en: "Diesel", ar: "ديزل" },
  "fuel.Hybride": { fr: "Hybride", en: "Hybrid", ar: "هجين" },
  "fuel.Hybrid": { fr: "Hybride", en: "Hybrid", ar: "هجين" },
  "fuel.Électrique": { fr: "Électrique", en: "Electric", ar: "كهربائي" },
  "fuel.Electrique": { fr: "Électrique", en: "Electric", ar: "كهربائي" },
  "fuel.GPL": { fr: "GPL", en: "LPG", ar: "غاز" },
  "fuel.Ethanol": { fr: "Éthanol", en: "Ethanol", ar: "إيثانول" },

  // Transmissions (Libellés données API)
  "trans.Automatique": { fr: "Automatique", en: "Automatic", ar: "أوتوماتيكي" },
  "trans.Manuelle": { fr: "Manuelle", en: "Manual", ar: "يدوي" },
  "trans.Semi-automatique": { fr: "Semi-automatique", en: "Semi-automatic", ar: "شبه أوتوماتيكي" },
  "trans.CVT": { fr: "CVT", en: "CVT", ar: "ستيرويد" },

  // Recommandations (CarRecommender)
  "rec.pageTitle": { fr: "Conseils personnalisés", en: "Personalized advice", ar: "توصيات مخصصة" },
  "rec.pageSubtitle": { fr: "Répondez à 5 questions, notre moteur vous suggère les 3 véhicules les plus adaptés à votre voyage.", en: "Answer 5 questions, our engine suggests the 3 most suitable vehicles for your trip.", ar: "أجب على 5 أسئلة، وسيقوم محركنا باقتراح 3 مركبات الأنسب لرحلتك." },
  "rec.startOver": { fr: "Recommencer", en: "Start over", ar: "إعادة البدء" },
  "rec.prev": { fr: "Précédent", en: "Previous", ar: "السابق" },
  "rec.next": { fr: "Suivant", en: "Next", ar: "التالي" },
  "rec.analyzing": { fr: "Analyse en cours…", en: "Analyzing in progress…", ar: "جاري التحليل…" },
  "rec.analyzingHint": { fr: "Nous comparons vos préférences à notre flotte entière.", en: "We compare your preferences to our entire fleet.", ar: "نقارن تفضيلاتك بكامل أسطولنا." },
  "rec.noMatch": { fr: "Aucune recommandation disponible.", en: "No recommendations available.", ar: "لا توجد توصيات متاحة." },
  "rec.noMatchHint": { fr: "Essayez d'élargir votre budget, de réduire le nombre de passagers ou de choisir « Indifférent » pour la transmission.", en: "Try increasing your budget, reducing passenger count, or choosing “Any” for transmission.", ar: "حاول زيادة ميزانيتك أو تقليل عدد الركاب أو اختيار \"لا يهم\" لناقل الحركة." },

  // Wizard — Steps 1-5
  "rec.step1.title": { fr: "Objectif", en: "Objective", ar: "الهدف" },
  "rec.step1.label": { fr: "Usage de la voiture", en: "Car usage", ar: "الغرض من السيارة" },
  "rec.obj.QUOTIDIEN.label": { fr: "Quotidien", en: "Daily", ar: "يومي" },
  "rec.obj.QUOTIDIEN.hint": { fr: "Ville & trajets courts", en: "City & short trips", ar: "المدينة و الرحلات القصيرة" },
  "rec.obj.FAMILLE.label": { fr: "Famille", en: "Family", ar: "عائلة" },
  "rec.obj.FAMILLE.hint": { fr: "Espace & sécurité", en: "Space & safety", ar: "مساحة و أمان" },
  "rec.obj.PROFESSIONNEL.label": { fr: "Professionnel", en: "Professional", ar: "احترافي" },
  "rec.obj.PROFESSIONNEL.hint": { fr: "Business & prestige", en: "Business & prestige", ar: "أعمال و هيبة" },
  "rec.obj.AVENTURE.label": { fr: "Aventure", en: "Adventure", ar: "مغامرة" },
  "rec.obj.AVENTURE.hint": { fr: "Robuste & voyage", en: "Robust & travel", ar: "قوي و سفر" },
  "rec.obj.CONFORT.label": { fr: "Confort", en: "Comfort", ar: "راحة" },
  "rec.obj.CONFORT.hint": { fr: "Longs trajets premium", en: "Long premium trips", ar: "رحلات طويلة فاخرة" },
  "rec.obj.ECOLOGIQUE.label": { fr: "Écologique", en: "Eco-friendly", ar: "بيئي" },
  "rec.obj.ECOLOGIQUE.hint": { fr: "Hybride / Électrique", en: "Hybrid / Electric", ar: "هجين / كهربائي" },

  "rec.step2.title": { fr: "Budget", en: "Budget", ar: "الميزانية" },
  "rec.step2.label": { fr: "Budget par jour", en: "Per-day budget", ar: "الميزانية اليومية" },
  "rec.step2.hint": { fr: "Entrez le montant maximum que vous souhaitez dépenser par jour.", en: "Enter the maximum amount you want to spend per day.", ar: "أدخل الحد الأقصى الذي ترغب في إنفاقه يوميًا." },
  "rec.step2.total": { fr: "Estimation totale", en: "Total estimate", ar: "التقدير الإجمالي" },
  "rec.step2.forDays_one": { fr: "Pour {{count}} jour", en: "For {{count}} day", ar: "ليوم واحد" },
  "rec.step2.forDays_other": { fr: "Pour {{count}} jours", en: "For {{count}} days", ar: "لمدة {{count}} أيام" },
  "rec.perDay": { fr: "/ jour", en: "/ day", ar: "/ يوم" },
  "rec.days_one": { fr: "{{count}} jour", en: "{{count}} day", ar: "يوم واحد" },
  "rec.days_other": { fr: "{{count}} jours", en: "{{count}} days", ar: "{{count}} أيام" },

  "rec.step3.title": { fr: "Passagers", en: "Passengers", ar: "الركاب" },
  "rec.step3.label": { fr: "Combien de passagers", en: "How many passengers", ar: "عدد الركاب" },
  "rec.step3.countLabel": { fr: "Nombre de passagers", en: "Passenger count", ar: "عدد الركاب" },
  "rec.step3.largeFamily": { fr: "Famille nombreuse", en: "Large family", ar: "عائلة كبيرة" },
  "rec.passenger_one": { fr: "{{count}} passager", en: "{{count}} passenger", ar: "راكب واحد" },
  "rec.passenger_other": { fr: "{{count}} passagers", en: "{{count}} passengers", ar: "{{count}} ركاب" },
  "rec.perfect": { fr: "Parfait", en: "Perfect", ar: "مثالي" },

  "rec.step4.title": { fr: "Durée", en: "Duration", ar: "المدة" },
  "rec.step4.label": { fr: "Durée de location", en: "Rental duration", ar: "مدة الإيجار" },

  "rec.step5.title": { fr: "Transmission", en: "Transmission", ar: "ناقل الحركة" },
  "rec.step5.label": { fr: "Transmission souhaitée", en: "Preferred transmission", ar: "ناقل الحركة المفضل" },
  "rec.trans.ANY.label": { fr: "Indifférent", en: "Any", ar: "لا يهم" },
  "rec.trans.ANY.hint": { fr: "Toutes options acceptées", en: "Accept all options", ar: "جميع الخيارات مقبولة" },
  "rec.trans.AUTOMATIC.label": { fr: "Automatique", en: "Automatic", ar: "أوتوماتيكي" },
  "rec.trans.AUTOMATIC.hint": { fr: "Conduite sans effort", en: "Effortless driving", ar: "قيادة سهلة" },
  "rec.trans.MANUAL.label": { fr: "Manuelle", en: "Manual", ar: "يدوي" },
  "rec.trans.MANUAL.hint": { fr: "Conduite sportive", en: "Sporty driving", ar: "قيادة رياضية" },
  "rec.transmissionFree": { fr: "Transmission libre", en: "Any transmission", ar: "ناقل حركة حر" },

  // Score / labels résultats
  "rec.score.excellent": { fr: "Excellent", en: "Excellent", ar: "ممتاز" },
  "rec.score.veryGood": { fr: "Très bien", en: "Very good", ar: "جيد جدًا" },
  "rec.score.good": { fr: "Bien", en: "Good", ar: "جيد" },
  "rec.score.correct": { fr: "Correct", en: "Fair", ar: "مقبول" },
  "rec.rank.match": { fr: "Match parfait", en: "Perfect match", ar: "تطابق تام" },
  "rec.rank.top": { fr: "Meilleur choix", en: "Top pick", ar: "أفضل خيار" },
  "rec.rank.premium": { fr: "Option premium", en: "Premium option", ar: "خيار متميز" },
  "rec.meta.mlActive": { fr: "✨ Service ML actif", en: "✨ ML service running", ar: "✨ خدمة التعلم الآلي نشطة" },
  "rec.meta.fallback": { fr: "🤖 Moteur hybride", en: "🤖 Hybrid engine", ar: "🤖 محرك هجين" },
  "rec.meta.scored_one": { fr: "{{count}} véhicule analysé", en: "{{count}} vehicle analyzed", ar: "تم تحليل مركبة واحدة" },
  "rec.meta.scored_other": { fr: "{{count}} véhicules analysés", en: "{{count}} vehicles analyzed", ar: "تم تحليل {{count}} مركبة" },
  "rec.book": { fr: "Réserver", en: "Book now", ar: "احجز الآن" },

  // SupportChat (ajouts)
  "chat.offline": { fr: "Hors ligne", en: "Offline", ar: "غير متصل" },
  "chat.empty": { fr: "Aucun message. Posez votre question !", en: "No messages. Ask your question!", ar: "لا توجد رسائل. اطرح سؤالك!" },
  "chat.placeholderOnline": { fr: "Écrire un message...", en: "Type a message...", ar: "اكتب رسالة..." },
  "chat.placeholderOffline": { fr: "Connexion en cours...", en: "Connecting...", ar: "جاري الاتصال..." },

  // Documents — statuts / compléments
  "docs.pdf": { fr: "PDF", en: "PDF", ar: "PDF" },
  "docs.loadingContracts": { fr: "Chargement des contrats...", en: "Loading contracts...", ar: "جاري تحميل العقود..." },
  "docs.status.SIGNED": { fr: "Signé", en: "Signed", ar: "موقع" },
  "docs.status.DRAFT": { fr: "Brouillon", en: "Draft", ar: "مسودة" },
  "docs.status.CANCELLED": { fr: "Annulé", en: "Cancelled", ar: "ملغي" },
  "docs.status.COMPLETED": { fr: "Payé", en: "Paid", ar: "مدفوع" },
  "docs.status.PENDING": { fr: "En attente", en: "Pending", ar: "قيد الانتظار" },
  "docs.toast.contract": { fr: "Contrat téléchargé (PDF).", en: "Contract downloaded (PDF).", ar: "تم تحميل العقد (PDF)." },
  "docs.toast.invoice": { fr: "Facture téléchargée (PDF).", en: "Invoice downloaded (PDF).", ar: "تم تحميل الفاتورة (PDF)." },

  // ChangePassword — compléments (erreurs + niveaux force + placeholders + conseil)
  "pwd.level.0": { fr: "Très faible", en: "Very weak", ar: "ضعيف جدًا" },
  "pwd.level.1": { fr: "Faible", en: "Weak", ar: "ضعيف" },
  "pwd.level.2": { fr: "Moyen", en: "Medium", ar: "متوسط" },
  "pwd.level.3": { fr: "Bon", en: "Good", ar: "جيد" },
  "pwd.level.4": { fr: "Excellent", en: "Excellent", ar: "ممتاز" },
  "pwd.err.currentRequired": { fr: "Le mot de passe actuel est obligatoire", en: "Current password is required", ar: "كلمة المرور الحالية مطلوبة" },
  "pwd.err.newRequired": { fr: "Le nouveau mot de passe est obligatoire", en: "New password is required", ar: "كلمة المرور الجديدة مطلوبة" },
  "pwd.err.minLength": { fr: "Le mot de passe doit avoir au moins 6 caractères", en: "Password must be at least 6 characters long", ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل" },
  "pwd.err.confirmRequired": { fr: "Veuillez confirmer le mot de passe", en: "Please confirm your password", ar: "يرجى تأكيد كلمة المرور" },
  "pwd.err.mismatch": { fr: "Les mots de passe ne correspondent pas", en: "Passwords do not match", ar: "كلمات المرور غير متطابقة" },
  "pwd.err.fixErrors": { fr: "Veuillez corriger les erreurs", en: "Please fix the errors", ar: "يرجى تصحيح الأخطاء" },
  "pwd.toast.success": { fr: "Mot de passe modifié avec succès", en: "Password updated successfully", ar: "تم تغيير كلمة المرور بنجاح" },
  "pwd.err.changeFailed": { fr: "Erreur lors du changement", en: "Change failed", ar: "فشل أثناء التغيير" },
  "pwd.err.serverUnreachable": { fr: "Erreur de connexion au serveur", en: "Cannot reach server", ar: "تعذر الاتصال بالخادم" },
  "pwd.ph.current": { fr: "Votre mot de passe actuel", en: "Your current password", ar: "كلمة المرور الحالية" },
  "pwd.ph.new": { fr: "Nouveau mot de passe (min 6 caractères)", en: "New password (min 6 chars)", ar: "كلمة مرور جديدة (6 أحرف على الأقل)" },
  "pwd.ph.confirm": { fr: "Confirmez votre nouveau mot de passe", en: "Confirm your new password", ar: "أكد كلمة المرور الجديدة" },
  "pwd.tip.security": { fr: "Choisissez un mot de passe unique combinant lettres, chiffres et symboles.", en: "Choose a unique password mixing letters, numbers and symbols.", ar: "اختر كلمة مرور فريدة تمزج بين الأحرف والأرقام والرموز." },

  // Divers / UI
  "ui.loading": { fr: "Chargement...", en: "Loading...", ar: "جاري التحميل..." },
  "ui.or": { fr: "ou", en: "or", ar: "أو" },
  "ui.close": { fr: "Fermer", en: "Close", ar: "إغلاق" },
  "ui.back": { fr: "Retour", en: "Back", ar: "رجوع" },
} as const;

export type TranslationKey = keyof typeof dict;

export function translate(key: TranslationKey, lang: Lang): string {
  const entry = dict[key];
  return entry ? entry[lang] : key;
}
