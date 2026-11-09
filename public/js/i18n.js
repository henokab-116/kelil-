// One dictionary for both apps. Missing keys fall back to English, then to the key itself.
// Keys marked "en+am" below were added in v2 and only have English and Amharic text so far;
// other languages show English for those until a native speaker adds them.
const DICT = {
  am: {
    subtitle: 'በቴሌብር የተደገፈ ዲጂታል የጉዞ መክፈያ',
    tabLogin: 'መግቢያ (Login)', tabRegister: 'መመዝገቢያ (Register)',
    labelPhoneOrEmail: 'ስልክ ቁጥር ወይም ኢሜይል', labelPassword: 'የይለፍ ቃል (PIN / Password)',
    labelFullName: 'ሙሉ ስም (Full Name)', labelPhone: 'ስልክ ቁጥር (Phone Number)', labelLicense: 'የመንጃ ፈቃድ ቁጥር (License No.)',
    btnSignIn: 'ግባ', btnSignUp: 'ተመዝገብ',
    welcome: 'እንኳን ደህና መጡ', balanceLabel: 'ያለው ቀሪ ሒሳብ', cardLabel: 'ካርድ',
    topupBtn: 'በ ቴሌብር ሙላ', qrBtn: 'QR ኮድ አሳይ', historyTitle: 'የጉዞ እና ክፍያ ታሪክ',
    navHome: 'መነሻ', navTx: 'ግብይቶች', navProfile: 'መገለጫ', logoutBtn: 'ውጣ',
    appTitle: 'የሹፌር መቆጣጠሪያ', authPortalHeading: 'Transit Driver Portal', authPortalSub: 'የሹፌር መለያ ይግቡ ወይም አዲስ ይመዝገቡ',
    btnLogin: 'ስራ ጀምር (Login)', btnRegister: 'አዲስ ሹፌር መዝግብ', statusOnDuty: 'ስራ ላይ',
    secSelectVehicle: '1. የተሽከርካሪ ዓይነት ይምረጡ', unitPass: 'ሰው', vehBajaj: 'ባጃጅ', vehEBajaj: 'ኤሌክትሪክ', vehTaxi: 'ታክሲ',
    secRouteFare: '2. የመስመር እና ታሪፍ ማስተካከያ', labelRoute: 'የጉዞ መስመር', labelFare: 'ታሪፍ (Fare ETB)',
    labelPsgLoad: 'የተሳፋሪዎች ጭነት', btnOffboard: 'ወርደዋል (-1)', btnOnboard: 'ተሳፍረዋል (+1)',
    readyToReceive: 'ክፍያ ለመቀበል ዝግጁ', scanPrompt: 'የተሳፋሪውን NFC ካርድ ወይም QR ኮድ ያስጠጉ',
    btnTapNFC: 'ካርድ አስነካ (Tap NFC)', btnScanQR: 'QR ኮድ አንብብ (Scan QR)',
    lblShiftEarnings: 'የዛሬው ገቢ (Shift Total)', lblTotalPassengers: 'የተሳፈሩ ተሳፋሪዎች',
    lblRecentBoardings: 'የቅርብ ጊዜ ክፍያዎች', msgNoHistory: 'እስካሁን ምንም ክፍያ አልተመዘገበም',
    // en+am
    labelEmailOptional: 'ኢሜይል (አማራጭ)', labelPlate: 'የሰሌዳ ቁጥር', labelVehicleType: 'የተሽከርካሪ ዓይነት',
    noTx: 'እስካሁን ምንም ግብይት የለም',
    qrTitle: 'የክፍያ QR ኮድዎ', qrHint: 'ይህን ኮድ ለሹፌሩ ያሳዩ። በራሱ ይታደሳል።',
    myCard: 'የእኔ ካርድ', linkCard: 'NFC ካርድ አገናኝ', unlinkCard: 'ካርድ አላቅቅ',
    cardLinked: 'NFC ካርድ ተገናኝቷል', cardNotLinked: 'ምንም NFC ካርድ አልተገናኘም', tapCardNow: 'ካርዱን ከስልኩ ጀርባ ያስጠጉ…',
    amountLabel: 'መጠን (ብር)', btnPayTelebirr: 'በቴሌብር ክፈል (ሙከራ)', topupDone: 'ገንዘብ ተሞልቷል',
    walletLabel: 'ቦርሳ', btnWithdraw: 'ገንዘብ አውጣ', btnConfirm: 'አረጋግጥ', withdrawDone: 'የማውጣት ጥያቄ ተልኳል',
    pendingApproval: 'የሹፌር መለያዎ ፍቃድ በመጠበቅ ላይ ነው።', btnRefresh: 'እንደገና ፈትሽ',
    btnStopNfc: 'NFC አቁም', nfcListening: 'NFC አንባቢ ሥራ ላይ ነው — ካርድ ያስጠጉ',
    nfcUnsupported: 'NFC ለመጠቀም Chrome (Android) እና HTTPS ያስፈልጋል።',
    btnManual: 'ኮድ በእጅ አስገባ (ሙከራ)', manualPrompt: 'QR ኮድ ወይም የካርድ ቁጥር ይለጥፉ፡',
    scanQrTitle: 'የተሳፋሪ QR ያንብቡ', paidOk: 'ተከፍሏል', vehicleFull: 'ተሽከርካሪው ሙሉ ነው!', driverApp: 'የሹፌር መተግበሪያ',
    passengerApp: 'የተሳፋሪ መተግበሪያ',
    err_NETWORK: 'ከአገልጋዩ ጋር መገናኘት አልተቻለም። ኢንተርኔትዎን ያረጋግጡ።',
    err_INVALID_LOGIN: 'የተሳሳተ ስልክ ቁጥር/ኢሜይል ወይም የይለፍ ቃል',
    err_INSUFFICIENT_BALANCE: 'በቂ ቀሪ ሒሳብ የለም',
    err_UNKNOWN_CARD: 'ካርዱ አልታወቀም', err_QR_EXPIRED: 'የQR ኮዱ ጊዜው አልፏል። ተሳፋሪው እንዲያድስ ይጠይቁ።',
    err_ACCOUNT_BLOCKED: 'ይህ መለያ ታግዷል', err_ACCOUNT_PENDING: 'መለያዎ ገና አልጸደቀም',
    err_DUPLICATE_ACCOUNT: 'ይህ ስልክ ቁጥር ወይም ኢሜይል ቀደም ብሎ ተመዝግቧል', err_INVALID_PHONE: 'ትክክለኛ ስልክ ቁጥር ያስገቡ (09… ወይም 07…)',
    err_WRONG_APP: 'ይህ መለያ ለሌላ መተግበሪያ ነው', err_RATE_LIMIT: 'በጣም ብዙ ሙከራዎች። ትንሽ ቆይተው ይሞክሩ።',
    err_INVALID_AMOUNT: 'ልክ ያልሆነ መጠን', err_NFC_READ: 'ካርዱን ማንበብ አልተቻለም። እንደገና ይሞክሩ።', err_SERVER: 'የአገልጋይ ስህተት'
  },
  en: {
    subtitle: 'Digital fare payment, powered by Telebirr',
    tabLogin: 'Login', tabRegister: 'Register',
    labelPhoneOrEmail: 'Phone Number or Email', labelPassword: 'Password / PIN',
    labelFullName: 'Full Name', labelPhone: 'Phone Number', labelLicense: 'Driver License No.',
    btnSignIn: 'Sign In', btnSignUp: 'Sign Up',
    welcome: 'Welcome back', balanceLabel: 'Current Balance', cardLabel: 'Card',
    topupBtn: 'Top Up (Telebirr)', qrBtn: 'Show my QR', historyTitle: 'Trip & Payment History',
    navHome: 'Home', navTx: 'Transactions', navProfile: 'Profile', logoutBtn: 'Logout',
    appTitle: 'Driver Terminal', authPortalHeading: 'Transit Driver Portal', authPortalSub: 'Log in or register a new driver account',
    btnLogin: 'Start Shift (Login)', btnRegister: 'Register New Driver', statusOnDuty: 'On Duty',
    secSelectVehicle: '1. Select Vehicle Type', unitPass: 'Pass', vehBajaj: 'Bajaj', vehEBajaj: 'E-Bajaj', vehTaxi: 'Taxi',
    secRouteFare: '2. Route & Fare Settings', labelRoute: 'Transit Route Name', labelFare: 'Fare (ETB)',
    labelPsgLoad: 'Passenger Capacity', btnOffboard: 'Offboard (-1)', btnOnboard: 'Board (+1)',
    readyToReceive: 'Ready to Collect Fare', scanPrompt: 'Tap passenger NFC card or scan QR code',
    btnTapNFC: 'Tap NFC Card', btnScanQR: 'Scan QR Code',
    lblShiftEarnings: 'Shift Total Earnings', lblTotalPassengers: 'Total Passengers',
    lblRecentBoardings: 'Recent Transactions', msgNoHistory: 'No transactions recorded yet',
    labelEmailOptional: 'Email (optional)', labelPlate: 'Plate No.', labelVehicleType: 'Vehicle',
    noTx: 'No transactions yet',
    qrTitle: 'Your payment QR', qrHint: 'Show this code to the driver. It refreshes automatically.',
    myCard: 'My card', linkCard: 'Link NFC card', unlinkCard: 'Unlink card',
    cardLinked: 'NFC card linked', cardNotLinked: 'No NFC card linked', tapCardNow: 'Hold your card against the back of the phone…',
    amountLabel: 'Amount (ETB)', btnPayTelebirr: 'Pay with Telebirr (demo)', topupDone: 'Wallet topped up',
    walletLabel: 'Wallet', btnWithdraw: 'Cash out', btnConfirm: 'Confirm', withdrawDone: 'Withdrawal requested',
    pendingApproval: 'Your driver account is waiting for approval.', btnRefresh: 'Check again',
    btnStopNfc: 'Stop NFC', nfcListening: 'NFC reader on – hold a card near the phone',
    nfcUnsupported: 'NFC needs Chrome on Android over HTTPS.',
    btnManual: 'Enter code manually (demo)', manualPrompt: 'Paste the QR code or card serial:',
    scanQrTitle: 'Scan passenger QR', paidOk: 'Paid', vehicleFull: 'Vehicle is full!', driverApp: 'Driver app',
    passengerApp: 'Passenger app',
    err_NETWORK: 'Cannot reach the server. Check your connection.',
    err_INVALID_LOGIN: 'Wrong phone/email or password',
    err_INSUFFICIENT_BALANCE: 'Not enough balance',
    err_UNKNOWN_CARD: 'Card not recognized', err_QR_EXPIRED: 'QR code expired – ask the passenger to refresh it.',
    err_ACCOUNT_BLOCKED: 'This account is blocked', err_ACCOUNT_PENDING: 'Your account is not approved yet',
    err_DUPLICATE_ACCOUNT: 'This phone or email is already registered', err_INVALID_PHONE: 'Enter a valid phone number (09… or 07…)',
    err_WRONG_APP: 'This account belongs to the other app', err_RATE_LIMIT: 'Too many attempts. Try again shortly.',
    err_INVALID_AMOUNT: 'Invalid amount', err_NFC_READ: 'Could not read the card. Try again.', err_SERVER: 'Server error'
  },
  sid: {
    subtitle: 'Telebirri-nni widoodantino digital-nni gaadaba galtannoho',
    tabLogin: "E'o (Login)", tabRegister: 'Boreessamatto (Register)',
    labelPhoneOrEmail: 'Sokko Kiiro woy Email', labelPassword: 'Password',
    labelFullName: "Wo'ma Su'ma", labelPhone: 'Sokko Kiiro', labelLicense: 'Makiinu Hayyama Kiiro',
    btnSignIn: 'Geli', btnSignUp: 'Xaaddi',
    welcome: 'Xayu dandaˈnenke', balanceLabel: 'Noo hasaawe', cardLabel: 'Kaardi',
    topupBtn: 'Telebirri-nni Woliqoli', qrBtn: 'QR laali', historyTitle: 'Gaadaba nna galtanno hasaawa',
    navHome: 'Mine', navTx: 'Galtanno', navProfile: 'Umi', logoutBtn: 'Fule',
    appTitle: 'Driver Terminal', authPortalHeading: 'Transit Driver Portal', authPortalSub: "Ein'ne e'e woy haaro driver boreessidhe",
    btnLogin: "Uurra Rinne E'e", btnRegister: 'Haaro Driver Borreessi', statusOnDuty: 'Uurra Aana',
    secSelectVehicle: '1. Makiinamu Gosa Doori', unitPass: 'Mannu', vehBajaj: 'Bajaaje', vehEBajaj: 'Elektrike', vehTaxi: 'Taakse',
    secRouteFare: '2. Dooggo noo Baatto Woyyimma', labelRoute: "Dooggo Su'ma", labelFare: 'Baatto (Fare ETB)',
    labelPsgLoad: 'Foori Manni Kiiro', btnOffboard: "Dirro'o (-1)", btnOnboard: "E'e'e (+1)",
    readyToReceive: 'Baatto Adhate Giwoonni', scanPrompt: 'Passenger NFC karda woy QR koodi saasidhe',
    btnTapNFC: 'Karda Kishi (NFC)', btnScanQR: 'QR Koodi Qassi',
    lblShiftEarnings: 'Techoo Afi\'noonni Baatto', lblTotalPassengers: "Wo'ma Foorraancho",
    lblRecentBoardings: 'Moorraancho Baatto', msgNoHistory: 'Xaano baatto borreessamukki di-no'
  },
  om: {
    subtitle: 'Kaffaltii deemsaa dijitaalaa, Telebirriin deeggarame',
    tabLogin: 'Seensa (Login)', tabRegister: 'Galmee (Register)',
    labelPhoneOrEmail: 'Lakkoofsa Bilbilaa ykn Email', labelPassword: 'Jecha Darbiiti (Password)',
    labelFullName: 'Maqaa Guutuu', labelPhone: 'Lakkoofsa Bilbilaa', labelLicense: 'Lakk. Hayyama Konkolaachisummaa',
    btnSignIn: 'Seeni', btnSignUp: "Galmaa'i",
    welcome: 'Baga nagaan dhuftan', balanceLabel: 'Hafteen jiru', cardLabel: 'Kaardii',
    topupBtn: 'Telebirriin Guutuu', qrBtn: 'QR Iliaali', historyTitle: 'Seenaa Deemsaa fi Kaffaltii',
    navHome: 'Mana', navTx: 'Kaffaltii', navProfile: 'Piroofaayilii', logoutBtn: "Ba'i",
    appTitle: "To'annoo Konkolaachisaa", authPortalHeading: 'Portal Konkolaachisaa Transit', authPortalSub: "Seenaa ykn akka haaraatti galmaa'aa",
    btnLogin: 'Hojii Jalqabi', btnRegister: 'Konkolaachisaa Haaraa Galmeessi', statusOnDuty: 'Hojii Irra',
    secSelectVehicle: '1. Gosa Konkolaataa Filadhu', unitPass: 'Nama', vehBajaj: 'Bajaaja', vehEBajaj: 'Elektrikii', vehTaxi: 'Taaksiidha',
    secRouteFare: '2. Qajeelcha Karaa fi Kaffaltii', labelRoute: 'Karaa Deemsaa', labelFare: 'Kaffaltii (Fare ETB)',
    labelPsgLoad: "Baay'ina Imaltootaa", btnOffboard: "Bu'aniiru (-1)", btnOnboard: 'Yaabbataniiru (+1)',
    readyToReceive: 'Kaffaltii Simachuuf Qophii', scanPrompt: 'Kaardii NFC ykn QR Koodee imalaa dhiheessaa',
    btnTapNFC: 'Kaardii Tuqsiisaa (NFC)', btnScanQR: 'QR Dubbisaa',
    lblShiftEarnings: "Galii Har'aa", lblTotalPassengers: "Ida'ama Imaltootaa",
    lblRecentBoardings: 'Kaffaltiiwwan dhihoo', msgNoHistory: 'Hanga ammaatti kaffaltiin galmeeffame hin jiru'
  },
  ti: {
    subtitle: 'ብቴለብር ዝተሓገዘ ዲጂታላዊ ናይ ጉዕዞ ክፍሊት',
    tabLogin: 'ምእታው (Login)', tabRegister: 'ምምዝጋብ (Register)',
    labelPhoneOrEmail: 'ቁጽሪ ስልኪ ወይ ኢመይል', labelPassword: 'ሕቡእ ቃል (Password)',
    labelFullName: 'ምሉእ ስም', labelPhone: 'ቁጽሪ ስልኪ', labelLicense: 'ቁጽሪ ፍቓድ ዘወርቲ',
    btnSignIn: 'እቶ', btnSignUp: 'ተመዝገብ',
    welcome: 'ንድሕንነትካ እንቋዕ መጻእካ', balanceLabel: 'ዘሎ ሚዛን', cardLabel: 'ካርድ',
    topupBtn: 'ብቴለብር ምምላእ', qrBtn: 'QR ኣርኢ', historyTitle: 'ታሪኽ ጉዕዞን ክፍሊትን',
    navHome: 'ገዛ', navTx: 'ልውውጣት', navProfile: 'መግለጺ', logoutBtn: 'ውጻእ',
    appTitle: 'መቆጣጠሪ ዘዋሪ', authPortalHeading: 'ፖርታል ዘዋሪ ትራንዚት', authPortalSub: 'እተዉ ወይ ብሓዲሽ ተመዝገቡ',
    btnLogin: 'ስራሕ ጀምር', btnRegister: 'ሓዲሽ ዘዋሪ መዝግብ', statusOnDuty: 'ኣብ ስራሕ',
    secSelectVehicle: '1. ዓይነት መኪና ምረጹ', unitPass: 'ሰብ', vehBajaj: 'ባጃጅ', vehEBajaj: 'ኤሌክትሪክ', vehTaxi: 'ታክሲ',
    secRouteFare: '2. መስመርን ታሪፍን ምትክኻል', labelRoute: 'መስመር ጉዕዞ', labelFare: 'ታሪፍ (Fare ETB)',
    labelPsgLoad: 'ጽዕነት ተሳፈርቲ', btnOffboard: 'ወሪዶም (-1)', btnOnboard: 'ተሳፊሮም (+1)',
    readyToReceive: 'ክፍሊት ንምቕባል ድሉው', scanPrompt: 'ካርድ NFC ወይ QR ኮድ ተሳፋሪ ኣሕልፉ',
    btnTapNFC: 'ካርድ ኣልክፉ (NFC)', btnScanQR: 'QR ኮድ ኣንብቡ',
    lblShiftEarnings: 'ናይ ሎሚ ኣታዊ', lblTotalPassengers: 'ዝተሳፈሩ ተሳፈርቲ',
    lblRecentBoardings: 'ናይ ቀረባ ክፍሊታት', msgNoHistory: 'ክሳብ ሕጂ ዝተመዝገበ ክፍሊት የለን'
  },
  so: {
    subtitle: 'Lacag-bixinta safarka dijitaalka ah, ee ay taageerto Telebirr',
    tabLogin: 'Soo Gal (Login)', tabRegister: 'Is-diwaan-gali',
    labelPhoneOrEmail: 'Lambarka Taleefanka ama Email', labelPassword: 'Ereyga Sirta ah (Password)',
    labelFullName: 'Magaca Buuxa', labelPhone: 'Lambarka Taleefanka', labelLicense: 'Lambarka Liisanka',
    btnSignIn: 'Gal', btnSignUp: 'Diiwaan geli',
    welcome: 'Soo dhawoow', balanceLabel: 'Hadhaaga hadda', cardLabel: 'Kaarka',
    topupBtn: 'Telebirr ku buuxi', qrBtn: 'QR Sawir', historyTitle: 'Taariikhda Safarka & Lacag-bixinta',
    navHome: 'Guriga', navTx: 'Dhaqdhaqaaqyada', navProfile: 'Astaanta', logoutBtn: 'Ka bax',
    appTitle: 'Terminal-ka Darawalka', authPortalHeading: 'Portal-ka Darawalka Transit', authPortalSub: 'Soo gal ama isdhaan ka diwaan gali darawal cusub',
    btnLogin: 'Bilaaw Shaqada', btnRegister: 'Diwaan-gali Darawal Cusub', statusOnDuty: 'Shaqada ku jira',
    secSelectVehicle: '1. Dooro Nooca Gaadhiga', unitPass: 'Qof', vehBajaj: 'Bajaaj', vehEBajaj: 'Elektrik Bajaaj', vehTaxi: 'Taksi',
    secRouteFare: '2. Habee Jidka iyo Qiimaha', labelRoute: 'Magaca Jidka', labelFare: 'Qiimaha (Fare ETB)',
    labelPsgLoad: 'Culeyska Rakaabka', btnOffboard: 'Waa degeen (-1)', btnOnboard: 'Waa soo puleen (+1)',
    readyToReceive: 'Loo diyaargarabay Lacag Qabasho', scanPrompt: 'Soo dhaweey kaarka NFC ama QR koodka rakaabka',
    btnTapNFC: 'Taabo Kaarka (NFC)', btnScanQR: 'Baadh QR Koodka',
    lblShiftEarnings: 'Dakhliga Maanta', lblTotalPassengers: 'Wartada Rakaabka',
    lblRecentBoardings: 'Lacagaha ugu dambeeyay', msgNoHistory: 'Weli wax lacag ah ma diwaan gashan'
  }
};

const I18N = (() => {
  const KEY = 'tp_lang';
  let lang = 'am';
  try { lang = localStorage.getItem(KEY) || localStorage.getItem('transit_lang') || 'am'; } catch { /* storage blocked */ }
  if (!DICT[lang]) lang = 'am';

  const lookup = (k) => (DICT[lang] && DICT[lang][k]) || DICT.en[k];
  const has = (k) => !!lookup(k);
  const t = (k, vars) => {
    let s = lookup(k) || k;
    if (vars) for (const v in vars) s = s.replace(`{${v}}`, vars[v]);
    return s;
  };

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = lang;
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  function set(l) {
    if (!DICT[l]) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    apply();
  }

  function init() {
    const sel = document.getElementById('langSelect');
    if (sel) sel.addEventListener('change', () => set(sel.value));
    apply();
  }

  return { t, has, set, init, get lang() { return lang; } };
})();
