// gallery.js
const INDEX_URL = 'data/index.json';
const THUMB_BASE = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/';
const FULL_BASE = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/';

let data, filtered, idx;

async function load() {
    data = await fetch(INDEX_URL).then(r => r.json());
    filtered = data;
    render();
  
    const hash = location.hash.slice(1);
    const wanted = hash.split('?')[0]; // "#10?img=..." → "10"
    
    console.log('Hash from URL:', hash);
    console.log('Wanted ID:', wanted);
    
    if (wanted) {
      // Ищем запись по ID (как число или строка)
      const i = filtered.findIndex(r => r.id == wanted || r.id.toString() === wanted);
      console.log('Found index:', i);
      
      if (i !== -1) {
        // НЕМНОЖКО ЖДЁМ чтобы страница загрузилась
        setTimeout(() => openBox(i), 300);
      }
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
    
    console.log('Opening box:', i, 'ID:', rec.id);
    
    // Обновляем хэш
    history.replaceState(null, null, '#' + rec.id);
    
    // Устанавливаем картинку и описание
    document.getElementById('lb-img').src = FULL_BASE + rec.full;
    document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
    
    // Показываем лайтбокс
    document.getElementById('lightbox').classList.remove('hidden');
    
    // Прокручиваем к началу страницы для мобильных
    window.scrollTo(0, 0);
}

  const shareBtn = document.getElementById('lb-share');

shareBtn.addEventListener('click', () => {
  const rec = filtered[idx];
  
  // ПРОСТОЙ URL без сложной логики
  const currentUrl = window.location.origin + window.location.pathname;
  const previewUrl = currentUrl.replace('index.html', 'preview.html') + '#' + rec.id;
  
  console.log('Sharing:', previewUrl);
  
  // Простой share в Telegram
  window.open('https://t.me/share/url?url=' + encodeURIComponent(previewUrl), '_blank');
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



