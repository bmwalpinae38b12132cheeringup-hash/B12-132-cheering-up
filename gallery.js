const INDEX_URL = 'data/index.json';
const THUMB_URL = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/thumbs/';
const FULL_URL  = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/images/';

// Настройки ленивой загрузки
const ITEMS_PER_PAGE = 30; // Сколько элементов загружать за раз
const LOAD_MARGIN = 200;   // Загружать элементы за 200px до появления в viewport

let data, filtered, idx;
let visibleItems = 0;
let isLoading = false;
let observer = null;

async function load() {
    data = await fetch(INDEX_URL).then(r => r.json());
    filtered = data;
    renderInitial();
  
    const wanted = location.hash.slice(1).split('?')[0]; // "#10?img=..." → "10"
    if (wanted) {
      const i = filtered.findIndex(r => r.id == wanted);
      if (i !== -1) openBox(i);
    }
  
    document.getElementById('search').addEventListener('input', onSearch);
}

function renderInitial() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  
  // Создаем контейнеры для первых ITEMS_PER_PAGE элементов
  visibleItems = Math.min(ITEMS_PER_PAGE, filtered.length);
  
  for (let i = 0; i < visibleItems; i++) {
    createThumbBox(i);
  }
  
  // Обновляем счетчик
  document.getElementById('counter').textContent = `(${visibleItems}/${filtered.length})`;
  
  // Если есть еще элементы, показываем индикатор загрузки
  if (visibleItems < filtered.length) {
    document.getElementById('loading').classList.remove('hidden');
  }
  
  // Инициализируем Intersection Observer для ленивой загрузки
  initLazyLoad();
}

// Создание элемента миниатюры
function createThumbBox(i) {
  const grid = document.getElementById('grid');
  const rec = filtered[i];
  
  const box = document.createElement('div');
  box.className = 'thumb-box';
  box.dataset.index = i;
  
  // Плейсхолдер
  const placeholder = document.createElement('div');
  placeholder.className = 'thumb-placeholder';
  box.appendChild(placeholder);
  
  // Изображение (ленивая загрузка)
  const img = document.createElement('img');
  img.className = 'thumb-image';
  img.dataset.src = THUMB_URL + rec.file; // Сохраняем URL в data-атрибуте
  img.alt = rec.caption || '';
  img.loading = 'lazy';
  box.appendChild(img);
  
  // Текст
  const txt = document.createElement('div');
  txt.className = 'thumb-text';
  txt.textContent = rec.caption || '';
  box.appendChild(txt);
  
  // Клик для открытия лайтбокса
  box.addEventListener('click', () => openBox(i));
  
  grid.appendChild(box);
}

// Инициализация ленивой загрузки
function initLazyLoad() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const box = entry.target;
        const img = box.querySelector('.thumb-image');
        const src = img.dataset.src;
        
        // Загружаем изображение
        if (src && !img.classList.contains('loaded')) {
          const imageLoader = new Image();
          imageLoader.src = src;
          imageLoader.onload = () => {
            img.src = src;
            img.classList.add('loaded');
          };
        }
        
        // Проверяем, нужно ли подгрузить новые элементы
        const index = parseInt(box.dataset.index, 10);
        if (index >= visibleItems - 5 && !isLoading && visibleItems < filtered.length) {
          loadMoreItems();
        }
      }
    });
  }, {
    rootMargin: `${LOAD_MARGIN}px`,
    threshold: 0.1
  });
  
  // Начинаем наблюдение за существующими элементами
  document.querySelectorAll('.thumb-box').forEach(box => {
    observer.observe(box);
  });
}

// Подгрузка дополнительных элементов
function loadMoreItems() {
  if (isLoading || visibleItems >= filtered.length) return;
  
  isLoading = true;
  
  // Показываем индикатор загрузки
  const loadingEl = document.getElementById('loading');
  loadingEl.classList.remove('hidden');
  
  // Имитация задержки для плавности
  setTimeout(() => {
    const grid = document.getElementById('grid');
    const startIndex = visibleItems;
    const endIndex = Math.min(visibleItems + ITEMS_PER_PAGE, filtered.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      createThumbBox(i);
    }
    
    // Начинаем наблюдение за новыми элементами
    const newBoxes = Array.from(grid.children).slice(startIndex);
    newBoxes.forEach(box => observer.observe(box));
    
    visibleItems = endIndex;
    
    // Скрываем индикатор загрузки, если все загружено
    if (visibleItems >= filtered.length) {
      loadingEl.classList.add('hidden');
    }
    
    isLoading = false;
    
    // Обновляем счетчик
    document.getElementById('counter').textContent = `(${visibleItems}/${filtered.length})`;
    
  }, 300);
}

function onSearch(e) {
  const q = e.target.value.toLowerCase();
  filtered = data.filter(r => r.caption.toLowerCase().includes(q) || r.date.includes(q));
  
  // Сбрасываем видимые элементы
  visibleItems = 0;
  
  // Очищаем текущий observer
  if (observer) {
    observer.disconnect();
  }
  
  // Перерисовываем
  renderInitial();
}

function openBox(i) {
    idx = i;
    const rec = filtered[idx];
  
    // ставим хэш
    history.replaceState(null, null, '#' + rec.id);
  
    document.getElementById('lb-img').src   = FULL_URL + rec.file;
    document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
    document.getElementById('lightbox').classList.remove('hidden');
}

const shareBtn = document.getElementById('lb-share');

// Замените существующую функцию шаринга на эту:
shareBtn.addEventListener('click', () => {
  const rec = filtered[idx];
  
  // Определяем базовый путь в зависимости от структуры
  const getBaseUrl = () => {
    const path = window.location.pathname;
    
    // Для GitHub Pages в подпапке
    if (path.includes('/B12-132-cheering-up/')) {
      return `${window.location.origin}/B12-132-cheering-up/`;
    }
    
    // Для локального тестирования
    if (path.endsWith('index.html') || path.endsWith('/')) {
      return `${window.location.origin}${path.substring(0, path.lastIndexOf('/') + 1)}`;
    }
    
    return `${window.location.origin}/`;
  };
  
  const baseUrl = getBaseUrl();
  const pageUrl = `${baseUrl}preview.html#${rec.id}`;
  const shareText = `${rec.caption || 'Фото BMW Alpina'} (${rec.date.slice(0, 10)})`;
  
  // Формируем URL для Telegram
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
  
  // Открываем в новом окне
  window.open(telegramUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
});
// в gallery.js после объявления openBox() сфсфыс
const lb = document.getElementById('lightbox');

lb.addEventListener('click', e => {
    if (e.target.id === 'lb-img' || e.target.id === 'lb-prev' || e.target.id === 'lb-next' || e.target.closest('#lb-caption') || e.target.closest('#lb-share')) return;
    lb.classList.add('hidden');
    history.replaceState(null, null, location.pathname); // убрали якорь
});

document.getElementById('lb-prev').onclick  = () => { 
    idx = (idx - 1 + filtered.length) % filtered.length; 
    openBox(idx); 
};

document.getElementById('lb-next').onclick  = () => { 
    idx = (idx + 1) % filtered.length; 
    openBox(idx); 
};

// Обработка клавиатуры в лайтбоксе
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox.classList.contains('hidden')) return;
  
  switch (e.key) {
    case 'Escape':
      lightbox.classList.add('hidden');
      history.replaceState(null, null, location.pathname);
      break;
    case 'ArrowLeft':
      idx = (idx - 1 + filtered.length) % filtered.length;
      openBox(idx);
      break;
    case 'ArrowRight':
      idx = (idx + 1) % filtered.length;
      openBox(idx);
      break;
  }
});

// Предзагрузка изображений при наведении (опционально)
document.addEventListener('mouseover', (e) => {
  const thumbBox = e.target.closest('.thumb-box');
  if (thumbBox && !thumbBox.dataset.preloaded) {
    const img = thumbBox.querySelector('.thumb-image');
    const src = img.dataset.src;
    if (src) {
      const preload = new Image();
      preload.src = src;
      thumbBox.dataset.preloaded = 'true';
    }
  }
});

load();


