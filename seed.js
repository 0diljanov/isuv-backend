// ═══════════════════════════════════════════════════════════════
//  iSuv Seed — загрузка 117 водоматов в базу данных
//  Запустить один раз: node seed.js
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './isuv.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    city       TEXT NOT NULL,
    address    TEXT NOT NULL DEFAULT '',
    lat        REAL NOT NULL DEFAULT 41.0,
    lng        REAL NOT NULL DEFAULT 71.67,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

const DEVICES = [
  {"id":"WM-00025","name":"Садани таги","city":"Namangan shahar","address":"Садани таги MFY","lat":41.0101,"lng":71.6586},
  {"id":"WM-00026","name":"Парцез","city":"Namangan shahar","address":"Парцез MFY","lat":40.9641,"lng":71.7126},
  {"id":"WM-00023","name":"Нур","city":"Namangan shahar","address":"Namangan shahar, Uychi ko'chasi, 13-uy.","lat":41.0381,"lng":71.6266},
  {"id":"WM-00030","name":"Чорсу","city":"Namangan shahar","address":"Langar ko'chasi 1 uy","lat":40.9721,"lng":71.7006},
  {"id":"WM-00020","name":"Истиклол 8","city":"Namangan shahar","address":"Namangan shahar, Istiqlol ko'chasi, 8-uy.","lat":41.0461,"lng":71.6746},
  {"id":"WM-00019","name":"Истиклол 3","city":"Namangan shahar","address":"Namangan shahar, Istiqlol ko'chasi, 3-uy.","lat":41.0401,"lng":71.6286},
  {"id":"WM-00021","name":"Кола 1","city":"Namangan shahar","address":"Namangan shahar, Ibrat ko'chasi, 11-uy.","lat":40.9541,"lng":71.6826},
  {"id":"WM-00022","name":"Кола 2","city":"Namangan shahar","address":"Namangan shahar, Ibrat ko'chasi, 8-uy.","lat":40.9681,"lng":71.6966},
  {"id":"WM-00018","name":"Томск","city":"Namangan shahar","address":"Namangan shahar, Boboraxim Mashrab ko'chasi, 10-uy.","lat":40.9621,"lng":71.7106},
  {"id":"WM-00017","name":"1-мактаб","city":"Namangan shahar","address":"Namangan shahar, Yangiariq ko'chasi, 15-uy.","lat":41.0361,"lng":71.6246},
  {"id":"WM-00029","name":"Авиакасса","city":"Namangan shahar","address":"Boboraxim Mashrab 32-uy","lat":41.0301,"lng":71.6586},
  {"id":"WM-00016","name":"Обл. больница","city":"Namangan shahar","address":"Namangan shahar, Yangiariq 2-tor ko'chasi, 12-uy.","lat":41.0441,"lng":71.6326},
  {"id":"WM-00011","name":"Электросеть","city":"Namangan shahar","address":"Namangan shahar, Marg'ilon ko'chasi, 8A-uy.","lat":40.9781,"lng":71.6866},
  {"id":"WM-00012","name":"Лола 1","city":"Namangan shahar","address":"Namangan shahar, Boburshox ko'chasi, 137-uy.","lat":40.9521,"lng":71.7006},
  {"id":"WM-00013","name":"Лола 2","city":"Namangan shahar","address":"Namangan shahar, Boburshox ko'chasi, 135-uy.","lat":40.9661,"lng":71.6746},
  {"id":"WM-00014","name":"Лола 3","city":"Namangan shahar","address":"Boburshox ko'chasi, 188-uy","lat":40.9601,"lng":71.6886},
  {"id":"WM-00015","name":"Лола 4","city":"Namangan shahar","address":"Bobulshox ko'chasi 81-uy","lat":41.0341,"lng":71.6226},
  {"id":"WM-00008","name":"Хамза 1","city":"Namangan shahar","address":"Namangan shahar, Xamza ko'chasi, 3-uy.","lat":40.9881,"lng":71.7166},
  {"id":"WM-00009","name":"Хамза 2","city":"Namangan shahar","address":"Namangan shahar, Xamza ko'chasi, 8B-uy.","lat":41.0221,"lng":71.6506},
  {"id":"WM-00010","name":"Дамбоғ","city":"Namangan shahar","address":"G'alcha ko'chasi, 57A-uy","lat":41.0361,"lng":71.6646},
  {"id":"WM-00005","name":"100 кв. (Навоий 12)","city":"Namangan shahar","address":"Namangan shahar, Xiva ko'chasi, 12-uy.","lat":40.9901,"lng":71.6986},
  {"id":"WM-00004","name":"Навоий 11","city":"Namangan shahar","address":"Namangan shahar, Alisher Navoiy ko'chasi, 11-uy","lat":41.0441,"lng":71.7126},
  {"id":"WM-00007","name":"Навоий 22","city":"Namangan shahar","address":"Andijon ko'chasi, 22-uy","lat":41.0181,"lng":71.6866},
  {"id":"WM-00006","name":"Навоий 33 Хамкорбанк","city":"Namangan shahar","address":"Наманган шахар, Алишер Навоий кучаси, 33 уй","lat":40.9521,"lng":71.7006},
  {"id":"WM-00027","name":"Сағбон","city":"Namangan shahar","address":"Janubiy aylanma yo'li, Sag'bon oshxonasi oldi","lat":41.0061,"lng":71.6546},
  {"id":"WM-00001","name":"Вокзал 1","city":"Namangan shahar","address":"Namangan shahar, Sheroziy 3-proyezd, 6-uy","lat":41.0401,"lng":71.6886},
  {"id":"WM-00002","name":"Вокзал 2","city":"Namangan shahar","address":"Namangan shahar, Sheroziy 3-proyezd, 1-uy","lat":40.9941,"lng":71.6826},
  {"id":"WM-00003","name":"Вокзал 3","city":"Namangan shahar","address":"Namangan shahar, Amir Temur, 5-uy","lat":41.0481,"lng":71.6366},
  {"id":"WM-00108","name":"ГАИ","city":"Yangi Namangan","address":"ГАИ MFY","lat":40.931,"lng":71.658},
  {"id":"WM-00113","name":"Военкомат","city":"Yangi Namangan","address":"Furqat MFY, Do'stlik 4-tor ko'chasi, 7-uy.","lat":40.945,"lng":71.652},
  {"id":"WM-00109","name":"Лицей","city":"Yangi Namangan","address":"Islom Karimov ko'chasi, 42-uy.","lat":40.899,"lng":71.666},
  {"id":"WM-00107","name":"СҚБ","city":"Yangi Namangan","address":"Islom Karimov ko'chasi, 17A-uy.","lat":40.953,"lng":71.58},
  {"id":"WM-00106","name":"Глобус","city":"Yangi Namangan","address":"Islom Karimov ko'chasi, 11-uy.","lat":40.907,"lng":71.614},
  {"id":"WM-00105","name":"Арка","city":"Yangi Namangan","address":"Guliston MFY, Mashrab ko'chasi, 23-uy.","lat":40.941,"lng":71.628},
  {"id":"WM-00104","name":"Маннол","city":"Yangi Namangan","address":"Turg'unpo'lat ko'chasi, 1-proyezd, 21-uy.","lat":40.955,"lng":71.662},
  {"id":"WM-00102","name":"Мингчинор 1 масжид олди","city":"Yangi Namangan","address":"Mingchinor MFY, Oromgoh ko'chasi, 10-uy.","lat":40.889,"lng":71.656},
  {"id":"WM-00103","name":"Мингчинор 2","city":"Yangi Namangan","address":"Mingchinor MFY, Oromgoh ko'chasi, 4/5-uy.","lat":40.883,"lng":71.63},
  {"id":"WM-00114","name":"Истанбул","city":"Yangi Namangan","address":"Mingchinor MFY, Islom Karimov ko'chasi, 1A-uy.","lat":40.957,"lng":71.664},
  {"id":"WM-00110","name":"Нотариус","city":"Yangi Namangan","address":"Mirob ko'chasi, 1A-uy.","lat":40.931,"lng":71.638},
  {"id":"WM-00111","name":"Чинор","city":"Yangi Namangan","address":"Do'stlik 5-tor ko'chasining 1-berk ko'chasi, Chinor.","lat":40.885,"lng":71.632},
  {"id":"WM-00086","name":"Афсона 1","city":"Davlatobod","address":"Afsonalar Vodiysi bog'i, 3-uy.","lat":40.989,"lng":71.816},
  {"id":"WM-00087","name":"Афсона 2","city":"Davlatobod","address":"Afsonalar Vodiysi bog'i, 4-uy.","lat":40.963,"lng":71.87},
  {"id":"WM-00088","name":"Афсона 3","city":"Davlatobod","address":"Afsonalar Vodiysi bog'i, 9-uy.","lat":40.957,"lng":71.844},
  {"id":"WM-00112","name":"Кийим Магазин/Богатырь","city":"Yangi Namangan","address":"G'irvon ko'chasi, 37-uy","lat":40.881,"lng":71.648},
  {"id":"WM-00084","name":"Ирвадон","city":"Davlatobod","address":"Gulobod MFY, Ulug'bek ko'chasi, 1-uy.","lat":40.945,"lng":71.852},
  {"id":"WM-00085","name":"Ирвадон 2","city":"Davlatobod","address":"Ирвадон 2 MFY","lat":40.979,"lng":71.866},
  {"id":"WM-00028","name":"САГ гилам","city":"Namangan shahar","address":"Girvonsoy ko'chasi, 11-uy","lat":41.0141,"lng":71.7026},
  {"id":"WM-00031","name":"Яккадом","city":"Yangi Namangan","address":"Яккадом MFY","lat":40.957,"lng":71.664},
  {"id":"WM-00057","name":"5A микр-н 42","city":"Davlatobod","address":"5A-mikrorayon, 42-uy.","lat":40.981,"lng":71.888},
  {"id":"WM-00058","name":"5A микр-н 34","city":"Davlatobod","address":"5A-mikrorayon, 34-uy.","lat":40.935,"lng":71.862},
  {"id":"WM-00060","name":"5A микр-н 25","city":"Davlatobod","address":"5A-mikrorayon, 25-uy.","lat":41.009,"lng":71.856},
  {"id":"WM-00059","name":"5A микр-н 15","city":"Davlatobod","address":"5A-mikrorayon, 15-uy.","lat":40.983,"lng":71.87},
  {"id":"WM-00061","name":"5A микр-н 50","city":"Davlatobod","address":"5A-mikrorayon, 50-uy.","lat":41.017,"lng":71.824},
  {"id":"WM-00062","name":"5A микр-н 52","city":"Davlatobod","address":"5A-mikrorayon, 52-uy.","lat":41.011,"lng":71.898},
  {"id":"WM-00063","name":"5A микр-н 59","city":"Davlatobod","address":"5A-mikrorayon, 59-uy.","lat":41.005,"lng":71.812},
  {"id":"WM-00052","name":"5 микр-н 4","city":"Davlatobod","address":"5-mikrorayon, 4-uy.","lat":41.019,"lng":71.806},
  {"id":"WM-00053","name":"5 микр-н 11","city":"Davlatobod","address":"5-mikrorayon, 11-uy.","lat":40.993,"lng":71.8},
  {"id":"WM-00054","name":"5 микр-н 16","city":"Davlatobod","address":"5-mikrorayon, 16-uy.","lat":40.967,"lng":71.854},
  {"id":"WM-00055","name":"5 микр-н 20","city":"Davlatobod","address":"5-mikrorayon, 20-uy.","lat":41.021,"lng":71.888},
  {"id":"WM-00056","name":"5 микр-н 24","city":"Davlatobod","address":"5-mikrorayon, 24-uy.","lat":41.015,"lng":71.802},
  {"id":"WM-00045","name":"4 микр-н 42","city":"Davlatobod","address":"4-mikrorayon, 42-uy.","lat":40.969,"lng":71.876},
  {"id":"WM-00044","name":"4 микр-н 45","city":"Davlatobod","address":"4-mikrorayon, 45-uy.","lat":40.963,"lng":71.83},
  {"id":"WM-00046","name":"4 микр-н 36","city":"Davlatobod","address":"4-mikrorayon, 36-uy.","lat":40.957,"lng":71.804},
  {"id":"WM-00047","name":"4 микр-н 28","city":"Davlatobod","address":"4-mikrorayon, 28-uy.","lat":40.971,"lng":71.838},
  {"id":"WM-00048","name":"4 микр-н 24","city":"Davlatobod","address":"4-mikrorayon, 24-uy.","lat":41.025,"lng":71.892},
  {"id":"WM-00049","name":"4 микр-н 25","city":"Davlatobod","address":"4-mikrorayon, 25-uy.","lat":40.959,"lng":71.846},
  {"id":"WM-00051","name":"4 микр-н 10","city":"Davlatobod","address":"4 микр-н 10 MFY","lat":40.933,"lng":71.8},
  {"id":"WM-00050","name":"4 микр-н 6","city":"Davlatobod","address":"4-mikrorayon, 6-uy.","lat":40.967,"lng":71.854},
  {"id":"WM-00089","name":"Гузал 1","city":"Yangi Namangan","address":"Go'zal MFY, 1-uy.","lat":40.951,"lng":71.578},
  {"id":"WM-00090","name":"Гузал 10/12","city":"Yangi Namangan","address":"Go'zal MFY, 12-uy.","lat":40.965,"lng":71.592},
  {"id":"WM-00091","name":"Гузал 15","city":"Yangi Namangan","address":"Go'zal MFY, 15-uy.","lat":40.919,"lng":71.666},
  {"id":"WM-00092","name":"Гузал МФЙ","city":"Yangi Namangan","address":"Гузал МФЙ MFY","lat":40.893,"lng":71.62},
  {"id":"WM-00115","name":"Чортоқ йўли","city":"Yangi Namangan","address":"Mingchinor MFY, Islom Karimov ko'chasi, 1A-uy.","lat":40.947,"lng":71.574},
  {"id":"WM-00093","name":"Оромгох 5","city":"Yangi Namangan","address":"Oromgoh massivi, 5-uy.","lat":40.941,"lng":71.608},
  {"id":"WM-00094","name":"Оромгох 9","city":"Yangi Namangan","address":"Oromgoh massivi, 9-uy.","lat":40.915,"lng":71.622},
  {"id":"WM-00097","name":"Оромгох 31","city":"Yangi Namangan","address":"Oromgoh massivi, 31-uy.","lat":40.889,"lng":71.656},
  {"id":"WM-00095","name":"Оромгох 12","city":"Yangi Namangan","address":"Oromgoh massivi, 12-uy.","lat":40.943,"lng":71.57},
  {"id":"WM-00096","name":"Оромгох 16","city":"Yangi Namangan","address":"Oromgoh massivi, 16-uy.","lat":40.977,"lng":71.644},
  {"id":"WM-00098","name":"Пахлавон 5","city":"Yangi Namangan","address":"Paxlavon ko'chasi, 5-uy.","lat":40.971,"lng":71.618},
  {"id":"WM-00099","name":"Пахлавон 9","city":"Yangi Namangan","address":"Paxlavon ko'chasi, 9-uy.","lat":40.885,"lng":71.572},
  {"id":"WM-00100","name":"Пахлавон 15","city":"Yangi Namangan","address":"Paxlavon ko'chasi, 15-uy.","lat":40.939,"lng":71.646},
  {"id":"WM-00101","name":"Пахлавон 17","city":"Yangi Namangan","address":"Paxlavon ko'chasi, 17-uy.","lat":40.933,"lng":71.6},
  {"id":"WM-00081","name":"Элобод 1","city":"Davlatobod","address":"Elobod siti turar joy majmuasi, 1-uy.","lat":40.997,"lng":71.844},
  {"id":"WM-00082","name":"Элобод 16","city":"Davlatobod","address":"Elobod siti turar joy majmuasi, 16-uy.","lat":40.931,"lng":71.818},
  {"id":"WM-00083","name":"Элобод 17","city":"Davlatobod","address":"Elobod siti turar joy majmuasi, 17-uy.","lat":41.025,"lng":71.832},
  {"id":"WM-00066","name":"Юксалиш 1","city":"Davlatobod","address":"Yuksalish MFY, 1-uy.","lat":40.959,"lng":71.886},
  {"id":"WM-00071","name":"Юксалиш 8","city":"Davlatobod","address":"Yuksalish MFY, 8-uy.","lat":41.013,"lng":71.8},
  {"id":"WM-00073","name":"Юксалиш 16","city":"Davlatobod","address":"Yuksalish MFY, 16-uy.","lat":40.987,"lng":71.814},
  {"id":"WM-00077","name":"Юксалиш 40","city":"Davlatobod","address":"Yuksalish MFY, 40-uy.","lat":40.961,"lng":71.888},
  {"id":"WM-00076","name":"Юксалиш 35","city":"Davlatobod","address":"Yuksalish MFY, 35-uy.","lat":40.995,"lng":71.842},
  {"id":"WM-00075","name":"Юксалиш 27","city":"Davlatobod","address":"Yuksalish MFY, 27-uy.","lat":41.029,"lng":71.836},
  {"id":"WM-00074","name":"Юксалиш 21","city":"Davlatobod","address":"Yuksalish MFY, 21-uy.","lat":40.983,"lng":71.81},
  {"id":"WM-00078","name":"Юксалиш 47","city":"Davlatobod","address":"Yuksalish MFY, 47-uy.","lat":40.957,"lng":71.844},
  {"id":"WM-00079","name":"Юксалиш 49","city":"Davlatobod","address":"Yuksalish MFY, 49-uy.","lat":40.951,"lng":71.858},
  {"id":"WM-00080","name":"Юксалиш 51","city":"Davlatobod","address":"Yuksalish MFY, 51-uy.","lat":40.985,"lng":71.832},
  {"id":"WM-00070","name":"Юксалиш 7A","city":"Davlatobod","address":"Yuksalish MFY, 7A-uy.","lat":40.959,"lng":71.866},
  {"id":"WM-00072","name":"Юксалиш 11","city":"Davlatobod","address":"Yuksalish MFY, 11-uy.","lat":40.993,"lng":71.84},
  {"id":"WM-00069","name":"Юксалиш 6","city":"Davlatobod","address":"Yuksalish MFY, 6-uy.","lat":40.947,"lng":71.814},
  {"id":"WM-00068","name":"Юксалиш 3","city":"Davlatobod","address":"Yuksalish MFY, 3-uy.","lat":40.961,"lng":71.868},
  {"id":"WM-00067","name":"Юксалиш 2","city":"Davlatobod","address":"Yuksalish MFY, 2-uy.","lat":40.935,"lng":71.882},
  {"id":"WM-00116","name":"Туракургон 1","city":"Toraqo'rg'on","address":"Kosonsoy ko'chasi, 42A-uy","lat":41.049,"lng":71.786},
  {"id":"WM-00117","name":"Туракургон 2","city":"Toraqo'rg'on","address":"Kosonsoy ko'chasi, 58A-uy","lat":40.983,"lng":71.78},
  {"id":"WM-00064","name":"Орзу 1","city":"Davlatobod","address":"Orzu MFY, Obod ko'chasi, 1-uy.","lat":40.937,"lng":71.824},
  {"id":"WM-00065","name":"Орзу 2","city":"Davlatobod","address":"Orzu MFY, Obod ko'chasi, 93A-uy.","lat":40.971,"lng":71.838},
  {"id":"WM-00038","name":"2 микр-н 165","city":"Davlatobod","address":"2-mikrorayon, 165-uy.","lat":40.965,"lng":71.812},
  {"id":"WM-00039","name":"2 микр-н 169","city":"Davlatobod","address":"2-mikrorayon, 169-uy.","lat":40.979,"lng":71.826},
  {"id":"WM-00041","name":"2 микр-н 8A","city":"Davlatobod","address":"2-mikrorayon, 8A-uy.","lat":40.973,"lng":71.82},
  {"id":"WM-00040","name":"2 микр-н 8","city":"Davlatobod","address":"2-mikrorayon, 8-uy.","lat":40.987,"lng":71.874},
  {"id":"WM-00043","name":"2 микр-н 36","city":"Davlatobod","address":"2-mikrorayon, 36-uy.","lat":41.001,"lng":71.888},
  {"id":"WM-00042","name":"2 микр-н 23","city":"Davlatobod","address":"2-mikrorayon, 23-uy.","lat":40.995,"lng":71.822},
  {"id":"WM-00037","name":"1 микр-н 55","city":"Davlatobod","address":"1-mikrorayon, 55-uy.","lat":40.989,"lng":71.876},
  {"id":"WM-00035","name":"1 микр-н 49","city":"Davlatobod","address":"1-mikrorayon, 49-uy.","lat":40.983,"lng":71.85},
  {"id":"WM-00034","name":"1 микр-н 3","city":"Davlatobod","address":"1-mikrorayon, 3-uy.","lat":41.017,"lng":71.824},
  {"id":"WM-00033","name":"1 микр-н 17","city":"Davlatobod","address":"1-mikrorayon, 17-uy.","lat":41.011,"lng":71.898},
  {"id":"WM-00036","name":"1 микр-н 71","city":"Davlatobod","address":"1-mikrorayon, 71-uy.","lat":41.005,"lng":71.872},
  {"id":"WM-00032","name":"Институт","city":"Davlatobod","address":"Институт MFY","lat":40.979,"lng":71.866},
  {"id":"WM-00024","name":"ТБЗ","city":"Namangan shahar","address":"Товукбозор","lat":40.9941,"lng":71.6426}
];

console.log(`Загружаем ${DEVICES.length} водоматов...`);

const stmt = db.prepare(
  "INSERT OR IGNORE INTO devices (id, name, city, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)"
);

const insertAll = db.transaction(() => {
  for (const d of DEVICES) {
    stmt.run(d.id, d.name, d.city, d.address, d.lat, d.lng);
  }
});

insertAll();

const count = db.prepare('SELECT COUNT(*) AS n FROM devices').get().n;
console.log(`✓ Готово! В базе ${count} водоматов.`);
db.close();
