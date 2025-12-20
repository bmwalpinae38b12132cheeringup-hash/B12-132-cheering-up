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

// Добавьте эти переменные после других глобальных переменных
// Добавьте эти переменные после других глобальных переменных в начале файла
let calendarCurrentDate = new Date();
let dateImageMap = new Map();
let touchStartX = 0;
let touchEndX = 0;

let isSwiping = false;
const SWIPE_THRESHOLD = 50; // Минимальное расстояние свайпа в пикселях



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

    // Добавляем обработчики для календаря
    initCalendar();
}

function buildDateMap(useFiltered = false) {
  dateImageMap.clear();
  const sourceData = useFiltered ? filtered : data;
  
  sourceData.forEach((rec, index) => {
      const dateKey = rec.date.slice(0, 10); // YYYY-MM-DD
      if (!dateImageMap.has(dateKey)) {
          dateImageMap.set(dateKey, []);
      }
      // Сохраняем глобальный индекс (не фильтрованный)
      const globalIndex = data.findIndex(item => item.id === rec.id);
      dateImageMap.get(dateKey).push(globalIndex);
  });
  console.log(`Построена карта дат: ${dateImageMap.size} уникальных дат`);
}

function initCalendar() {
  const calendarBtn = document.getElementById('calendar-btn');
  const calendarModal = document.getElementById('calendar-modal');
  const modalClose = calendarModal.querySelector('.modal-close');
  
  // Открытие/закрытие модального окна
  calendarBtn.addEventListener('click', () => {
      calendarModal.classList.remove('hidden');
      renderCalendar();
  });
  
  modalClose.addEventListener('click', () => {
      calendarModal.classList.add('hidden');
  });
  
  calendarModal.addEventListener('click', (e) => {
      if (e.target === calendarModal) {
          calendarModal.classList.add('hidden');
      }
  });
  
  // Управление календарем
  document.getElementById('calendar-prev-year').addEventListener('click', () => {
      calendarCurrentDate.setFullYear(calendarCurrentDate.getFullYear() - 1);
      renderCalendar();
  });
  
  document.getElementById('calendar-prev-month').addEventListener('click', () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
      renderCalendar();
  });
  
  document.getElementById('calendar-next-month').addEventListener('click', () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
      renderCalendar();
  });
  
  document.getElementById('calendar-next-year').addEventListener('click', () => {
      calendarCurrentDate.setFullYear(calendarCurrentDate.getFullYear() + 1);
      renderCalendar();
  });
}

function renderCalendar() {

// В начале renderCalendar добавьте:
console.log(`renderCalendar вызван, filtered.length = ${filtered.length}`);

// Выведите несколько примеров дат для отладки
if (filtered.length > 0) {
    console.log('Примеры дат в filtered:');
    filtered.slice(0, 5).forEach((rec, i) => {
        console.log(`  ${i}: ${rec.date.slice(0, 10)} - ${rec.caption.substring(0, 30)}...`);
    });
}

  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  
  // Обновляем заголовок
  const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  document.getElementById('calendar-current').textContent = 
      `${monthNames[month]} ${year}`;
  
  // Создаем календарь
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';
  
  // Добавляем заголовки дней недели
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  dayNames.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day-header';
      dayEl.textContent = day;
      calendarEl.appendChild(dayEl);
  });
  
  // Определяем первый день месяца
  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  
  // Добавляем пустые ячейки для начала месяца
  for (let i = 0; i < startingDay; i++) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'calendar-day empty';
      calendarEl.appendChild(emptyEl);
  }
  
  // Определяем последний день месяца
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  
  // Собираем все уникальные даты из текущих данных (фильтрованных)
  const datesWithImages = new Set();
  filtered.forEach(rec => {
      const dateKey = rec.date.slice(0, 10);
      datesWithImages.add(dateKey);
  });
  
  console.log(`В календаре найдено ${datesWithImages.size} дат с изображениями`);
  
  // Добавляем дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      dayEl.textContent = day;
      dayEl.dataset.date = dateKey;
      
      // Проверяем, есть ли изображения в этот день в текущих данных
      const hasImages = datesWithImages.has(dateKey);
      
      // Дополнительная проверка: подсчет количества изображений
      if (hasImages) {
          const imagesForThisDate = filtered.filter(rec => 
              rec.date.startsWith(dateKey)
          );
          const imageCount = imagesForThisDate.length;
          
          dayEl.classList.add('has-images');
          dayEl.title = `${imageCount} изображений за ${dateKey}`;
          
          // Добавляем счетчик для дней с несколькими изображениями
          if (imageCount > 1) {
              const countBadge = document.createElement('span');
              countBadge.className = 'day-count';
              countBadge.textContent = imageCount;
              dayEl.appendChild(countBadge);
          }
      }
      
      // Отмечаем сегодняшний день
      const isToday = date.getFullYear() === today.getFullYear() &&
                     date.getMonth() === today.getMonth() &&
                     date.getDate() === today.getDate();
      
      if (isToday) {
          dayEl.classList.add('today');
      }
      
      // Добавляем обработчик клика
      dayEl.addEventListener('click', () => {
          if (hasImages) {
              jumpToDate(dateKey);
              calendarModal.classList.add('hidden');
          }
      });
      
      calendarEl.appendChild(dayEl);
  }
}

function jumpToDate(dateKey) {
  console.log(`Переход к дате: ${dateKey}`);
  
  // Находим все изображения за эту дату в фильтрованных данных
  const imagesForDate = filtered.filter((rec, index) => 
      rec.date.startsWith(dateKey)
  );
  
  if (!imagesForDate || imagesForDate.length === 0) {
      console.log('Нет изображений для этой даты');
      return;
  }
  
  // Находим индекс первого изображения за эту дату в filtered
  const firstImage = imagesForDate[0];
  const targetIndex = filtered.findIndex(rec => rec.id === firstImage.id);
  
  console.log(`Первое изображение за ${dateKey} находится на индексе ${targetIndex} в filtered`);
  
  if (targetIndex === -1) {
      console.error('Не удалось найти изображение в filtered');
      return;
  }
  
  // Определяем, нужно ли подгрузить элементы до этой даты
  if (targetIndex >= visibleItems) {
      console.log(`Подгрузка элементов до индекса ${targetIndex}`);
      
      // Отключаем текущий observer
      if (observer) {
          observer.disconnect();
      }
      
      // Создаем недостающие элементы
      const grid = document.getElementById('grid');
      const neededCount = targetIndex - visibleItems + 1;
      
      for (let i = visibleItems; i <= targetIndex && i < filtered.length; i++) {
          createThumbBox(i);
      }
      
      visibleItems = Math.min(targetIndex + 1, filtered.length);
      updateCounter();
      
      // Инициализируем observer заново
      initLazyLoad();
  }
  
  // Прокручиваем к целевому элементу
  setTimeout(() => {
      const targetElement = document.getElementById(`thumb-${targetIndex}`);
      if (targetElement) {
          console.log(`Прокрутка к элементу thumb-${targetIndex}`);
          targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
          });
          
          // Добавляем подсветку на секунду
          targetElement.style.boxShadow = '0 0 0 3px var(--alpina-gold), 0 0 20px rgba(201, 169, 110, 0.5)';
          targetElement.style.zIndex = '100';
          
          setTimeout(() => {
              targetElement.style.boxShadow = '';
              targetElement.style.zIndex = '';
          }, 1500);
      } else {
          console.error(`Элемент thumb-${targetIndex} не найден`);
      }
  }, 100);
  
  // Если после перехода нужно больше элементов, показываем индикатор
  if (visibleItems < filtered.length) {
      document.getElementById('loading').classList.remove('hidden');
  } else {
      document.getElementById('loading').classList.add('hidden');
  }
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
  
  // Перерисовываем календарь если он открыт
  const calendarModal = document.getElementById('calendar-modal');
  if (!calendarModal.classList.contains('hidden')) {
      renderCalendar();
  }
  
  // Скрываем/показываем кнопку +500 в зависимости от результатов поиска
  const jumpBtn = document.getElementById('jump-500');
  if (filtered.length <= ITEMS_PER_PAGE) {
      jumpBtn.style.display = 'none';
  } else {
      jumpBtn.style.display = 'block';
  }
}

function buildDateMapForFiltered() {
  dateImageMap.clear();
  filtered.forEach((rec, index) => {
      const dateKey = rec.date.slice(0, 10);
      if (!dateImageMap.has(dateKey)) {
          dateImageMap.set(dateKey, []);
      }
      dateImageMap.get(dateKey).push(index);
  });
}

// Остальные функции (openBox, shareBtn, lb и т.д.) остаются без изменений
function openBox(i) {
  console.log(`Открытие лайтбокса для элемента ${i}`);
  idx = i;
  const rec = filtered[idx];

  // ставим хэш
  history.replaceState(null, null, '#' + rec.id);

  document.getElementById('lb-img').src = FULL_URL + rec.file;
  document.getElementById('lb-caption').textContent = rec.caption + ' (' + rec.date.slice(0,10) + ')';
  document.getElementById('lightbox').classList.remove('hidden');
  
  // Блокируем скролл страницы
  document.body.classList.add('no-scroll');
  
  // Сброс позиций касания
  touchStartX = 0;
  touchEndX = 0;
  isSwiping = false;
}

// Добавляем обработчики свайпов
document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  
  // Обработка начала касания
  lightbox.addEventListener('touchstart', (e) => {
    // Запоминаем начальную позицию только если касаемся изображения
    if (e.target === lbImg || e.target.closest('#lb-prev') || e.target.closest('#lb-next')) {
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    } else {
      // Если касаемся фона, кнопок или подписи - разрешаем закрытие
      isSwiping = false;
    }
  }, { passive: true });
  
  // Обработка движения касания
  lightbox.addEventListener('touchmove', (e) => {
    if (!isSwiping || !touchStartX) return;
    
    // Можно добавить визуальный эффект при свайпе
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    
    // Небольшое смещение изображения для обратной связи
    if (Math.abs(diff) > 10) {
      lbImg.style.transform = `translateX(${diff * 0.5}px)`;
    }
  }, { passive: true });
  
  // Обработка окончания касания (свайп)
  lightbox.addEventListener('touchend', (e) => {
    if (!isSwiping || !touchStartX || lightbox.classList.contains('hidden')) return;
    
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
    
    // Сброс трансформации
    lbImg.style.transform = '';
    
    // Сброс для следующего касания
    touchStartX = 0;
    touchEndX = 0;
    isSwiping = false;
  }, { passive: true });
});

// Функция обработки свайпа
function handleSwipe() {
  if (!touchStartX || !touchEndX) return;
  
  const diffX = touchStartX - touchEndX;
  
  // Если свайп достаточно большой
  if (Math.abs(diffX) > SWIPE_THRESHOLD) {
    if (diffX > 0) {
      // Свайп влево - следующий
      console.log('Свайп влево - следующий');
      idx = (idx + 1) % filtered.length;
      openBox(idx);
    } else {
      // Свайп вправо - предыдущий
      console.log('Свайп вправо - предыдущий');
      idx = (idx - 1 + filtered.length) % filtered.length;
      openBox(idx);
    }
  }
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
  // Восстанавливаем скролл
  document.body.classList.remove('no-scroll');
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
      document.body.classList.remove('no-scroll');
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
