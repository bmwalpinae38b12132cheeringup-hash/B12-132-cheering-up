const INDEX_URL = 'data/index.json';
const THUMB_URL = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/thumbs/';
const FULL_URL  = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/images/';

// Настройки ленивой загрузки
const ITEMS_PER_PAGE = 30; // Сколько элементов загружать за раз
const LOAD_MARGIN = 200;   // Загружать элементы за 200px до появления в viewport
const PRELOAD_CHUNK_SIZE = 30; // Сколько элементов предзагружать из каждого нового чанка

let data, filtered, idx;
let visibleItems = 0;
let isLoading = false;
let observer = null;

async function load() {
    console.log('Начало загрузки данных...');
    data = await fetch(INDEX_URL).then(r => r.json());
    console.log(`Загружено ${data.length} записей`);
    filtered = data;
    renderInitial();
  
    const wanted = location.hash.slice(1).split('?')[0]; // "#10?img=..." → "10"
    if (wanted) {
      const i = filtered.findIndex(r => r.id == wanted);
      if (i !== -1) openBox(i);
    }
  
    document.getElementById('search').addEventListener('input', onSearch);
    
    // Добавить обработчик для кнопки +500
    document.getElementById('jump-500').addEventListener('click', jumpForward);
}

function renderInitial() {
  console.log('renderInitial вызван, filtered.length =', filtered.length);
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  
  // Создаем контейнеры для первых ITEMS_PER_PAGE элементов
  visibleItems = Math.min(ITEMS_PER_PAGE, filtered.length);
  console.log('visibleItems установлен в', visibleItems);
  
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
  
  // Предзагружаем первые изображения немедленно
  preloadImages(0, Math.min(PRELOAD_CHUNK_SIZE, visibleItems));
}

// Создание элемента миниатюры
function createThumbBox(i) {
  const grid = document.getElementById('grid');
  const rec = filtered[i];
  
  const box = document.createElement('div');
  box.className = 'thumb-box';
  box.dataset.index = i;
  box.id = `thumb-${i}`; // Добавляем ID для прокрутки
  
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
  console.log('Инициализация ленивой загрузки...');
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const box = entry.target;
        const index = parseInt(box.dataset.index, 10);
        const img = box.querySelector('.thumb-image');
        const src = img.dataset.src;
        
        console.log(`Элемент ${index} вошел в viewport`);
        
        // Загружаем изображение
        if (src && !img.classList.contains('loaded')) {
          console.log(`Начинаем загрузку изображения для элемента ${index}`);
          const imageLoader = new Image();
          imageLoader.src = src;
          imageLoader.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            console.log(`Изображение для элемента ${index} загружено`);
          };
          imageLoader.onerror = () => {
            console.error(`Ошибка загрузки изображения для элемента ${index}: ${src}`);
          };
        }
        
        // Проверяем, нужно ли подгрузить новые элементы
        if (index >= visibleItems - 5 && !isLoading && visibleItems < filtered.length) {
          console.log(`Триггер подгрузки новых элементов, индекс: ${index}, видимых: ${visibleItems}`);
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
  console.log(`Наблюдение начато для ${document.querySelectorAll('.thumb-box').length} элементов`);
}

// Подгрузка дополнительных элементов
function loadMoreItems() {
  if (isLoading || visibleItems >= filtered.length) return;
  
  isLoading = true;
  console.log(`Начало загрузки дополнительных элементов, текущий visibleItems: ${visibleItems}`);
  
  // Показываем индикатор загрузки
  const loadingEl = document.getElementById('loading');
  loadingEl.classList.remove('hidden');
  
  // Используем requestAnimationFrame для лучшей производительности
  requestAnimationFrame(() => {
    const grid = document.getElementById('grid');
    const startIndex = visibleItems;
    const endIndex = Math.min(visibleItems + ITEMS_PER_PAGE, filtered.length);
    
    console.log(`Добавление элементов с ${startIndex} по ${endIndex}`);
    
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
    
    console.log(`Загрузка завершена, новый visibleItems: ${visibleItems}`);
    
  });
}

// Предзагрузка изображений из указанного диапазона
// Предзагрузка изображений из указанного диапазона
function preloadImages(start, count) {
  console.log(`Предзагрузка изображений с ${start} по ${start + count - 1}`);
  const end = Math.min(start + count, visibleItems);
  
  // Используем микротаски для предотвращения блокировки UI
  const preloadBatch = (batchStart, batchEnd) => {
    for (let i = batchStart; i < batchEnd; i++) {
      const img = document.querySelector(`#thumb-${i} .thumb-image`);
      if (img) {
        const src = img.dataset.src;
        if (src && !img.classList.contains('loaded')) {
          // Используем requestIdleCallback для фоновой загрузки
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              const imageLoader = new Image();
              imageLoader.src = src;
              imageLoader.onload = () => {
                img.src = src;
                img.classList.add('loaded');
              };
              imageLoader.onerror = () => {
                console.error(`Ошибка предзагрузки изображения для элемента ${i}`);
              };
            });
          } else {
            // Fallback для браузеров без requestIdleCallback
            setTimeout(() => {
              const imageLoader = new Image();
              imageLoader.src = src;
              imageLoader.onload = () => {
                img.src = src;
                img.classList.add('loaded');
              };
              imageLoader.onerror = () => {
                console.error(`Ошибка предзагрузки изображения для элемента ${i}`);
              };
            }, 0);
          }
        }
      }
    }
  };
  
  // Разбиваем на мелкие батчи для лучшей отзывчивости
  const BATCH_SIZE = 5;
  for (let batchStart = start; batchStart < end; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, end);
    setTimeout(() => preloadBatch(batchStart, batchEnd), 0);
  }
}

// Функция перехода на +500 изображений
// Функция перехода на +500 изображений
function jumpForward() {
  console.log('=== jumpForward вызван ===');
  console.log('Текущий visibleItems:', visibleItems);
  console.log('Всего элементов:', filtered.length);
  
  if (visibleItems >= filtered.length) {
    console.log('Все элементы уже загружены, выход');
    return;
  }
  
  const jumpAmount = 500;
  const targetIndex = Math.min(visibleItems + jumpAmount, filtered.length);
  const scrollToIndex = visibleItems; // Прокручиваем к началу новых элементов
  
  console.log(`Целевой индекс: ${targetIndex}, прокрутка к: ${scrollToIndex}`);
  
  // Очищаем текущий observer
  if (observer) {
    observer.disconnect();
    console.log('Observer отключен');
  }
  
  // Очищаем сетку
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  console.log('Сетка очищена');
  
  // Устанавливаем новые видимые элементы
  visibleItems = Math.min(targetIndex, filtered.length);
  console.log(`Новый visibleItems: ${visibleItems}`);
  
  // Создаем контейнеры для видимых элементов
  for (let i = 0; i < visibleItems; i++) {
    createThumbBox(i);
  }
  console.log(`Создано ${visibleItems} элементов`);
  
  // Обновляем счетчик
  document.getElementById('counter').textContent = `(${visibleItems}/${filtered.length})`;
  
  // Сначала предзагружаем важные изображения ДО инициализации observer
  console.log('Начинаем предзагрузку изображений для новых чанков...');
  
  // 1. Предзагружаем первые элементы нового чанка (куда прыгаем)
  const startOfNewChunk = scrollToIndex;
  
  // Используем микротаск для предзагрузки
  Promise.resolve().then(() => {
    // Сначала предзагружаем изображения, которые будут в viewport после прокрутки
    preloadImages(startOfNewChunk, PRELOAD_CHUNK_SIZE);
    
    // Затем предзагружаем первые элементы предыдущих чанков
    for (let chunkStart = 0; chunkStart < startOfNewChunk; chunkStart += 500) {
      preloadImages(chunkStart, Math.min(PRELOAD_CHUNK_SIZE, 10));
    }
    
    // Инициализируем ленивую загрузку ПОСЛЕ предзагрузки
    initLazyLoad();
    
    // Прокручиваем к началу новых элементов (к элементу, с которого начался скачок)
    console.log(`Прокрутка к элементу ${scrollToIndex}...`);
    
    // Даем браузеру немного времени на обработку
    requestAnimationFrame(() => {
      const targetElement = document.getElementById(`thumb-${scrollToIndex}`);
      if (targetElement) {
        console.log(`Элемент для прокрутки найден, выполняем прокрутку`);
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        console.warn(`Элемент thumb-${scrollToIndex} не найден, прокручиваем вверх`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
  
  // Если все еще есть элементы для загрузки, показываем индикатор
  if (visibleItems < filtered.length) {
    document.getElementById('loading').classList.remove('hidden');
  } else {
    document.getElementById('loading').classList.add('hidden');
  }
  
  // Скрываем кнопку, если достигнут конец
  if (visibleItems >= filtered.length) {
    document.getElementById('jump-500').style.display = 'none';
  }
}

function onSearch(e) {
  console.log('Поиск:', e.target.value);
  const q = e.target.value.toLowerCase();
  filtered = data.filter(r => r.caption.toLowerCase().includes(q) || r.date.includes(q));
  
  console.log(`Найдено ${filtered.length} элементов`);
  
  // Сбрасываем видимые элементы
  visibleItems = 0;
  
  // Очищаем текущий observer
  if (observer) {
    observer.disconnect();
  }
  
  // Перерисовываем
  renderInitial();
  
  // Скрываем/показываем кнопку +500 в зависимости от результатов поиска
  const jumpBtn = document.getElementById('jump-500');
  if (filtered.length <= ITEMS_PER_PAGE) {
    jumpBtn.style.display = 'none';
  } else {
    jumpBtn.style.display = 'block';
  }
}

function openBox(i) {
    console.log(`Открытие лайтбокса для элемента ${i}`);
    idx = i;
    const rec = filtered[idx];
  
    // ставим хэш
    history.replaceState(null, null, '#' + rec.id);
  
    document.getElementById('lb-img').src   = FULL_URL + rec.file;
    document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
    document.getElementById('lightbox').classList.remove('hidden');
}

const shareBtn = document.getElementById('lb-share');

shareBtn.addEventListener('click', () => {
    console.log('Поделиться в Telegram');
    const rec  = filtered[idx];
    const base = location.origin + location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
    const page = base + 'preview.html#' + rec.id;   // **только hash**, никаких ?img=…
    window.location = 'https://t.me/share/url?url=' + encodeURIComponent(page);
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

