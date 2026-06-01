
// ===============================
// GENERATORE DATI FIG → JSON
// ===============================

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// URL ufficiale FIG
const URL = "https://areariservata.federgolf.it/SlopeAndCourseRating/Index";

// Ordine tee FIG (molto importante)
const TEE_NAMES = ["nero","bianco","giallo","verde","blu","rosso","arancio"];

// Classificazione geografica
const NORD = [
  "Lombardia","Piemonte","Veneto","Trentino-Alto Adige",
  "Liguria","Friuli-Venezia Giulia","Emilia-Romagna"
];

const CENTRO = [
  "Toscana","Umbria","Lazio","Marche","Abruzzo"
];

// Funzione per capire area
function getArea(regione) {
  if (NORD.includes(regione)) return "nord";
  if (CENTRO.includes(regione)) return "centro";
  return "sud";
}

// Regione fallback (migliorabile)
function detectRegion(nome) {
  const map = {
    "Milano": "Lombardia",
    "Bergamo": "Lombardia",
    "Varese": "Lombardia",
    "Monticello": "Lombardia",
    "Ambrosiano": "Lombardia",
    "Tolcinasco": "Lombardia",
    "Franciacorta": "Lombardia",

    "Torino": "Piemonte",
    "Biella": "Piemonte",
    "Roveri": "Piemonte",
    "Cherasco": "Piemonte",
    "Castelconturbia": "Piemonte",

    "Roma": "Lazio",
    "Olgiata": "Lazio",
    "Marco Simone": "Lazio",

    "Firenze": "Toscana",
    "Poggio": "Toscana"
  };

  for (let key in map) {
    if (nome.includes(key)) return map[key];
  }

  return "Italia";
}

// ===============================
// FETCH HTML FIG
// ===============================
async function fetchFIG() {
  const { data } = await axios.get(URL);
  return cheerio.load(data);
}

// ===============================
// PARSE TABELLA FIG
// ===============================
function parseTable($) {
  const rows = [];

  $("table tr").each((i, el) => {
    const cols = $(el).find("td");

    if (cols.length < 5) return;

    const circolo = $(cols[0]).text().trim();
    const percorso = $(cols[1]).text().trim();
    const par = parseInt($(cols[2]).text());

    let tee = {};
    let index = 0;

    for (let i = 3; i < cols.length; i += 2) {
      const cr = parseFloat($(cols[i]).text());
      const slope = parseInt($(cols[i + 1]).text());

      if (!isNaN(cr) && !isNaN(slope)) {
        tee[TEE_NAMES[index]] = {
          cr: cr,
          slope: slope
        };
      }

      index++;
    }

    rows.push({
      circolo,
      percorso,
      par,
      tee
    });
  });

  return rows;
}

// ===============================
// NORMALIZZAZIONE DATI
// ===============================
function normalize(rows) {
  const campi = {};

  rows.forEach(r => {
    const nome = r.circolo;

    if (!campi[nome]) {
      campi[nome] = {
        nome: nome,
        regione: detectRegion(nome),
        percorsi: {}
      };
    }

    if (!campi[nome].percorsi[r.percorso]) {
      campi[nome].percorsi[r.percorso] = {
        nome: r.percorso,
        par: r.par,
        tee: {}
      };
    }

    Object.assign(
      campi[nome].percorsi[r.percorso].tee,
      r.tee
    );
  });

  return Object.values(campi).map(c => ({
    ...c,
    percorsi: Object.values(c.percorsi)
  }));
}

// ===============================
// SPLIT NORD / CENTRO / SUD
// ===============================
function splitByArea(campi) {
  const nord = [];
  const centro = [];
  const sud = [];

  campi.forEach(c => {
    const area = getArea(c.regione);

    if (area === "nord") nord.push(c);
    else if (area === "centro") centro.push(c);
    else sud.push(c);
  });

  return { nord, centro, sud };
}

// ===============================
// MAIN
// ===============================
async function main() {
  console.log("📥 Scarico dati FIG...");

  const $ = await fetchFIG();

  console.log("🔎 Parsing tabella...");

  const rows = parseTable($);

  console.log("🧠 Normalizzo dati...");

  const campi = normalize(rows);

  console.log("📂 Divido per area...");

  const { nord, centro, sud } = splitByArea(campi);

  console.log("💾 Salvo file...");

  fs.writeFileSync("campi_nord.json", JSON.stringify(nord, null, 2));
  fs.writeFileSync("campi_centro.json", JSON.stringify(centro, null, 2));
  fs.writeFileSync("campi_sud.json", JSON.stringify(sud, null, 2));

  console.log("✅ FATTO!");
}

main();
