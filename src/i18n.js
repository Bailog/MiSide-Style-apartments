// Interface texts in Russian and English, and the content of the "Development" window.

const STRINGS = {
  ru: {
    pageTitle: 'MiSide-квартира',
    title: 'Квартира в стиле <span>MiSide</span>',
    subtitle: 'Ночная прогулка по квартире: кухня-гостиная, холл и уголок с компьютером.',
    loading: 'Загрузка…',
    enter: 'Войти',
    continue: 'Продолжить',
    keyMove: 'идти (или стрелки)',
    keyMouse: 'Мышь',
    keyLook: 'осмотреться',
    keyPause: 'пауза',
    keyQuality: 'качество графики',
    qLow: 'Низкое', qMedium: 'Среднее', qHigh: 'Высокое',
    qName: { low: 'низкое', medium: 'среднее', high: 'высокое' },
    qualityToast: 'Качество: {q}',
    qualityAuto: 'Качество: {q} (G — изменить)',
    dev: 'Разработка',
    close: 'Закрыть',
  },
  en: {
    pageTitle: 'MiSide apartment',
    title: '<span>MiSide</span>-style apartment',
    subtitle: 'A night walk through the apartment: the kitchen-living room, the hall and the computer corner.',
    loading: 'Loading…',
    enter: 'Enter',
    continue: 'Continue',
    keyMove: 'walk (or arrow keys)',
    keyMouse: 'Mouse',
    keyLook: 'look around',
    keyPause: 'pause',
    keyQuality: 'graphics quality',
    qLow: 'Low', qMedium: 'Medium', qHigh: 'High',
    qName: { low: 'low', medium: 'medium', high: 'high' },
    qualityToast: 'Quality: {q}',
    qualityAuto: 'Quality: {q} (G to change)',
    dev: 'Development',
    close: 'Close',
  },
};

const PHOTOS = ['Photo_1', 'Photo_2', 'Photo_3', 'Photo_4', 'Photo_5', 'Photo_6', 'Photo2_1', 'Photo2_2', 'Photo2_4', 'Photo2_5'];
const SCREENSHOTS = ['Screenshot_1', 'Screenshot_2', 'Screenshot_3', 'Screenshot_4'];

const PROMPT = {
  ru: `Необходимо создать веб страницу на которой будет в 3d графике изображена комната, созданная по фотографиям в стиле аниме. Приоритет поддержки браузеров - Firefox. Библиотека Three.js, если понадобится что-то еще, то скажи предварительно.
Входные данные:
6 фотографий (папка photo), каждое фото пронумеровано в верхнем левом углу изображения. Все фото сделаны на высоте 1,9 метров.
Схема (папка scheme), на схеме, в виде сверху размечена квартира. Также там указаны точки с конусом, определяющим направление созданного фото и номер снимка, к которому относится точка.
Скриншоты из MiSide (папка screenshots). Именно такой стиль графики и освещения необходимо сделать. Обрати внимание на скриншот со звездами на стене, такие же стены нужны на моей модели стен, так же как и освещение.
Постарайся сделать детальную лоу поли (как на скриншотах MiSide, реалистичный полигонаж не нужен), хорошо поработай над текстурами и освещением. Старайся сделать ключевые объекты (столы, компьютер, телевизор, холодильник, стул, картины и прочее), мелкие (кружка, чайник, кухонные приборы) не нужны, исключения - клавиатура и мышь.
По комнате можно шагом перемещаться в режиме первого лица. Добавь простую лоу-поли коллизию.
Если есть вопросы по архитектуре и метрике (если есть что-то важное или опциональное, что необходимо замерить), то лучше их обсудить перед разработкой.`,
  en: `Create a web page showing a room in 3D graphics, built from photos, in anime style. Browser priority: Firefox. Library: Three.js; if anything else is needed, tell me beforehand.
Input data:
6 photos (the photo folder), each numbered in its top-left corner. All photos were taken at a height of 1.9 meters.
A floor plan (the scheme folder): a top-down layout of the apartment. It also shows points with cones that indicate the direction of each photo, and the number of the shot each point belongs to.
Screenshots from MiSide (the screenshots folder). This is exactly the graphics and lighting style I need. Pay attention to the screenshot with stars on the wall: I want the same walls in my model, and the same lighting.
Try to make detailed low poly (like the MiSide screenshots, no realistic polycount needed), and put real work into textures and lighting. Try to model the key objects (tables, computer, TV, fridge, chair, paintings and so on); small ones (mug, kettle, kitchen appliances) aren't needed, except for the keyboard and mouse.
You should be able to walk around the room at a walking pace in first-person mode. Add simple low-poly collision.
If you have questions about the layout or measurements (anything important or optional that needs measuring), it's better to discuss them before development.`,
};

const DEV = {
  ru: [
    { title: 'Этап 1. Сбор данных', text: 'Я сделал несколько снимков квартиры и пронумеровал их (это понадобится в дальнейшем). Так же на них отметил ключевые высоты стен и прочих ключевых объектов.', images: PHOTOS },
    { title: 'Этап 2. Простой чертёж', text: 'Накидал в Figma совсем простецкую схему, на которой я отметил места съемки с углом обзора в виде конуса и соответствующий изображению номер. Все не успел замерить (за что меня собственно и покарала колонна на потолке), поэтому для первой итерации обошелся ключевыми метражами.', scheme: true },
    { title: 'Этап 3. Скриншоты', text: 'Первые попавшиеся в гугле скриншоты из MiSide, но поскольку я захотел звездное небо как в квартире сонной Миты, то я включил дополнительный скрин оттуда, на всякий.', images: SCREENSHOTS },
    { title: 'Этап 4. Промпт', text: 'Для первой итерации я подготовил следующий промпт: Жахни мне хату как царь в стиле аниме, не делай ошибок. Ладно, шутка, вот настоящий:', prompt: true },
  ],
  en: [
    { title: 'Stage 1. Collecting data', text: 'I took a few photos of the apartment and numbered them (that will come in handy later). I also marked the key heights of the walls and other important objects on them.', images: PHOTOS },
    { title: 'Stage 2. A simple floor plan', text: 'I threw together a very basic plan in Figma, marking each spot a photo was taken from, with its field of view drawn as a cone and the matching photo number. I didn\'t get around to measuring everything (which the ceiling beam made me pay for), so for the first iteration I made do with the key dimensions.', scheme: true },
    { title: 'Stage 3. Screenshots', text: 'The first MiSide screenshots Google turned up. Since I wanted a starry sky like in sleepy Mita\'s apartment, I added an extra shot from there, just in case.', images: SCREENSHOTS },
    { title: 'Stage 4. The prompt', text: 'For the first iteration I prepared this prompt: "Build me a crib fit for a king, anime style, and make no mistakes." Okay, just kidding, here is the real one:', prompt: true },
  ],
};

let lang = 'ru';

export function getLang() { return lang; }

export function t(key, vars = {}) {
  let s = STRINGS[lang][key] ?? STRINGS.ru[key] ?? key;
  if (typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

export function initLang() {
  let saved = null;
  try { saved = localStorage.getItem('miside.lang'); } catch { /* storage may be blocked */ }
  const browser = navigator.languages?.length ? navigator.languages : [navigator.language || 'ru'];
  lang = saved === 'en' || saved === 'ru' ? saved : browser.some((l) => /^(ru|uk|be|kk)\b/i.test(l)) ? 'ru' : 'en';
  return lang;
}

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('miside.lang', l); } catch { /* ignore */ }
}

// Fills every [data-i18n] element (innerHTML for keys whose text contains markup).
export function applyTexts(root = document) {
  document.documentElement.lang = lang;
  document.title = t('pageTitle');
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (v.includes('<')) el.innerHTML = v; else el.textContent = v;
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  root.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
}

// Builds the content of the "Development" window in the current language.
export function renderDev(body) {
  body.replaceChildren();
  for (const sec of DEV[lang]) {
    const s = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = sec.title;
    const p = document.createElement('p');
    p.textContent = sec.text;
    s.append(h, p);
    if (sec.images) {
      const grid = document.createElement('div');
      grid.className = 'thumbs';
      for (const name of sec.images) {
        const img = document.createElement('img');
        img.src = `preview/${name}.jpg`;
        img.alt = name;
        img.loading = 'lazy';
        img.draggable = false;
        grid.append(img);
      }
      s.append(grid);
    }
    if (sec.scheme) {
      const img = document.createElement('img');
      img.src = 'scheme/Scheme.png';
      img.alt = 'Scheme';
      img.className = 'scheme';
      img.draggable = false;
      s.append(img);
    }
    if (sec.prompt) {
      const pre = document.createElement('pre');
      pre.className = 'prompt';
      pre.textContent = PROMPT[lang];
      s.append(pre);
    }
    body.append(s);
  }
}
