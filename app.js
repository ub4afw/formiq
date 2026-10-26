/* ============================================================
   formiq — основной скрипт
   Порядок блоков:
     1. ДАННЫЕ (товары, коэффициенты калькулятора, модель)
     2. КАТАЛОГ
     3. КАЛЬКУЛЯТОР
     4. UI (шапка, бургер, модалка, формы)
     5. 3D-СЦЕНА (Three.js)
   ============================================================ */

/* ============================================================
   1. ДАННЫЕ — всё, что нужно редактировать, лежит здесь
   ============================================================ */

// ---- Товары каталога ----
// price — базовая цена, gradient — фон карточки, icon — SVG-иконка (ключик/лодка/машина/табличка)
const PRODUCTS = [
  { id: 1, name: 'Классический брелок',   category: 'figure', price: 190, gradient: ['#1d2b1d', '#0f1a0f'], icon: 'key' },
  { id: 2, name: 'Именной брелок',        category: 'name',   price: 240, gradient: ['#1d2230', '#10131c'], icon: 'tag' },
  { id: 3, name: 'Мини-машина',           category: 'car',    price: 320, gradient: ['#2b2418', '#19130c'], icon: 'car' },
  { id: 4, name: 'Гоночная тачка',        category: 'car',    price: 350, gradient: ['#2b1a1a', '#180f0f'], icon: 'car' },
  { id: 5, name: 'Логотип компании',      category: 'logo',   price: 290, gradient: ['#18252b', '#0e161a'], icon: 'tag' },
  { id: 6, name: 'Брелок-животное',       category: 'figure', price: 260, gradient: ['#242018', '#14110c'], icon: 'key' },
  { id: 7, name: 'Табличка с ником',      category: 'name',   price: 220, gradient: ['#1f1d2b', '#12101c'], icon: 'tag' },
  { id: 8, name: 'Мини-Benchy (лодка)',   category: 'figure', price: 300, gradient: ['#182627', '#0e1718'], icon: 'boat' },
];

const CATEGORY_LABELS = { figure: 'Фигурки', name: 'Именные', car: 'Мини-кары', logo: 'Под логотип' };

// SVG-иконки для карточек (плейсхолдеры вместо фото)
const CARD_ICONS = {
  key:  '<svg viewBox="0 0 64 64" fill="none" stroke="#c6ff00" stroke-width="3" stroke-linecap="round"><circle cx="22" cy="22" r="12"/><path d="M31 31 L52 52 M46 52 l6 -6 M40 46 l6 -6"/></svg>',
  tag:  '<svg viewBox="0 0 64 64" fill="none" stroke="#c6ff00" stroke-width="3" stroke-linejoin="round"><path d="M10 26 L30 10 h24 v24 L34 50 Z"/><circle cx="44" cy="20" r="4"/></svg>',
  car:  '<svg viewBox="0 0 64 64" fill="none" stroke="#c6ff00" stroke-width="3" stroke-linejoin="round"><path d="M8 40 h48 v-10 l-8 -10 H22 L14 30 H8 Z"/><circle cx="20" cy="46" r="5"/><circle cx="46" cy="46" r="5"/></svg>',
  boat: '<svg viewBox="0 0 64 64" fill="none" stroke="#c6ff00" stroke-width="3" stroke-linejoin="round"><path d="M8 38 h48 l-6 14 H14 Z"/><rect x="24" y="20" width="16" height="14" rx="2"/><rect x="40" y="10" width="6" height="12" rx="2"/></svg>',
};

// ---- Коэффициенты калькулятора ----
const CALC = {
  // Базовая цена по типу брелка
  type: {
    classic: { label: 'Классический',        price: 190 },
    figure:  { label: 'Фигурка (своя форма)', price: 260 },
    name:    { label: 'Именной',              price: 240 },
    logo:    { label: 'Под логотип',          price: 290 },
  },
  // Множитель размера
  size: { S: 0.8, M: 1, L: 1.35 },
  // Множитель материала (только PLA и PETG)
  material: { PLA: 1, PETG: 1.15 },
  // Скидки за количество (проверяются сверху вниз)
  qty: [
    { min: 50, k: 0.70, label: 'Скидка от 50 шт: −30%' },
    { min: 10, k: 0.88, label: 'Скидка от 10 шт: −12%' },
  ],
  // Допы — фиксированная надбавка за штуку
  options: {
    engrave: { label: 'Гравировка',            add: 60 },
    text2:   { label: 'Текст с двух сторон',   add: 80 },
    paint:   { label: 'Ручная раскраска',      add: 120 },
  },
  // Срочность — множитель на весь заказ
  urgency: {
    standard: { label: '3–5 дней', k: 1 },
    express:  { label: '24 часа',   k: 1.5 },
  },
};

// ---- 3D-модель ----
// Локальный файл 3DBenchy.glb лежит рядом с index.html.
// ВАЖНО: если открыть сайт двойным кликом (file://), Chrome/Edge заблокируют
// загрузку .glb по CORS — тогда включится процедурная лодка/CSS-заглушка.
// Для загрузки Benchy запусти локальный сервер в папке проекта:
//   py -m http.server 8000   (или: python -m http.server 8000)
// и открой http://localhost:8000
// Можно указать внешнюю ссылку (с CORS), например 'https://.../3DBenchy.glb'.
const MODEL_URL = '3DBenchy.glb';

/* ============================================================
   2. КАТАЛОГ
   ============================================================ */

const catalogGrid = document.getElementById('catalog-grid');
const filters = document.getElementById('filters');

// Иконка-плейсхолдер товара: градиент + SVG + подпись категории
function renderProducts(category = 'all') {
  const list = category === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === category);

  catalogGrid.innerHTML = list.map(p => `
    <article class="card reveal">
      <div class="card__image" style="background: linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})">
        ${CARD_ICONS[p.icon]}
        <span class="card__category">${CATEGORY_LABELS[p.category]}</span>
      </div>
      <div class="card__body">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__price">${p.price} ₽</p>
        <button class="card__btn" data-product="${p.name}">Заказать</button>
      </div>
    </article>
  `).join('');

  observeReveals();
}

// Кнопки фильтров
filters.addEventListener('click', e => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  filters.querySelector('.active')?.classList.remove('active');
  btn.classList.add('active');
  renderProducts(btn.dataset.category);
});

// Кнопка «Заказать» → открыть модалку
catalogGrid.addEventListener('click', e => {
  const btn = e.target.closest('[data-product]');
  if (btn) openOrderModal(btn.dataset.product);
});

/* ============================================================
   3. КАЛЬКУЛЯТОР
   ============================================================ */

const calcState = {
  type: 'classic',
  size: 'M',
  material: 'PLA',
  qty: 10,
  options: new Set(),
  urgency: 'standard',
};

const calcType = document.getElementById('calc-type');
const calcQty = document.getElementById('calc-qty');
const calcTotal = document.getElementById('calc-total');
const calcPerUnit = document.getElementById('calc-per-unit');
const calcBreakdown = document.getElementById('calc-breakdown');

// Заполняем select типами из CALC.type
calcType.innerHTML = Object.entries(CALC.type)
  .map(([key, t]) => `<option value="${key}">${t.label} — ${t.price} ₽</option>`)
  .join('');

// Сегментированные кнопки (размер / материал / срочность)
function bindSegmented(id, stateKey, parser = v => v) {
  document.getElementById(id).addEventListener('click', e => {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    e.currentTarget.querySelector('.active')?.classList.remove('active');
    btn.classList.add('active');
    calcState[stateKey] = parser(btn.dataset.value);
    updatePrice();
  });
}

bindSegmented('calc-size', 'size');
bindSegmented('calc-material', 'material');
bindSegmented('calc-urgency', 'urgency');

calcType.addEventListener('change', () => { calcState.type = calcType.value; updatePrice(); });

calcQty.addEventListener('input', () => {
  calcState.qty = Math.max(1, parseInt(calcQty.value) || 1);
  updatePrice();
});

document.getElementById('calc-options').addEventListener('change', e => {
  const key = e.target.dataset.option;
  e.target.checked ? calcState.options.add(key) : calcState.options.delete(key);
  updatePrice();
});

// Расчёт цены: (база × размер × материал × кол-во-скидка + допы) × срочность
function calcPrice() {
  const base = CALC.type[calcState.type].price;
  const sizeK = CALC.size[calcState.size];
  const matK = CALC.material[calcState.material];

  const qtyRule = CALC.qty.find(r => calcState.qty >= r.min);
  const qtyK = qtyRule ? qtyRule.k : 1;

  const optionsSum = [...calcState.options]
    .reduce((sum, key) => sum + CALC.options[key].add, 0);

  const urgencyK = CALC.urgency[calcState.urgency].k;

  const unit = Math.round((base * sizeK * matK * qtyK + optionsSum) * urgencyK);
  const total = unit * calcState.qty;

  return { unit, total, qtyRule, optionsSum };
}

// Анимация смены цифры (count-up)
function animateNumber(element, from, to) {
  const duration = 350;
  const start = performance.now();

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    element.textContent = Math.round(from + (to - from) * eased).toLocaleString('ru-RU');
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

let lastTotal = 0;

function updatePrice() {
  const { unit, total, qtyRule, optionsSum } = calcPrice();

  animateNumber(calcTotal, lastTotal, total);
  lastTotal = total;
  calcPerUnit.textContent = unit.toLocaleString('ru-RU');

  // Подпись под контролами + разбивка в карточке итога
  document.getElementById('qty-hint').textContent = qtyRule
    ? qtyRule.label
    : 'Скидка появится от 10 штук';

  const rows = [
    `Размер ${calcState.size} · ${calcState.material}`,
    `Срочность: ${CALC.urgency[calcState.urgency].label}`,
    optionsSum ? `Персонализация: +${optionsSum} ₽/шт` : 'Без персонализации',
  ];
  calcBreakdown.innerHTML = rows.map(r => `<span>${r}</span>`).join('');
}

/* ============================================================
   4. UI: шапка, бургер, модалка, формы, анимации появления
   ============================================================ */

const header = document.getElementById('header');
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

// Фон шапки при скролле
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Бургер-меню
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});

// Закрыть мобильное меню при клике на ссылку
nav.addEventListener('click', e => {
  if (e.target.matches('.nav__link')) {
    nav.classList.remove('open');
    burger.classList.remove('open');
  }
});

// ---- Модалка заказа ----
const modal = document.getElementById('order-modal');
const orderProduct = document.getElementById('order-product');
const orderFormView = document.getElementById('order-form-view');
const orderSuccessView = document.getElementById('order-success-view');

function openOrderModal(productName) {
  orderProduct.textContent = productName;
  orderFormView.classList.remove('hidden');
  orderSuccessView.classList.add('hidden');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

modal.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeOrderModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeOrderModal();
});

document.getElementById('order-form').addEventListener('submit', e => {
  e.preventDefault();
  orderFormView.classList.add('hidden');
  orderSuccessView.classList.remove('hidden');
});

// ---- Форма контактов + уведомление ----
const toast = document.getElementById('toast');

document.getElementById('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  e.target.reset();
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
});

// ---- Плавное появление блоков при скролле ----
let revealObserver;

function observeReveals() {
  revealObserver ??= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}

// Размечаем статические блоки для анимации появления
document.querySelectorAll(
  '.hero__content, .section__title, .section__subtitle, .filters, .calc, .contacts'
).forEach(el => el.classList.add('reveal'));

/* ============================================================
   5. 3D-СЦЕНА: Benchy / лодка из примитивов
   ============================================================ */

function initThreeScene() {
  const canvas = document.getElementById('three-canvas');
  const container = document.getElementById('hero-3d');
  const fallback = document.getElementById('model-fallback');

  // Если WebGL недоступен — сразу CSS-заглушка
  if (!window.THREE || !canvas.getContext('webgl') && !canvas.getContext('experimental-webgl')) {
    canvas.classList.add('hidden');
    fallback.classList.remove('hidden');
    return;
  }

  // Мобильные устройства: дешевле рендер (без сглаживания, пиксель-рэйт 1.25)
  const isMobile = window.matchMedia('(max-width: 700px)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1, 8);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));

  // --- Свет: тёмная сцена + акцентный лайм ---
  scene.add(new THREE.AmbientLight(0x404048, 0.9));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const accentLight = new THREE.PointLight(0xc6ff00, 1.6, 30); // акцентный источник
  accentLight.position.set(-4, 2, 3);
  scene.add(accentLight);

  const rimLight = new THREE.PointLight(0x88aaff, 0.5, 30); // холодный контровой
  rimLight.position.set(3, -2, -4);
  if (!isMobile) scene.add(rimLight); // на мобильных экономим на одном источнике света

  // Группа, которую мы вращаем (модель + параллакс)
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // --- Процедурная «Benchy-подобная» лодка (фолбэк, если .glb не загрузился) ---
  function createBoat() {
    const plastic = new THREE.MeshStandardMaterial({ color: 0xd7d7d2, roughness: 0.45, metalness: 0.05 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xc6ff00, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });

    const boat = new THREE.Group();

    // Корпус: слегка сужающийся бокс
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.6), plastic);
    hull.position.y = -0.3;
    boat.add(hull);

    // Нос (клин)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 4), plastic);
    nose.rotation.z = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(2.1, -0.3, 0);
    boat.add(nose);

    // Корма
    const stern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 1.6), plastic);
    stern.position.set(-1.7, -0.3, 0);
    boat.add(stern);

    // Каюта
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.3), plastic);
    cabin.position.set(-0.3, 0.65, 0);
    boat.add(cabin);

    // Иллюминаторы — акцентные «окна»
    [-0.35, 0.35].forEach(z => {
      const window1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), accent);
      window1.rotation.x = Math.PI / 2;
      window1.position.set(0.15, 0.7, z > 0 ? 0.68 : -0.68);
      boat.add(window1);
    });

    // Труба
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 20), plastic);
    chimney.position.set(0.45, 1.55, 0);
    boat.add(chimney);

    // Труба — акцентный верх
    const chimneyTop = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 20), accent);
    chimneyTop.position.set(0.45, 2.0, 0);
    boat.add(chimneyTop);

    // Два «люка» на палубе спереди
    [-0.45, 0.45].forEach(z => {
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 20), dark);
      hatch.position.set(1.3, 0.2, z);
      boat.add(hatch);
    });

    boat.position.y = -0.5;
    boat.scale.setScalar(1.25); // крупная процедурная лодка
    return boat;
  }

  // --- Загрузка 3DBenchy.glb ---
  function tryLoadGlb(url) {
    const loader = new THREE.GLTFLoader();
    loader.load(
      url,
      gltf => {
        const model = gltf.scene;

        // Нормализуем размер модели под сцену — Benchy занимает почти весь кадр
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()).length();
        const scale = 4.8 / size;
        model.scale.setScalar(scale);

        const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
        model.position.sub(center);

        modelGroup.add(model);
      },
      undefined,
      error => {
        // Ошибка загрузки (например, CORS при открытии через file://):
        // сайт не ломается — показываем процедурную лодку вместо Benchy
        console.warn('Не удалось загрузить .glb, ставим процедурную лодку:', error);
        modelGroup.add(createBoat());
      }
    );
  }

  if (MODEL_URL) {
    tryLoadGlb(MODEL_URL);
  } else {
    modelGroup.add(createBoat());
  }

  // --- Параллакс по движению мыши ---
  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // --- Resize ---
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Анимация: вращение + лёгкое покачивание + параллакс ---
  const clock = new THREE.Clock();
  let elapsed = 0;

  // Оптимизация: рендерим только когда hero виден на экране
  let sceneVisible = true;
  new IntersectionObserver(([entry]) => {
    sceneVisible = entry.isIntersecting;
  }, { threshold: 0.05 }).observe(container);

  function animate() {
    requestAnimationFrame(animate);
    if (!sceneVisible) return; // экран прокрутили дальше — кадр не рисуем

    // clamp, чтобы после паузы не было скачка анимации
    elapsed += Math.min(clock.getDelta(), 0.05);
    const t = elapsed;

    // Медленное вращение модели
    modelGroup.rotation.y += 0.005;

    // Сглаженный параллакс (модель слегка наклоняется за мышью)
    currentX += (mouseY * 0.15 - currentX) * 0.05;
    currentY += (mouseX * 0.25 - currentY) * 0.05;
    modelGroup.rotation.x = currentX + Math.sin(t * 0.8) * 0.03;
    modelGroup.rotation.z = currentY * 0.1;

    // Покачивание вверх-вниз
    modelGroup.position.y = Math.sin(t * 1.2) * 0.15;

    // Пульсация акцентного света
    accentLight.intensity = 1.4 + Math.sin(t * 2) * 0.3;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   СТАРТ
   ============================================================ */

renderProducts();
updatePrice();
observeReveals();
initThreeScene();
