// Lógica común a las tres vistas de Vocabulario (tarjetas, aprender, examen):
// carga de datos, progreso compartido (Leitner) y comprobación de respuestas.

const WORKER_URL = "https://spanish-vocabulario-progress.minaevaviktoriia.workers.dev/progress";
const AUTH_TOKEN = "eddda14e7e143b917b3939a830f1babf1c8c1ce5a5a7ef3159bed85d6aa37a0f";

const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16, 30];
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
const FALLBACK_KEY = "vocabProgressFallback";

let vocabOnline = false;

async function loadCards(){
  try{
    const res = await fetch("data.json", {cache:"no-store"});
    if(!res.ok) return [];
    return await res.json();
  }catch(e){ return []; }
}

async function loadProgress(){
  try{
    const res = await fetch(WORKER_URL, {
      headers: {Authorization: `Bearer ${AUTH_TOKEN}`}
    });
    if(!res.ok) throw new Error("bad response");
    vocabOnline = true;
    return await res.json();
  }catch(e){
    vocabOnline = false;
    try{ return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "{}"); }
    catch(e2){ return {}; }
  }
}

// progress: el objeto {id: {box, due, learned}} en memoria, se actualiza in-place.
async function saveProgress(progress, id, entry){
  progress[id] = entry;
  try{ localStorage.setItem(FALLBACK_KEY, JSON.stringify(progress)); }catch(e){}
  if(!vocabOnline) return;
  try{
    await fetch(WORKER_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json", Authorization: `Bearer ${AUTH_TOKEN}`},
      body: JSON.stringify({id, ...entry})
    });
  }catch(e){ vocabOnline = false; }
}

// Misma escala de repetición en las tres vistas: acertar sube de caja,
// fallar vuelve a la primera.
function computeReviewEntry(prevBox, correct){
  const newBox = correct ? Math.min((prevBox||0)+1, MAX_BOX) : 0;
  const due = new Date(Date.now() + BOX_INTERVAL_DAYS[newBox]*86400000).toISOString();
  return {box:newBox, due, learned: newBox === MAX_BOX};
}

function isDue(card, progress){
  const p = progress[card.id] || {due: new Date(0).toISOString()};
  return Date.parse(p.due) <= Date.now();
}

function normalize(s){
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Un front como "malgastar / derrochar" o "afligir, afligido" admite
// cualquiera de sus partes, o la frase completa, como respuesta válida.
function frontVariants(front){
  const parts = front.split(/\s*[\/,]\s*/).map(s => s.trim()).filter(Boolean);
  return [front, ...parts];
}

function checkWrittenAnswer(userInput, front){
  const normInput = normalize(userInput);
  if(!normInput) return false;
  return frontVariants(front).some(v => normalize(v) === normInput);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// count distractores (front de otras cartas) distintos de la carta correcta.
function pickDistractors(cards, excludeId, count){
  const pool = cards.filter(c => c.id !== excludeId);
  return shuffle(pool).slice(0, count).map(c => c.front);
}
