// gallery.js
const INDEX_URL = 'data/index.json';   // кладём рядом с index.html
const THUMB_URL = 'https://github.com/USER/REPO/releases/download/v1.0/thumbs.zip/thumbs/';
const FULL_URL  = 'https://github.com/USER/REPO/releases/download/v1.0/images.zip/images/';

let data, filtered, idx;   // idx – индекс текущего изображения в lightbox

async function load() {
  data = await fetch(INDEX_URL).then(r => r.json());
  filtered = data;
  render();
  document.getElementById('search').addEventListener('input', onSearch);
}
function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  filtered.forEach((rec, i) => {
    const img = document.createElement('img');
    img.src = THUMB_URL + rec.file;
    img.loading = 'lazy';
    img.addEventListener('click', () => openBox(i));
    grid.appendChild(img);
  });
  document.getElementById('counter').textContent = `(${filtered.length})`;
}
function onSearch(e) {
  const q = e.target.value.toLowerCase();
  filtered = data.filter(r => r.caption.toLowerCase().includes(q) || r.date.includes(q));
  render();
}
function openBox(i) {
  idx = i;
  const rec = filtered[idx];
  document.getElementById('lb-img').src   = FULL_URL + rec.file;
  document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
  document.getElementById('lightbox').classList.remove('hidden');
}
document.getElementById('lb-close').onclick = () => document.getElementById('lightbox').classList.add('hidden');
document.getElementById('lb-prev').onclick  = () => { idx = (idx - 1 + filtered.length) % filtered.length; openBox(idx); };
document.getElementById('lb-next').onclick  = () => { idx = (idx + 1) % filtered.length; openBox(idx); };

load();