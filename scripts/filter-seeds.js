const fs = require('fs');
const path = require('path');

const ninjaSeedPath = path.join(__dirname, '../src/lib/aams/ninja-identifiers-seed.json');
const keetaSeedPath = path.join(__dirname, '../src/lib/aams/keeta-identifiers-seed.json');

const oldNinja = JSON.parse(fs.readFileSync(ninjaSeedPath, 'utf8'));
const oldKeeta = JSON.parse(fs.readFileSync(keetaSeedPath, 'utf8'));

// Ninja raw data from user with موقوف = false
const rawNinjaActive = [
  { ninja_id: '273194', name: 'GAJI RANA', city: 'TAIF', national_id: '2637206885', email: '2637206885@samurai.delivery' },
  { ninja_id: '269795', name: 'NAHID HASSAN', city: 'TAIF', national_id: '2632878209', email: '2632878209@samurai.delivery' },
  { ninja_id: '269794', name: 'MOHAMED HALIL', city: 'TAIF', national_id: '2630756282', email: '2630756282@samurai.delivery' },
  { ninja_id: '262813', name: 'SOLAYMAN JOWADER', city: 'TAIF', national_id: '2629857612', email: '2629857612@samurai.delivery' },
  { ninja_id: '262812', name: 'MD FOYSAL', city: 'TAIF', national_id: '2628592590', email: '2628592590@samurai.delivery' },
  { ninja_id: '256105', name: 'MOSTAFA ABDELAAL', city: 'TAIF', national_id: '2632875049', email: '2632875049@samurai.delivery' },
  { ninja_id: '255999', name: 'BESHIR KHAMIS', city: 'TAIF', national_id: '2632875510', email: '2632875510@samurai.delivery' },
  { ninja_id: '255998', name: 'KARIM YASSER', city: 'TAIF', national_id: '2632874935', email: '2632874935@samurai.delivery' },
  { ninja_id: '255910', name: 'MD LABON SARDER', city: 'TAIF', national_id: '2624700635', email: '2624700635@samurai.delivery' },
  { ninja_id: '255906', name: 'MD OBIDUL HOSSAIN', city: 'TAIF', national_id: '2627188408', email: '2627188408@samurai.delivery' },
  { ninja_id: '255903', name: 'MD SOHAG MOLLA', city: 'TAIF', national_id: '2628593580', email: '2628593580@samurai.delivery' },
  { ninja_id: '255901', name: 'FARDIN AHANED', city: 'TAIF', national_id: '2631587488', email: '2631587488@samurai.delivery' },
  { ninja_id: '255880', name: 'MO MEHEDI HASAN EMON', city: 'TAIF', national_id: '2582493024', email: '2582493024@samurai.delivery' },
  { ninja_id: '255865', name: 'MOHAMED OSAMA', city: 'TAIF', national_id: '2632875585', email: '2632875585@samurai.delivery' },
  { ninja_id: '255861', name: 'HAMMAD HANIF', city: 'TAIF', national_id: '2633404468', email: '2633404468@samurai.delivery' },
  { ninja_id: '255860', name: 'MAHMOUD ISMAIL', city: 'TAIF', national_id: '2627624295', email: '2627624295@samurai.delivery' },
  { ninja_id: '244825', name: 'HAIDER ALI IMRAN HUSSAIN', city: 'TAIF', national_id: '261509335', email: '2615093357@samurai.delivery' },
  { ninja_id: '214112', name: 'BILLAL', city: 'TAIF', national_id: '2570490157', email: '2570490157@samurai.delivery' },
  { ninja_id: '214108', name: 'riad', city: 'TAIF', national_id: '2614943385', email: '2614943385@samurai.delivery' },
  { ninja_id: '214102', name: 'MD MIA', city: 'TAIF', national_id: '2611365871', email: '2611365871@samurai.delivery' },
  { ninja_id: '214101', name: 'mohamed', city: 'TAIF', national_id: '2614943351', email: '2614943351@samurai.delivery' },
  { ninja_id: '205822', name: 'Mohamed wael', city: 'TAIF', national_id: '2594207413', email: '2594207413@samurai.delivery' },
  { ninja_id: '132450', name: 'MDSHOHELRAHMAN', city: 'TAIF', national_id: '2595483005', email: '2595483005@samurai.delivery' },
  { ninja_id: '128790', name: 'ALDOSARITURKI', city: 'TAIF', national_id: '1128737713', email: '1128737713@samurai.delivery' },
  { ninja_id: '125819', name: 'MDMAHFUJUR', city: 'TAIF', national_id: '2607580426', email: '2607580426@samurai.delivery' },
  { ninja_id: '117947', name: 'AKRAMULHAQUE', city: 'TAIF', national_id: '2600255448', email: '2600255448@samurai.delivery' },
  { ninja_id: '117854', name: 'MOHMMADSAHAB', city: 'TAIF', national_id: '2600361972', email: '2600361972@samurai.delivery' },
  { ninja_id: '116093', name: 'WASIMMOHMMED', city: 'TAIF', national_id: '2594434231', email: '2594434231@samurai.delivery' },
  { ninja_id: '116092', name: 'MD RAKIB', city: 'TAIF', national_id: '2570685491', email: '2570685491@samurai.delivery' },
  { ninja_id: '114418', name: 'OSSAMAROUBL', city: 'TAIF', national_id: '2558199416', email: '2558199416@samurai.delivery' },
  { ninja_id: '114378', name: 'MAHMUDULHASAN', city: 'TAIF', national_id: '2600467787', email: '2600467787@samurai.delivery' },
  { ninja_id: '112231', name: 'TAMAL', city: 'TAIF', national_id: '2624812067', email: '2624812067@samurai.delivery' },
  { ninja_id: '111291', name: 'ABDULSALAM', city: 'TAIF', national_id: '28589424932', email: '28589424932@samurai.delivery' },
  { ninja_id: '102466', name: 'MOSTAFAYASSER', city: 'TAIF', national_id: '2575011578', email: '2575011578@samurai.delivery' },
  { ninja_id: '102465', name: 'SAIDNAEEM', city: 'TAIF', national_id: '2557526874', email: '2557526874@samurai.delivery' },
  { ninja_id: '102458', name: 'DELOWARHOSSAIN', city: 'TAIF', national_id: '2569600022', email: '2569600022@samurai.delivery' },
  { ninja_id: '101871', name: 'MOHAMEDIBRAHIM', city: 'TAIF', national_id: '2577274109', email: '2577274109@samurai.delivery' },
  { ninja_id: '101869', name: 'AKASH', city: 'TAIF', national_id: '2542723331', email: '2542723331@samurai.delivery' },
  { ninja_id: '101868', name: 'NADERELSAYED', city: 'TAIF', national_id: '2545125235', email: '2545125235@samurai.delivery' },
  { ninja_id: '101865', name: 'MDMONIRUJ', city: 'TAIF', national_id: '2569393479', email: '2569393479@samurai.delivery' },
  { ninja_id: '101864', name: 'MDRUBEL', city: 'TAIF', national_id: '2570490058', email: '2570490058@samurai.delivery' },
  { ninja_id: '101863', name: 'MDJAHANGIR', city: 'TAIF', national_id: '2571263496', email: '2571263496@samurai.delivery' },
  { ninja_id: '101623', name: 'HANIF', city: 'TAIF', national_id: '2571022215', email: '2571222215@samurai.delivery' },
  { ninja_id: '101617', name: 'AHMEDMOHAMED', city: 'TAIF', national_id: '2567253725', email: '2567253725@samurai.delivery' },
  { ninja_id: '93925', name: 'ABDALLARAMADANMOUSTAFA', city: 'TAIF', national_id: '566396486', email: '566396486@samurai.delivery' },
  { ninja_id: '82812', name: 'RASHID', city: 'TAIF', national_id: '2636302768', email: '2636302768@samurai.delivery' },
  { ninja_id: '82044', name: 'MAHMOUDASHOUR', city: 'TAIF', national_id: '2577448844', email: '2577448844@samurai.delivery' },
  { ninja_id: '82024', name: 'IBRAHEMABDELSATTAR', city: 'TAIF', national_id: '2570504627', email: '2570504627@samurai.delivery' },
  { ninja_id: '81832', name: 'SAYEDAHMED', city: 'TAIF', national_id: '2584664482', email: '2584664482@samurai.delivery' }
];

const newNinja = rawNinjaActive.map(item => {
  // Find match in oldNinja by ninja_id or national_id
  const match = oldNinja.find(o => String(o.ninja_id) === String(item.ninja_id) || (o.national_id && String(o.national_id) === String(item.national_id))) || {};
  return {
    ninja_id: item.ninja_id,
    avatar: match.avatar || '',
    name_en: item.name,
    name_ar: match.name_ar || '',
    national_id: item.national_id,
    mobile: match.mobile || '',
    status: match.status || 'ACTIVE',
    city: item.city || 'TAIF',
    platform: 'Ninja Restaurant',
    app_name: 'NINJA',
    email: item.email,
    is_blocked: false
  };
});

// Keeta active drivers from user prompt (excluding مقيّد)
const rawKeetaActive = [
  { name: 'ALY IBRAHIM', phone: '553273792', vehicle: '2383STA' },
  { name: 'Ahmed Nawar', phone: '539491214', vehicle: '2383STA' },
  { name: 'BESHIR ALY', phone: '573956470', vehicle: '2344STA' },
  { name: 'DELOWAR SHIPON', phone: '543991330', vehicle: '2388STA' },
  { name: 'ESLAM ATEF', phone: '534553600', vehicle: '2344STA' },
  { name: 'HANIF MIA', phone: '572424874', vehicle: '2388STA' },
  { name: 'Hassan Khalelyal', phone: '501687658', vehicle: '2097NTA' },
  { name: 'MD ISMAIL MIR', phone: '546282785', vehicle: '2383STA' },
  { name: 'MD SHOHEL RAHMAN', phone: '573437102', vehicle: '2388STA' },
  { name: 'MOHAMED SABRI', phone: '536625044', vehicle: '2458STA' },
  { name: 'MOHAMED HALIL', phone: '532664575', vehicle: '2097NTA' },
  { name: 'MOSTAFA IBRAHIM', phone: '539642991', vehicle: '2353STA' },
  { name: 'Mahmoud Mohmed', phone: '556700628', vehicle: '2383sta' },
  { name: 'Md Billah', phone: '545707125', vehicle: '2387STA' },
  { name: 'Mohamed Ebrahem', phone: '556854106', vehicle: '2381STA' },
  { name: 'Osama Hasan', phone: '534160371', vehicle: '2389STA' },
  { name: 'RIAD HASAN', phone: '564153119', vehicle: '2381STA' },
  { name: 'Sayed Shelba', phone: '507443057', vehicle: '2458STA' },
  { name: 'mohamed haridy', phone: '532681186', vehicle: '2381sta' }
];

const newKeeta = rawKeetaActive.map(item => {
  const normName = item.name.toLowerCase().replace(/\s+/g, ' ').trim();
  const match = oldKeeta.find(o => {
    const oName = (o.name_en || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const oPhone = String(o.mobile || '').replace(/\D/g, '');
    const itemPhone = item.phone.replace(/\D/g, '');
    return oName === normName || (itemPhone && oPhone.endsWith(itemPhone));
  }) || {};

  return {
    keeta_id: match.keeta_id || `keeta_${item.phone}`,
    name_en: item.name.toUpperCase(),
    name_ar: match.name_ar || '',
    national_id: match.national_id || '',
    mobile: item.phone,
    app_name: 'KEETA',
    email: match.email || '',
    vehicle: item.vehicle,
    status: match.status || 'في الخدمة',
    is_blocked: false,
    avatar: match.avatar || ''
  };
});

fs.writeFileSync(ninjaSeedPath, JSON.stringify(newNinja, null, 2), 'utf8');
fs.writeFileSync(keetaSeedPath, JSON.stringify(newKeeta, null, 2), 'utf8');

console.log(`Updated! Ninja count: ${newNinja.length}, Keeta count: ${newKeeta.length}`);
