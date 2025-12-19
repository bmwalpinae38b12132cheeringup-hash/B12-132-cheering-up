const INDEX_URL = 'data/index.json';
const THUMB_URL = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/thumbs/';
const FULL_URL  = 'https://pub-3a115c1e9a8b4541b7685443d9eb4263.r2.dev/images/';

// Настройки ленивой загрузки
const ITEMS_PER_PAGE = 30; // Сколько элементов загружать за раз
const LOAD_MARGIN = 200;   // Загружать элементы за 200px до появления в viewport
const PRELOAD_CHUNK_SIZE = 30; // Сколько элементов предзагружать из каждого нового чанка
const CHUNK_SIZE = 500; // Размер чанка для прыжков

let data, filtered, idx;
let visibleItems = 0;
let isLoading = false;
let observer = null;
let loadedImages = new Set(); // Для отслеживания уже загруженных изображений
let createdElements = new Map(); // Для хранения уже созданных DOM элементов

async function load() {
    console.log('Начало загрузки данных...');
    data = await fetch(INDEX_URL).then(r => r.json());
    console.log(`Загружено ${data.length} записей`);
    filtered = data;
    renderInitial();
  
    const wanted = location.hash.slice(1).split('?')[0];
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
  createdElements.clear();
  
  // Создаем контейнеры для первых ITEMS_PER_PAGE элементов
  visibleItems = Math.min(ITEMS_PER_PAGE, filtered.length);
  console.log('visibleItems установлен в', visibleItems);
  
  for (let i = 0; i < visibleItems; i++) {
    createThumbBox(i);
  }
  
  // Обновляем счетчик
  updateCounter();
  
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
function createThumbBox(i, forceCreate = false) {
  // Проверяем, не создан ли элемент уже
  if (!forceCreate && createdElements.has(i)) {
    return createdElements.get(i);
  }
  
  const grid = document.getElementById('grid');
  const rec = filtered[i];
  
  const box = document.createElement('div');
  box.className = 'thumb-box';
  box.dataset.index = i;
  box.id = `thumb-${i}`;
  
  // Проверяем, было ли изображение уже загружено
  const imageAlreadyLoaded = loadedImages.has(i);
  
  // Плейсхолдер
  const placeholder = document.createElement('div');
  placeholder.className = 'thumb-placeholder';
  box.appendChild(placeholder);
  
  // Изображение
  const img = document.createElement('img');
  img.className = 'thumb-image';
  
  if (imageAlreadyLoaded) {
    // Если изображение уже загружено, устанавливаем src сразу
    img.src = THUMB_URL + rec.file;
    img.classList.add('loaded');
  } else {
    // Иначе используем ленивую загрузку
    img.dataset.src = THUMB_URL + rec.file;
    img.loading = 'lazy';
  }
  
  img.alt = rec.caption || '';
  box.appendChild(img);
  
  // Текст
  const txt = document.createElement('div');
  txt.className = 'thumb-text';
  txt.textContent = rec.caption || '';
  box.appendChild(txt);
  
  // Клик для открытия лайтбокса
  box.addEventListener('click', () => openBox(i));
  
  // Сохраняем элемент в карту
  createdElements.set(i, box);
  
  // Если forceCreate=false, добавляем в сетку только если это новый элемент
  if (forceCreate || i >= grid.children.length) {
    grid.appendChild(box);
  }
  
  return box;
}

// Обновление счетчика
function updateCounter() {
  document.getElementById('counter').textContent = `(${visibleItems}/${filtered.length})`;
}

// Инициализация ленивой загрузки
function initLazyLoad() {
  console.log('Инициализация ленивой загрузки...');
  
  if (observer) {
    observer.disconnect();
  }
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const box = entry.target;
        const index = parseInt(box.dataset.index, 10);
        const img = box.querySelector('.thumb-image');
        
        // Проверяем, нужно ли загружать изображение
        if (img.dataset.src && !img.classList.contains('loaded')) {
          const src = img.dataset.src;
          console.log(`Загрузка изображения для элемента ${index}`);
          
          const imageLoader = new Image();
          imageLoader.src = src;
          imageLoader.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            loadedImages.add(index); // Запоминаем, что изображение загружено
          };
          imageLoader.onerror = () => {
            console.error(`Ошибка загрузки изображения для элемента ${index}`);
          };
        }
        
        // Проверяем, нужно ли подгрузить новые элементы
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
    const startIndex = visibleItems;
    const endIndex = Math.min(visibleItems + ITEMS_PER_PAGE, filtered.length);
    
    console.log(`Добавление элементов с ${startIndex} по ${endIndex}`);
    
    for (let i = startIndex; i < endIndex; i++) {
      createThumbBox(i);
    }
    
    // Начинаем наблюдение за новыми элементами
    const grid = document.getElementById('grid');
    const newBoxes = Array.from(grid.children).slice(startIndex);
    newBoxes.forEach(box => observer.observe(box));
    
    visibleItems = endIndex;
    
    // Скрываем индикатор загрузки, если все загружено
    if (visibleItems >= filtered.length) {
      loadingEl.classList.add('hidden');
    }
    
    isLoading = false;
    
    // Обновляем счетчик
    updateCounter();
    
    console.log(`Загрузка завершена, новый visibleItems: ${visibleItems}`);
  });
}

// Предзагрузка изображений из указанного диапазона
function preloadImages(start, count) {
  const end = Math.min(start + count, visibleItems);
  
  for (let i = start; i < end; i++) {
    // Если изображение уже загружено, пропускаем
    if (loadedImages.has(i)) continue;
    
    const box = createdElements.get(i);
    if (box) {
      const img = box.querySelector('.thumb-image');
      if (img && img.dataset.src && !img.classList.contains('loaded')) {
        const src = img.dataset.src;
        const imageLoader = new Image();
        imageLoader.src = src;
        imageLoader.onload = () => {
          img.src = src;
          img.classList.add('loaded');
          loadedImages.add(i);
        };
      }
    }
  }
}

// Функция перехода на +500 изображений
function jumpForward() {
  console.log('=== jumpForward вызван ===');
  console.log('Текущий visibleItems:', visibleItems);
  console.log('Всего элементов:', filtered.length);
  
  if (visibleItems >= filtered.length) {
    console.log('Все элементы уже загружены, выход');
    return;
  }
  
  const jumpAmount = CHUNK_SIZE;
  const targetIndex = Math.min(visibleItems + jumpAmount, filtered.length);
  const startOfJump = visibleItems;
  
  console.log(`Целевой индекс: ${targetIndex}, начало прыжка: ${startOfJump}`);
  
  // Вычисляем границы чанков
  const currentChunk = Math.floor(startOfJump / CHUNK_SIZE);
  const nextChunkStart = (currentChunk + 1) * CHUNK_SIZE;
  
  // Определяем, к какому элементу прокручивать
  let scrollToIndex = nextChunkStart;
  scrollToIndex = Math.min(scrollToIndex, targetIndex - 1);
  scrollToIndex = Math.max(0, scrollToIndex);
  
  console.log(`Будем прокручивать к элементу ${scrollToIndex} (начало нового чанка)`);
  
  // Останавливаем наблюдение
  if (observer) {
    observer.disconnect();
    console.log('Observer отключен');
  }
  
  // Создаем недостающие элементы (если их еще нет)
  const grid = document.getElementById('grid');
  
  // Убедимся, что у нас есть элементы до targetIndex
  if (visibleItems < targetIndex) {
    console.log(`Создание элементов с ${visibleItems} по ${targetIndex - 1}`);
    
    for (let i = visibleItems; i < targetIndex; i++) {
      createThumbBox(i);
    }
    
    visibleItems = targetIndex;
  }
  
  // Обновляем счетчик
  updateCounter();
  
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
  
  // Инициализируем ленивую загрузку снова
  initLazyLoad();
  
  // Предзагружаем важные изображения
  console.log('Начинаем целеустремленную предзагрузку...');
  
  // 1. Предзагружаем элементы нового чанка
  const preloadStart = scrollToIndex;
  const preloadCount = Math.min(PRELOAD_CHUNK_SIZE * 2, visibleItems - preloadStart);
  
  if (preloadCount > 0) {
    console.log(`Предзагрузка нового чанка: ${preloadStart}-${preloadStart + preloadCount - 1}`);
    preloadImages(preloadStart, preloadCount);
  }
  
  // 2. Предзагружаем немного элементов перед целевым (для плавности)
  const beforePreloadStart = Math.max(0, scrollToIndex - 10);
  const beforePreloadCount = Math.min(10, scrollToIndex);
  
  if (beforePreloadCount > 0) {
    console.log(`Предзагрузка элементов перед целевым: ${beforePreloadStart}-${beforePreloadStart + beforePreloadCount - 1}`);
    preloadImages(beforePreloadStart, beforePreloadCount);
  }
  
  // Прокручиваем к целевому элементу
  setTimeout(() => {
    const targetElement = document.getElementById(`thumb-${scrollToIndex}`);
    if (targetElement) {
      console.log(`Прокрутка к элементу thumb-${scrollToIndex}`);
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      console.warn(`Элемент thumb-${scrollToIndex} не найден, прокручиваем вверх`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 50);
}

function onSearch(e) {
  console.log('Поиск:', e.target.value);
  const q = e.target.value.toLowerCase();
  filtered = data.filter(r => r.caption.toLowerCase().includes(q) || r.date.includes(q));
  
  console.log(`Найдено ${filtered.length} элементов`);
  
  // Сбрасываем состояние
  visibleItems = 0;
  loadedImages.clear();
  createdElements.clear();
  
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

// Остальные функции (openBox, shareBtn, lb и т.д.) остаются без изменений
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
    const page = base + 'preview.html#' + rec.id;
    window.location = 'https://t.me/share/url?url=' + encodeURIComponent(page);
});

const lb = document.getElementById('lightbox');

lb.addEventListener('click', e => {
    if (e.target.id === 'lb-img' || e.target.id === 'lb-prev' || e.target.id === 'lb-next' || e.target.closest('#lb-caption') || e.target.closest('#lb-share')) return;
    lb.classList.add('hidden');
    history.replaceState(null, null, location.pathname);
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

load();
