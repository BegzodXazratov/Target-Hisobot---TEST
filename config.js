/* =========================================================
   MIJOZ SOZLAMASI — har bir yangi mijoz uchun faqat shu faylni o'zgartiring.
   Sayt shu ma'lumotdan hisobotni quradi (demo rejimda raqamlar avtomatik
   yaratiladi; haqiqiy mijozda Meta + CRM ulanadi).
   ========================================================= */
window.CLIENT = {
  brand: 'iStore Tashkent',            // do'kon / kompaniya nomi
  tagline: 'Apple texnikasi do\'koni',
  accent: '#0a7cff',                    // asosiy rang
  logoText: '',                        // logotip harfi (bo'sh bo'lsa: nomning 1-harfi)
  targetCpl: 1.6,                       // maqsad lid narxi ($)
  monthBudget: 5600,                    // oylik reklama byudjeti ($)
  currency: '$',

  // Birinchi kirish (keyin Sozlamalar bo'limidan o'zgartiriladi)
  defaultLogin: 'demo',
  defaultPassword: 'demo2026',

  // Kampaniyalar: byudjet ulushi, o'rtacha lid narxi, sifatli lid ulushi,
  // lid→sotuv konversiyasi, o'rtacha chek
  campaigns: [
    { id: 'c1', name: 'iPhone 17 Pro — lid forma',      product: 'iPhone',  share: .30, cpl: 1.45, q: .58, conv: .105, check: 1390 },
    { id: 'c2', name: 'iPhone 16 / 15 — bo\'lib to\'lash', product: 'iPhone',  share: .21, cpl: 1.15, q: .52, conv: .098, check: 820 },
    { id: 'c3', name: 'MacBook Air M4 — talabalar',      product: 'MacBook', share: .14, cpl: 1.85, q: .61, conv: .092, check: 1290 },
    { id: 'c4', name: 'AirPods + Apple Watch',           product: 'Aksessuar', share: .12, cpl: 1.05, q: .50, conv: .118, check: 290 },
    { id: 'c5', name: 'iPad — ish va o\'qish uchun',     product: 'iPad',    share: .10, cpl: 1.65, q: .55, conv: .090, check: 690 },
    { id: 'c6', name: 'Retarget — saytga kirganlar',     product: 'Aralash', share: .13, cpl: 1.25, q: .62, conv: .125, check: 940 }
  ],
  ads: {
    c1: ['Video: 17 Pro qutidan chiqarish', 'Karusel: 3 rang, 3 narx', 'Reels: kamera sinovi kechasi'],
    c2: ['Video: 0% bo\'lib to\'lash 12 oy', 'Rasm: eski telefonni almashtiring'],
    c3: ['Reels: talaba uchun MacBook', 'Video: M4 tezlik sinovi'],
    c4: ['Karusel: sovg\'a to\'plami', 'Reels: AirPods Pro shovqin'],
    c5: ['Video: iPad + Pencil dizayn', 'Rasm: iPad 11 narxi'],
    c6: ['Dinamik: ko\'rgan modelingiz', 'Video: kafolat va servis']
  },
  sellers: [
    { name: 'Aziz',    share: .30, resp: 4,  conv: 1.12 },
    { name: 'Dilnoza', share: .27, resp: 6,  conv: 1.05 },
    { name: 'Sardor',  share: .24, resp: 11, conv: 0.90 },
    { name: 'Malika',  share: .19, resp: 18, conv: 0.86 }
  ],

  // Taqdimot bo'limi (sotuv uchun)
  pitch: {
    agency: 'TASMA',
    price: 'oyiga 500$ dan',
    contactLabel: 'Instagram: @tasma.vs',
    contactUrl: 'https://instagram.com/tasma.vs'
  }
};
