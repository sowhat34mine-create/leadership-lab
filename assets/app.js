/* ==========================================================================
   Лидерство — интерактивный курс
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
    }
  };

  const toastEl = $("#toast");
  let toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  }

  /* ---------- Тема ---------- */
  const root = document.documentElement;
  const savedTheme = store.get("leadership-theme", null);
  if (savedTheme === "light" || savedTheme === "dark") root.setAttribute("data-theme", savedTheme);

  $("#themeToggle")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    store.set("leadership-theme", next);
    toast(next === "light" ? "Светлая тема" : "Тёмная тема");
  });

  /* ---------- Скролл ---------- */
  const header = $(".site-header");
  const scrollBar = $("#scrollBar");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (scrollBar) scrollBar.style.width = pct + "%";
    header?.classList.toggle("is-stuck", h.scrollTop > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal ---------- */
  /* Показ секций при прокрутке. IntersectionObserver — основной путь,
     но рядом с ним работает запасной вариант по событию scroll:
     если observer не сработает (редкие окружения, headless, отключённый IO),
     контент всё равно будет показан, а не останется невидимым. */
  const revealEls = $$(".reveal");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealNow(el) {
    el.classList.add("is-visible");
  }

  if (reducedMotion) {
    revealEls.forEach(revealNow);
  } else {
    const pending = new Set(revealEls);

    const fallbackCheck = () => {
      pending.forEach((el) => {
        if (!el.isConnected) { pending.delete(el); return; }
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          revealNow(el);
          pending.delete(el);
        }
      });
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealNow(entry.target);
            pending.delete(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach(revealNow);
    }

    window.addEventListener("scroll", fallbackCheck, { passive: true });
    window.addEventListener("resize", fallbackCheck, { passive: true });
    window.addEventListener("load", fallbackCheck);
    fallbackCheck();
  }

  /* ======================================================================
     ПРЕЗЕНТАЦИЯ
     ====================================================================== */
  const deck = $("#deck");
  const slides = $$(".slide", deck);
  const dotsWrap = $("#deckDots");
  const deckCounter = $("#deckCounter");
  const deckBar = $("#deckBar");
  const speakerNotes = $("#speakerNotes");
  const notesTitle = $("#notesTitle");
  const notesText = $("#notesText");
  let slideIndex = 0;
  let deckOpen = false;

  slides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "deck-dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", `Слайд ${i + 1}: ${slide.dataset.title || ""}`);
    dot.addEventListener("click", () => showSlide(i));
    dotsWrap.appendChild(dot);
  });
  const dots = $$(".deck-dot", dotsWrap);

  function updateNotes() {
    const slide = slides[slideIndex];
    notesTitle.textContent = slide.dataset.title || "";
    notesText.textContent = slide.dataset.notes || "Заметок для этого слайда нет.";
  }

  function showSlide(i, focus = false) {
    slideIndex = clamp(i, 0, slides.length - 1);
    slides.forEach((slide, k) => {
      slide.classList.toggle("is-active", k === slideIndex);
      slide.setAttribute("aria-hidden", k === slideIndex ? "false" : "true");
    });
    dots.forEach((dot, k) => dot.classList.toggle("is-active", k === slideIndex));
    deckCounter.textContent = `${String(slideIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    deckBar.style.width = `${((slideIndex + 1) / slides.length) * 100}%`;
    updateNotes();
    if (focus) dots[slideIndex]?.focus({ preventScroll: true });
    slides[slideIndex].scrollTop = 0;
  }

  function openDeck(start = 0) {
    deck.classList.add("is-open");
    deck.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    deckOpen = true;
    showSlide(start);
    setTimeout(() => $("#deckClose")?.focus({ preventScroll: true }), 50);
  }

  function closeDeck() {
    deck.classList.remove("is-open");
    deck.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    deckOpen = false;
    speakerNotes.classList.remove("is-open");
    $("#deckNotesBtn")?.classList.remove("is-on");
  }

  $$("[data-open-deck]").forEach((btn) => {
    btn.addEventListener("click", () => openDeck(0));
  });
  $("#deckClose")?.addEventListener("click", closeDeck);
  $("#deckPrev")?.addEventListener("click", () => showSlide(slideIndex - 1));
  $("#deckNext")?.addEventListener("click", () => showSlide(slideIndex + 1));

  $("#deckNotesBtn")?.addEventListener("click", () => {
    const open = speakerNotes.classList.toggle("is-open");
    speakerNotes.setAttribute("aria-hidden", open ? "false" : "true");
    $("#deckNotesBtn").classList.toggle("is-on", open);
    updateNotes();
  });
  $("#notesClose")?.addEventListener("click", () => {
    speakerNotes.classList.remove("is-open");
    speakerNotes.setAttribute("aria-hidden", "true");
    $("#deckNotesBtn")?.classList.remove("is-on");
  });

  function printDeck() {
    if (!deckOpen) openDeck(0);
    setTimeout(() => window.print(), 350);
  }
  $("#deckPrintBtn")?.addEventListener("click", printDeck);
  $("#printDeck")?.addEventListener("click", printDeck);

  document.addEventListener("keydown", (e) => {
    if (!deckOpen) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "Escape") { e.preventDefault(); closeDeck(); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); showSlide(slideIndex + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); showSlide(slideIndex - 1); }
    if (e.key === "Home") { e.preventDefault(); showSlide(0); }
    if (e.key === "End") { e.preventDefault(); showSlide(slides.length - 1); }
    if (e.key.toLowerCase() === "n") { e.preventDefault(); $("#deckNotesBtn")?.click(); }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      if (!document.fullscreenElement) deck.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.();
    }
  });

  // Свайпы на мобильных
  let touchStartX = null;
  $("#deckStage")?.addEventListener("pointerdown", (e) => { touchStartX = e.clientX; });
  $("#deckStage")?.addEventListener("pointerup", (e) => {
    if (touchStartX === null) return;
    const dx = e.clientX - touchStartX;
    if (Math.abs(dx) > 60) showSlide(slideIndex + (dx < 0 ? 1 : -1));
    touchStartX = null;
  });

  showSlide(0);

  /* ======================================================================
     МОДЕЛЬ КОММУНИКАЦИИ
     ====================================================================== */
  const modelData = {
    sender: {
      kicker: "Шаг 1 · Отправитель",
      title: "Сначала цель, потом слова",
      text: "У любого сообщения есть намерение: информировать, попросить, убедить, поддержать. Пока цель не сформулирована, получатель будет додумывать её сам — обычно не в вашу пользу. Один разговор — одна цель."
    },
    encode: {
      kicker: "Шаг 2 · Кодирование",
      title: "Смысл становится словами",
      text: "Вы выбираете слова, интонацию, структуру и канал. Оценки («безответственно») вызывают защиту, факты («срок сдвинулся на два дня») — разговор. Конкретика снижает уровень шума ещё до отправки."
    },
    channel: {
      kicker: "Шаг 3 · Канал",
      title: "Канал задаёт правила игры",
      text: "Сложное и эмоциональное — синхронно, лицом к лицу. Факты и договорённости — письменно. Чат хорош для координации, но плох для конфликтов: интонация в нём теряется, а догадки усиливаются."
    },
    decode: {
      kicker: "Шаг 4 · Декодирование",
      title: "Получатель слышит свой опыт",
      text: "На восприятие влияют усталость, статус, прошлые обиды и ожидания. Поэтому «я же сказал» не работает. Работает проверка: «Что ты услышал? Что для тебя здесь главное?»"
    },
    receiver: {
      kicker: "Шаг 5 · Получатель",
      title: "Смысл подтверждается реакцией",
      text: "Кивок не равен пониманию. Настоящая обратная связь — это вопрос, пересказ, встречное предложение или действие. Если реакции нет, коммуникация не завершена, даже если вы всё сказали."
    }
  };

  const nodes = $$(".model-node");
  const modelDetail = $("#modelDetail");
  function selectNode(key) {
    const data = modelData[key];
    if (!data || !modelDetail) return;
    nodes.forEach((n) => n.classList.toggle("is-active", n.dataset.node === key));
    modelDetail.innerHTML = `<span class="detail-kicker">${data.kicker}</span><h3>${data.title}</h3><p>${data.text}</p>`;
  }
  nodes.forEach((node) => node.addEventListener("click", () => selectNode(node.dataset.node)));

  /* ======================================================================
     ЭТАПЫ КОМАНДЫ
     ====================================================================== */
  const stages = [
    {
      badge: "Стадия 1 · Forming",
      title: "Формирование",
      summary: "Команда только собралась: люди вежливы, осторожны и ориентируются на лидера. Каждый проверяет, безопасно ли здесь задавать вопросы и ошибаться.",
      state: "Тревога, зависимость, мало инициативы.",
      task: "Дать ясность: цель, роли, правила, критерии успеха.",
      comm: "Структурированные встречи, знакомство, явные договорённости.",
      risk: "Ложное согласие: все кивают, но никто не понимает, что делать.",
      tool: "Одностраничник цели + карта ролей."
    },
    {
      badge: "Стадия 2 · Storming",
      title: "Шторм",
      summary: "Появляются настоящие позиции: борьба за влияние, споры о подходах, проверка границ. Это не токсичность, а необходимая стадия взросления команды.",
      state: "Конфликты, фрустрация, поляризация.",
      task: "Легитимизировать разногласия и задать правила диалога.",
      comm: "Фасилитация, правила спора, разговор о интересах, а не о позициях.",
      risk: "Лидер гасит конфликт давлением — команда застревает здесь надолго.",
      tool: "Правила диалога + разбор по фактам, а не по личностям."
    },
    {
      badge: "Стадия 3 · Norming",
      title: "Нормирование",
      summary: "Появляются рабочие договорённости и доверие. Люди начинают говорить «мы», а не «я», и уже могут обсуждать ошибки без атаки.",
      state: "Согласие, принадлежность, рост предсказуемости.",
      task: "Закрепить нормы и не подменить их удобством.",
      comm: "Регулярная обратная связь, ретроспективы, совместные решения.",
      risk: "Групповое мышление: неудобную правду больше никто не говорит.",
      tool: "Ретро раз в две недели + SBI-обратная связь."
    },
    {
      badge: "Стадия 4 · Performing",
      title: "Результат",
      summary: "Команда работает автономно и на высоком уровне. Люди сами распределяют задачи, решают конфликты и держат планку качества.",
      state: "Высокая продуктивность, самоуправление.",
      task: "Не мешать, защищать фокус и развивать людей.",
      comm: "Делегирование результата, признание вклада, стратегические сверки.",
      risk: "Микроменеджмент лидера разрушает автономию быстрее, чем кризис.",
      tool: "Делегирование по результату + индивидуальные планы развития."
    },
    {
      badge: "Стадия 5 · Adjourning",
      title: "Завершение",
      summary: "Проект или состав команды завершается. Без рефлексии и признания вклада люди уходят с ощущением незавершённости — и забирают это ощущение в следующий проект.",
      state: "Смешанные чувства, потеря фокуса, прощание.",
      task: "Закрыть смысл: рефлексия, признание, передача знаний.",
      comm: "Итоговая встреча, обратная связь, благодарность по именам.",
      risk: "Тихий распад: никто не подвёл итог, опыт не зафиксирован.",
      tool: "Ретро-сессия «что забираю с собой» + база знаний."
    }
  ];

  const stagePanel = $("#stagePanel");
  const stageTabs = $$(".stage-tab");
  const trackFill = $("#stageTrackFill");
  function renderStage(i) {
    const s = stages[i];
    if (!s) return;
    stageTabs.forEach((t, k) => {
      t.classList.toggle("is-active", k === i);
      t.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    if (trackFill) trackFill.style.width = `${((i + 1) / stages.length) * 100}%`;
    stagePanel.innerHTML = `
      <div class="stage-main">
        <span class="stage-badge">${s.badge}</span>
        <h3>${s.title}</h3>
        <p>${s.summary}</p>
      </div>
      <div class="stage-meta">
        <div><h5>Состояние</h5><p>${s.state}</p></div>
        <div><h5>Задача лидера</h5><p>${s.task}</p></div>
        <div><h5>Коммуникация</h5><p>${s.comm}</p></div>
        <div class="stage-risk"><h5>Риск</h5><p>${s.risk}</p></div>
        <div><h5>Инструмент</h5><p>${s.tool}</p></div>
      </div>`;
  }
  stageTabs.forEach((tab) => tab.addEventListener("click", () => renderStage(Number(tab.dataset.stage))));
  renderStage(0);

  /* ======================================================================
     ТЕСТ
     ====================================================================== */
  const questions = [
    {
      q: "Команда систематически опаздывает на планёрки. Ваш первый шаг?",
      options: [
        { t: "Напомню о правиле и спрошу, что мешает приходить вовремя.", s: "demo" },
        { t: "Введу штраф за опоздание — дисциплина не обсуждается.", s: "dir" },
        { t: "Обсудим, зачем нам вообще эти встречи и как сделать их полезнее.", s: "trans" },
        { t: "Поговорю с каждым лично и помогу убрать причину.", s: "coach" }
      ]
    },
    {
      q: "До релиза сутки, и обнаружен критичный баг. Что делаете?",
      options: [
        { t: "Беру управление на себя: распределяю задачи и фиксирую дедлайн.", s: "dir" },
        { t: "Собираю короткий синк: кто что может сделать и чего не хватает.", s: "demo" },
        { t: "Напоминаю, зачем релиз важен для пользователей, и прошу команду решить.", s: "trans" },
        { t: "Иду к самому сильному инженеру и спрашиваю, какая поддержка нужна.", s: "coach" }
      ]
    },
    {
      q: "Сотрудник приносит идею, которая противоречит вашему плану.",
      options: [
        { t: "Выслушаю, но решение уже принято — говорю об этом прямо.", s: "dir" },
        { t: "Вынесу идею на обсуждение команды и сравню с текущим планом.", s: "demo" },
        { t: "Попрошу оформить гипотезу и проверить её на небольшом эксперименте.", s: "trans" },
        { t: "Спрошу, что его вдохновляет в этой идее и какой результат он видит.", s: "coach" }
      ]
    },
    {
      q: "Двое сильных специалистов конфликтуют, остальные молчат.",
      options: [
        { t: "Развожу их по разным задачам, чтобы не мешали работе.", s: "dir" },
        { t: "Собираю встречу и модерирую разговор по правилам.", s: "demo" },
        { t: "Помогаю увидеть общую цель за их позициями и найти третий вариант.", s: "trans" },
        { t: "Говорю с каждым отдельно: что стоит за их раздражением?", s: "coach" }
      ]
    },
    {
      q: "Новичок боится задавать вопросы и молчит на встречах.",
      options: [
        { t: "Даю ему чёткие инструкции и проверяю выполнение.", s: "dir" },
        { t: "На встрече специально спрашиваю его мнение и поддерживаю.", s: "demo" },
        { t: "Объясняю, что вопросы — норма и признак роста, привожу пример.", s: "trans" },
        { t: "Встречаюсь один на один и помогаю сформулировать первый вопрос.", s: "coach" }
      ]
    },
    {
      q: "Вы ошиблись в решении, и команда это заметила.",
      options: [
        { t: "Признаю ошибку и сразу предлагаю план исправления.", s: "dir" },
        { t: "Обсуждаю с командой, как нам не повторять это в будущем.", s: "demo" },
        { t: "Показываю, что ошибка — часть обучения, и делюсь выводом.", s: "trans" },
        { t: "Спрашиваю, что каждый из нас может сделать иначе в следующий раз.", s: "coach" }
      ]
    },
    {
      q: "Нужно закрыть скучную, но важную задачу. Как распределите?",
      options: [
        { t: "Назначаю ответственного и устанавливаю контрольные точки.", s: "dir" },
        { t: "Спрашиваю, кто готов взять, и фиксирую договорённость.", s: "demo" },
        { t: "Объясняю, как задача связана с общей целью, и прошу выбрать.", s: "trans" },
        { t: "Помогаю человеку найти в задаче личный интерес и точку роста.", s: "coach" }
      ]
    },
    {
      q: "Команда достигла цели. Что делаете в первую очередь?",
      options: [
        { t: "Ставлю следующую цель — расслабляться рано.", s: "dir" },
        { t: "Собираем короткую ретроспективу: что сработало, что нет.", s: "demo" },
        { t: "Отмечаем вклад каждого и связываем успех с общей миссией.", s: "trans" },
        { t: "Говорю с каждым, чтобы понять, что дало ему этот проект.", s: "coach" }
      ]
    },
    {
      q: "Сотрудник выгорел и стал хуже работать.",
      options: [
        { t: "Обсуждаю падение результата и ставлю срок на исправление.", s: "dir" },
        { t: "Перераспределяю нагрузку и обсуждаю это с командой.", s: "demo" },
        { t: "Ищу вместе с ним смысл и возможность перестроить роль.", s: "trans" },
        { t: "Встречаюсь, слушаю и помогаю восстановить ресурс и приоритеты.", s: "coach" }
      ]
    },
    {
      q: "Нужно объяснить команде изменение стратегии.",
      options: [
        { t: "Объявляю решение, сроки и ожидаемые действия — без лишних деталей.", s: "dir" },
        { t: "Провожу встречу с вопросами и собираю обратную связь по внедрению.", s: "demo" },
        { t: "Объясняю, почему старое перестало работать и какое будущее мы строим.", s: "trans" },
        { t: "Спрашиваю каждого, что ему нужно, чтобы принять и освоить изменения.", s: "coach" }
      ]
    }
  ];

  const styleInfo = {
    dir: {
      name: "Директивный",
      color: "#fb7185",
      title: "Директивный лидер",
      lead: "Вы быстро берёте ответственность, не боитесь сложных решений и умеете создавать определённость там, где её нет. Команда знает, чего от вас ждать.",
      plus: "Скорость, ясность, устойчивость в кризисе. Вы вытаскиваете проекты, когда время — самый дорогой ресурс.",
      minus: "Инициатива команды умирает: люди ждут указаний и перестают приносить идеи. Риск — зависимость от вас и скрытое сопротивление.",
      tip: "Добавляйте вопрос вместо ответа: «Как ты предлагаешь?» Объясняйте причину решения — это превращает указание в смысл."
    },
    demo: {
      name: "Демократический",
      color: "#22d3ee",
      title: "Демократический лидер",
      lead: "Вы строите решения вместе с командой и умеете слышать разные позиции. Люди чувствуют себя участниками, а не исполнителями.",
      plus: "Причастность, качество решений, доверие. Вы хорошо работаете с экспертной командой и сложными изменениями.",
      minus: "Риск медленных решений и размытой ответственности. В кризисе консенсус может оказаться слишком дорогим.",
      tip: "Договаривайтесь о том, кто принимает финальное решение и по каким критериям. Иногда честное «решаю я» — тоже демократия."
    },
    trans: {
      name: "Трансформационный",
      color: "#7c5cff",
      title: "Трансформационный лидер",
      lead: "Вы работаете через смысл и развитие. Вам важно, чтобы люди понимали, зачем они делают то, что делают, и росли вместе с задачей.",
      plus: "Вовлечённость, инициатива, устойчивость на длинной дистанции. Вы умеете превращать работу в общую историю.",
      minus: "Риск красивых слов без опоры на процессы. Смысл без ясных рамок и ресурсов быстро превращается в разочарование.",
      tip: "Переводите видение в конкретные решения и критерии. Проверяйте, что вдохновение не заменяет условия для работы."
    },
    coach: {
      name: "Коучинговый",
      color: "#a3e635",
      title: "Коучинговый лидер",
      lead: "Вы опираетесь на человека: слушаете, задаёте вопросы, помогаете найти собственный ответ. Люди рядом с вами растут и чувствуют поддержку.",
      plus: "Доверие, развитие, автономия. Вы умеете раскрывать потенциал и снижать зависимость команды от лидера.",
      minus: "Риск избегания трудных решений и разговоров. Поддержка без требовательности превращается в попустительство.",
      tip: "Не только спрашивайте, но и обозначайте ожидания. Иногда лучшая поддержка — ясная планка и честная обратная связь."
    }
  };

  const testCard = $("#testCard");
  const testResultEl = $("#testResult");
  const testStep = $("#testStep");
  const testBar = $("#testBar");
  const qText = $("#qText");
  const qOptions = $("#qOptions");
  const testPrev = $("#testPrev");
  const testHint = $("#testHint");
  let answers = new Array(questions.length).fill(null);
  let qIndex = 0;

  function renderQuestion() {
    const q = questions[qIndex];
    testStep.textContent = `Вопрос ${qIndex + 1} / ${questions.length}`;
    testBar.style.width = `${((qIndex + 1) / questions.length) * 100}%`;
    qText.textContent = q.q;
    qOptions.innerHTML = q.options.map((opt, i) => `
      <button class="option ${answers[qIndex] === i ? "is-picked" : ""}" type="button" data-opt="${i}">
        <span class="option-key">${"ABCD"[i]}</span>
        <span>${opt.t}</span>
      </button>`).join("");
    testPrev.disabled = qIndex === 0;
    testHint.textContent = answers[qIndex] === null ? "Выберите вариант ответа" : "Можно изменить ответ";
  }

  qOptions?.addEventListener("click", (e) => {
    const btn = e.target.closest(".option");
    if (!btn) return;
    const opt = Number(btn.dataset.opt);
    answers[qIndex] = opt;
    $$(".option", qOptions).forEach((el) => el.classList.toggle("is-picked", el === btn));
    testHint.textContent = "Ответ сохранён";
    setTimeout(() => {
      if (qIndex < questions.length - 1) {
        qIndex++;
        renderQuestion();
      } else {
        showTestResult();
      }
    }, 240);
  });

  testPrev?.addEventListener("click", () => {
    if (qIndex > 0) {
      qIndex--;
      renderQuestion();
    }
  });

  function computeResult() {
    const counts = { dir: 0, demo: 0, trans: 0, coach: 0 };
    answers.forEach((a, i) => {
      if (a !== null) counts[questions[i].options[a].s]++;
    });
    const order = ["trans", "demo", "coach", "dir"];
    let top = order[0];
    order.forEach((key) => {
      if (counts[key] > counts[top]) top = key;
    });
    return { counts, top };
  }

  function showTestResult() {
    const { counts, top } = computeResult();
    const info = styleInfo[top];
    testCard.hidden = true;
    testResultEl.hidden = false;

    $("#resultTitle").textContent = info.title;
    $("#resultLead").textContent = info.lead;
    $("#resultPlus").textContent = info.plus;
    $("#resultMinus").textContent = info.minus;
    $("#resultTip").textContent = info.tip;

    const order = ["dir", "demo", "trans", "coach"];
    const total = Math.max(1, answers.filter((a) => a !== null).length);
    $("#resultBars").innerHTML = order.map((key) => {
      const pct = Math.round((counts[key] / total) * 100);
      return `<div class="result-bar">
        <span>${styleInfo[key].name}</span>
        <span class="track"><i class="fill" data-width="${pct}" style="background:${styleInfo[key].color}"></i></span>
        <span class="val">${pct}%</span>
      </div>`;
    }).join("");
    requestAnimationFrame(() => {
      $$(".result-bar .fill", testResultEl).forEach((el) => { el.style.width = el.dataset.width + "%"; });
    });

    store.set("leadership-test", { counts, top, date: Date.now() });
    testResultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function restartTest() {
    answers = new Array(questions.length).fill(null);
    qIndex = 0;
    testResultEl.hidden = true;
    testCard.hidden = false;
    renderQuestion();
  }
  $("#testRestart")?.addEventListener("click", restartTest);

  const savedTest = store.get("leadership-test", null);
  if (savedTest && savedTest.counts) {
    const asideNote = $(".aside-note");
    if (asideNote) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-btn";
      btn.style.cssText = "margin-top:8px;font-size:11px;font-weight:700;color:var(--accent);display:block";
      btn.textContent = `Показать прошлый результат (${styleInfo[savedTest.top]?.name || ""})`;
      btn.addEventListener("click", () => {
        const { counts, top } = savedTest;
        const info = styleInfo[top];
        testCard.hidden = true;
        testResultEl.hidden = false;
        $("#resultTitle").textContent = info.title;
        $("#resultLead").textContent = info.lead;
        $("#resultPlus").textContent = info.plus;
        $("#resultMinus").textContent = info.minus;
        $("#resultTip").textContent = info.tip;
        const order = ["dir", "demo", "trans", "coach"];
        const total = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
        $("#resultBars").innerHTML = order.map((key) => {
          const pct = Math.round((counts[key] / total) * 100);
          return `<div class="result-bar"><span>${styleInfo[key].name}</span><span class="track"><i class="fill" style="width:${pct}%;background:${styleInfo[key].color}"></i></span><span class="val">${pct}%</span></div>`;
        }).join("");
        testResultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      asideNote.appendChild(btn);
    }
  }
  renderQuestion();

  /* ======================================================================
     СИМУЛЯТОР
     ====================================================================== */
  const scenarios = [
    {
      tag: "Первый день",
      title: "Первый понедельник",
      text: "Вы новый тимлид продуктовой команды из семи человек. На первой встрече все ждут, что вы скажете. У вас 30 минут.",
      options: [
        { t: "Раздать задачи и сроки на месяц: определённость важнее разговоров.", d: { trust: -4, engage: -6, result: 10 }, f: "Скорость появилась. Но команда поняла: здесь не спрашивают, а приказывают. Доверие стартовало с минуса." },
        { t: "Спросить, что мешает команде сейчас, и договориться о трёх правилах работы.", d: { trust: 8, engage: 8, result: 4 }, f: "Вы получили карту проблем и первые договорённости. Люди увидели: их слышат, но рамки не размываются." },
        { t: "Рассказать о видении на год и дать всем полную свободу.", d: { trust: 2, engage: 6, result: -6 }, f: "Видение вдохновило, но без ролей и приоритетов каждый понял его по-своему. Через неделю — три параллельных проекта." }
      ]
    },
    {
      tag: "Давление",
      title: "Дедлайн и спор",
      text: "Через неделю релиз. Двое сильных инженеров спорят об архитектуре, остальные молчат. Время уходит.",
      options: [
        { t: "Принять решение самому и закрыть обсуждение.", d: { trust: -5, engage: -5, result: 8 }, f: "Решение принято, работа пошла. Но оба инженера запомнили, что их аргументы не имели значения." },
        { t: "Дать каждому по три минуты, сформулировать критерии и решить вместе.", d: { trust: 6, engage: 7, result: 5 }, f: "Спор превратился в выбор по критериям. Команда увидела, как принимать решения без победителей и проигравших." },
        { t: "Отложить решение до следующей встречи.", d: { trust: -3, engage: -2, result: -6 }, f: "Пауза не сняла напряжение, а забрала время. Дедлайн стал ближе, а проблема — тяжелее." }
      ]
    },
    {
      tag: "Ответственность",
      title: "Сорванный срок",
      text: "Аналитик не успел подготовить требования, релиз сдвинулся. Он извиняется и выглядит выгоревшим.",
      options: [
        { t: "Публично разобрать ошибку на общем созвоне.", d: { trust: -8, engage: -8, result: 2 }, f: "Команда усвоила урок — но не тот, который вы хотели: ошибаться опасно. Теперь проблемы будут скрывать дольше." },
        { t: "Провести разговор один на один по SBI и вместе найти причину.", d: { trust: 8, engage: 6, result: 3 }, f: "Вы отделили человека от ошибки и нашли реальную причину — перегрузку. Ответственность стала рабочей, а не пугающей." },
        { t: "Молча доделать за него.", d: { trust: 2, engage: -4, result: -3 }, f: "Задача сдвинулась, но вы подтвердили: ответственность можно не нести. Через месяц это повторится с другим человеком." }
      ]
    },
    {
      tag: "Мотивация",
      title: "Просьба о повышении",
      text: "Ключевой разработчик просит повышение и прибавку. Бюджета на грейд сейчас нет, а он уже смотрит вакансии.",
      options: [
        { t: "Пообещать повышение через полгода, чтобы удержать.", d: { trust: -4, engage: 4, result: 0 }, f: "Он остался, но теперь проверяет каждое ваше слово. Невыполненное обещание дороже честного «пока нет»." },
        { t: "Честно объяснить рамки и собрать план развития с критериями на три месяца.", d: { trust: 7, engage: 8, result: 2 }, f: "Разговор был непростым, но честным. У человека появился маршрут, у вас — договорённость вместо надежды." },
        { t: "Сказать, что сейчас не время, и вернуться к теме позже.", d: { trust: -5, engage: -6, result: -2 }, f: "Формально вы ничего не нарушили. Фактически — показали, что его развитие не в приоритете." }
      ]
    },
    {
      tag: "Финал",
      title: "Релиз вышел",
      text: "Проект сдан вовремя и без критичных багов. Команда ждёт вашей реакции.",
      options: [
        { t: "Отметить результат и назвать конкретный вклад каждого.", d: { trust: 7, engage: 8, result: 5 }, f: "Признание стало точным, а не общим. Люди ушли с ощущением: «нас увидели» — это топливо для следующего проекта." },
        { t: "Сразу переключить всех на следующий проект — не время расслабляться.", d: { trust: -3, engage: -6, result: 4 }, f: "Вы удержали темп, но не дали команде закрыть смысл. Накопленная усталость догонит на следующем релизе." },
        { t: "Собрать всех и сказать: «Вы молодцы».", d: { trust: 2, engage: 2, result: 0 }, f: "Приятно, но обезличенно. Признание работает, когда в нём есть конкретика и имена." }
      ]
    }
  ];

  const simCard = $("#simCard");
  const simFinal = $("#simFinal");
  const simOptions = $("#simOptions");
  const simFeedback = $("#simFeedback");
  const simNextWrap = $("#simNextWrap");
  let metrics = { trust: 50, engage: 50, result: 50 };
  let simRound = 0;
  let choiceLocked = false;

  function updateMetrics() {
    ["trust", "engage", "result"].forEach((key) => {
      const value = clamp(metrics[key], 0, 100);
      metrics[key] = value;
      const map = { trust: ["#mTrust", "#bTrust"], engage: ["#mEngage", "#bEngage"], result: ["#mResult", "#bResult"] };
      const [numSel, barSel] = map[key];
      const num = $(numSel);
      const bar = $(barSel);
      if (num) num.textContent = value;
      if (bar) bar.style.width = value + "%";
    });
  }

  function renderSim() {
    const sc = scenarios[simRound];
    if (!sc) return;
    choiceLocked = false;
    $("#simRound").textContent = `Ситуация ${simRound + 1} / ${scenarios.length}`;
    $("#simTag").textContent = sc.tag;
    $("#simTitle").textContent = sc.title;
    $("#simText").textContent = sc.text;
    simFeedback.hidden = true;
    simFeedback.innerHTML = "";
    simNextWrap.hidden = true;
    simOptions.innerHTML = sc.options.map((opt, i) => `
      <button class="sim-option" type="button" data-choice="${i}">
        <span class="option-key">${i + 1}</span>
        <span>${opt.t}</span>
      </button>`).join("");
    updateMetrics();
  }

  simOptions?.addEventListener("click", (e) => {
    const btn = e.target.closest(".sim-option");
    if (!btn || choiceLocked) return;
    choiceLocked = true;
    const sc = scenarios[simRound];
    const choice = sc.options[Number(btn.dataset.choice)];
    const deltaTotal = choice.d.trust + choice.d.engage + choice.d.result;

    metrics.trust += choice.d.trust;
    metrics.engage += choice.d.engage;
    metrics.result += choice.d.result;
    updateMetrics();

    $$(".sim-option", simOptions).forEach((el) => {
      el.disabled = true;
      if (el === btn) el.classList.add(deltaTotal >= 0 ? "is-good" : "is-bad");
    });

    const deltaChips = [
      ["trust", "Доверие"],
      ["engage", "Вовлечённость"],
      ["result", "Результат"]
    ].filter(([key]) => choice.d[key] !== 0).map(([key, label]) => {
      const v = choice.d[key];
      return `<span class="delta ${v > 0 ? "up" : "down"}">${v > 0 ? "+" : ""}${v} ${label}</span>`;
    }).join("");

    simFeedback.innerHTML = `<strong>${deltaTotal >= 0 ? "Что сработало" : "Цена решения"}</strong>${choice.f}<div class="deltas">${deltaChips}</div>`;
    simFeedback.hidden = false;
    $("#simNext").innerHTML = simRound === scenarios.length - 1
      ? 'Показать итоги <svg class="icon"><use href="#i-arrow"/></svg>'
      : 'Дальше <svg class="icon"><use href="#i-arrow"/></svg>';
    simNextWrap.hidden = false;
  });

  $("#simNext")?.addEventListener("click", () => {
    if (simRound < scenarios.length - 1) {
      simRound++;
      renderSim();
      simCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      showSimFinal();
    }
  });

  function showSimFinal() {
    simCard.hidden = true;
    simFinal.hidden = false;
    const avg = Math.round((metrics.trust + metrics.engage + metrics.result) / 3);
    let title, text;
    if (avg >= 78) {
      title = "Сильный старт";
      text = "Вы прошли месяц как лидер, который удерживает баланс результата и людей. Команда доверяет, вовлечена и понимает, куда идёт. Главная задача теперь — не потерять это в рутине.";
    } else if (avg >= 60) {
      title = "Уверенный старт";
      text = "Основа заложена: есть ясность и рабочие отношения. Но часть решений вы принимали в пользу скорости. Следующий шаг — сделать обратную связь и признание регулярной привычкой.";
    } else if (avg >= 45) {
      title = "Неровный старт";
      text = "Вы удержали результат, но заплатили за него доверием или вовлечённостью. Это частая цена первого месяца. Хорошая новость: доверие восстанавливается предсказуемостью и честными разговорами.";
    } else {
      title = "Трудный месяц";
      text = "Команда получила результат или свободу, но потеряла ощущение безопасности. Начните не с новой стратегии, а с одного честного разговора и одного выполненного обещания.";
    }

    $("#simFinalTitle").textContent = title;
    $("#simFinalText").textContent = text;
    $("#simFinalStats").innerHTML = `
      <div><strong>${clamp(metrics.trust, 0, 100)}</strong><span>Доверие</span></div>
      <div><strong>${clamp(metrics.engage, 0, 100)}</strong><span>Вовлечённость</span></div>
      <div><strong>${clamp(metrics.result, 0, 100)}</strong><span>Результат</span></div>`;

    const weakest = Object.entries(metrics).sort((a, b) => a[1] - b[1])[0];
    const labels = { trust: "доверие", engage: "вовлечённость", result: "результат" };
    const lessons = [
      `Самый уязвимый показатель месяца — ${labels[weakest[0]]} (${clamp(weakest[1], 0, 100)}/100). Именно он будет ограничивать остальные.`,
      "Сильнее всего работают решения, где вы сначала слушаете, а затем фиксируете рамки и ответственность.",
      "На следующей неделе: один разговор 1:1 без повестки и одна конкретная благодарность с именем и фактом."
    ];
    $("#simLessons").innerHTML = lessons.map((l) => `<p><svg class="icon"><use href="#i-check"/></svg><span>${l}</span></p>`).join("");

    const best = store.get("leadership-sim-best", 0);
    if (avg > best) {
      store.set("leadership-sim-best", avg);
      toast("Новый личный рекорд: " + avg);
    }
    simFinal.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function restartSim() {
    metrics = { trust: 50, engage: 50, result: 50 };
    simRound = 0;
    simFinal.hidden = true;
    simCard.hidden = false;
    renderSim();
  }
  $("#simRestart")?.addEventListener("click", restartSim);
  renderSim();

  /* ======================================================================
     SBI
     ====================================================================== */
  const sbiS = $("#sbiS");
  const sbiB = $("#sbiB");
  const sbiI = $("#sbiI");
  const sbiOut = $("#sbiOut");

  function updateSBI() {
    const s = sbiS.value.trim();
    const b = sbiB.value.trim();
    const i = sbiI.value.trim();
    if (!s && !b && !i) {
      sbiOut.textContent = "Заполните три поля — соберём точную фразу без оценок и обобщений.";
      sbiOut.classList.remove("is-ready");
      return;
    }
    const phrase = `Когда ${s || "[ситуация]"}, вы ${b || "[поведение]"}. Это привело к тому, что ${i || "[влияние]"}.`;
    sbiOut.textContent = phrase;
    sbiOut.classList.add("is-ready");
  }
  [sbiS, sbiB, sbiI].forEach((input) => input?.addEventListener("input", updateSBI));

  $("#sbiExample")?.addEventListener("click", () => {
    sbiS.value = "вчера на демо клиент задал вопрос о сроках";
    sbiB.value = "ответили «это не ко мне» и передали слово коллеге";
    sbiI.value = "клиент замолчал, и мы потеряли контакт с ним";
    updateSBI();
  });

  $("#sbiCopy")?.addEventListener("click", async () => {
    const text = sbiOut.textContent;
    if (!sbiOut.classList.contains("is-ready")) {
      toast("Сначала заполните поля");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Фраза скопирована");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); toast("Фраза скопирована"); }
      catch { toast("Не удалось скопировать"); }
      area.remove();
    }
  });

  /* ---------- Печать ---------- */
  window.addEventListener("afterprint", () => {
    document.body.style.overflow = "";
  });
})();
