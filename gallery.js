// gallery.js
const INDEX_URL = 'data/index.json';
const THUMB_BASE = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/';
const FULL_BASE = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/';

let data, filtered, idx;

async function load() {
    data = await fetch(INDEX_URL).then(r => r.json());
    filtered = data;
    render();
  
    const wanted = location.hash.slice(1).split('?')[0]; // "#10?img=..." → "10"
    if (wanted) {
      const i = filtered.findIndex(r => r.id == wanted);
      if (i !== -1) openBox(i);
    }
  
    document.getElementById('search').addEventListener('input', onSearch);
  }

function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  filtered.forEach((rec, i) => {
    const box = document.createElement('div');
    box.className = 'thumb-box';
    box.style.backgroundImage = `url(${THUMB_BASE + rec.thumb})`;

    const txt = document.createElement('div');
    txt.className = 'thumb-text';
    txt.textContent = rec.caption || '';

    box.appendChild(txt);
    box.addEventListener('click', () => openBox(i));
    grid.appendChild(box);
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
  
    // ставим хэш
    history.replaceState(null, null, '#' + rec.id);
  
    document.getElementById('lb-img').src = FULL_BASE + rec.full;
    document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
    document.getElementById('lightbox').classList.remove('hidden');
  }

  const shareBtn = document.getElementById('lb-share');

shareBtn.addEventListener('click', () => {
  const rec = filtered[idx];
  
  // Формируем полный URL для превью
  const currentUrl = new URL(window.location.href);
  const baseUrl = currentUrl.origin + currentUrl.pathname;
  const previewUrl = baseUrl.replace(/index\.html$/, '') + 'preview.html#' + rec.id;
  
  console.log('Sharing URL:', previewUrl);
  
  // Открываем Telegram Share с текстом
  const shareText = encodeURIComponent('Посмотри это фото из канала BMW Alpina E38 B12 #132:');
  const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(previewUrl)}&text=${shareText}`;
  
  window.open(fullUrl, '_blank', 'width=550,height=400');
});

// в gallery.js после объявления openBox() сфсфыс
const lb = document.getElementById('lightbox');

lb.addEventListener('click', e => {
    if (e.target.id === 'lb-img' || e.target.id === 'lb-prev' || e.target.id === 'lb-next' || e.target.closest('#lb-caption') || e.target.closest('#lb-share')) return;
    lb.classList.add('hidden');
    history.replaceState(null, null, location.pathname); // убрали якорь
  });

//document.getElementById('lb-close').onclick = () => document.getElementById('lightbox').classList.add('hidden');
document.getElementById('lb-prev').onclick  = () => { idx = (idx - 1 + filtered.length) % filtered.length; openBox(idx); };
document.getElementById('lb-next').onclick  = () => { idx = (idx + 1) % filtered.length; openBox(idx); };

load();


