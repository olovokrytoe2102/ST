/* ==========================================================================
   STELLARE — CHANNEL SELECT
   Вся интерактивность меню на чистом JavaScript, без сборщиков и фреймворков.

   Что здесь есть:
   - выбор пункта мышью, тачем и клавиатурой (↑ ↓ Home End Enter);
   - «разъезжающиеся» соседние пункты при наведении;
   - эффект воды по клику/нажатию;
   - блокировка пункта без ссылки и всплывающее уведомление;
   - большой номер канала и подсказка внизу.

   Чтобы поменять ссылку, название или подсказку — правьте index.html.
   ========================================================================== */

(function () {
  "use strict";

  var entries = Array.prototype.slice.call(
    document.querySelectorAll(".channel-menu .entry")
  );
  if (!entries.length) return;

  var channels = entries.map(function (entry, index) {
    var hit = entry.querySelector(".entry__hit");
    return {
      index: index,
      entry: entry,
      hit: hit,
      ripples: entry.querySelector(".entry__ripples"),
      href: hit.getAttribute("href"),
      layer: Number(entry.dataset.layer || 0),
      hint: entry.dataset.hint || ""
    };
  });

  var menu = document.querySelector(".channel-menu");
  var counter = document.querySelector(".counter__num");
  var hint = document.querySelector(".command__hint");
  var notice = document.querySelector(".notice");
  var video = document.querySelector(".stage__video");

  var activeIndex = 0;
  var hoveredIndex = -1;
  var deniedIndex = -1;
  var noticeVisible = false;
  var noticeTimer;
  var deniedTimer;
  var rippleId = 0;

  /* ------------------------------ Отрисовка ------------------------------ */

  // Насколько соседние пункты сдвигаются от наведённого.
  function pushFor(index) {
    if (hoveredIndex < 0 || hoveredIndex === index) return 0;

    var distance = Math.abs(index - hoveredIndex);
    var strength = Math.max(0.35, 1 - (distance - 1) * 0.2);

    return index < hoveredIndex ? -strength : strength;
  }

  // Переносит состояние в DOM: активный/наведённый/заблокированный пункт.
  function render() {
    channels.forEach(function (channel) {
      var index = channel.index;
      var active = index === activeIndex;
      var hovered = index === hoveredIndex;

      channel.entry.classList.toggle("is-active", active);
      channel.entry.classList.toggle("is-hovered", hovered);
      channel.entry.classList.toggle("is-denied", index === deniedIndex);

      channel.entry.style.zIndex = String(hovered ? 50 : active ? 30 : channel.layer);
      channel.entry.style.setProperty("--push-dir", String(pushFor(index)));

      channel.hit.tabIndex = active ? 0 : -1;
    });

    // Пока курсор на каком-то пункте, остальные уходят в глубину.
    if (menu) {
      menu.classList.toggle("is-hovering", hoveredIndex >= 0);
    }
  }

  // Перезапускает CSS-анимацию у элемента (аналог {#key} в Svelte).
  function restartAnimation(element) {
    element.style.animation = "none";
    void element.offsetWidth;
    element.style.animation = "";
  }

  // Обновляет большой номер слева и подсказку внизу.
  function updateReadout() {
    if (counter) {
      counter.textContent = String(activeIndex + 1).padStart(2, "0");
      restartAnimation(counter);
    }

    if (hint) {
      hint.textContent = channels[activeIndex] ? channels[activeIndex].hint : "";
      restartAnimation(hint);
    }
  }

  function setActive(index) {
    if (index === activeIndex) {
      render();
      return;
    }

    activeIndex = index;
    render();
    updateReadout();
  }

  function setHover(index) {
    if (index === hoveredIndex) return;

    hoveredIndex = index;
    render();
  }

  function clearHover() {
    setHover(-1);
  }

  function focusChannel(index) {
    var target = document.getElementById("channel-" + index);
    if (target) target.focus({ preventScroll: true });
  }

  function moveSelection(step) {
    var next = (activeIndex + step + channels.length) % channels.length;
    setActive(next);
    focusChannel(next);
  }

  /* --------------------------- Уведомление «скоро» ----------------------- */

  function renderNotice() {
    if (!notice) return;

    notice.textContent = noticeVisible ? "Разработка игры — скоро" : "";
    notice.classList.toggle("is-visible", noticeVisible);
  }

  function handleLocked(index) {
    window.clearTimeout(noticeTimer);
    window.clearTimeout(deniedTimer);

    deniedIndex = -1;
    noticeVisible = false;
    render();
    renderNotice();

    // Принудительный reflow, чтобы тряска запустилась заново даже при
    // повторном клике по тому же пункту.
    void channels[index].entry.offsetWidth;

    deniedIndex = index;
    noticeVisible = true;
    render();
    renderNotice();

    deniedTimer = window.setTimeout(function () {
      deniedIndex = -1;
      render();
    }, 420);

    noticeTimer = window.setTimeout(function () {
      noticeVisible = false;
      renderNotice();
    }, 2300);
  }

  /* ------------------------------ Эффект воды ---------------------------- */

  function addRipple(clientX, clientY, channel) {
    var hit = channel.hit;
    var container = channel.ripples;
    if (!hit || !container) return;

    var rect = hit.getBoundingClientRect();
    var width = hit.offsetWidth || rect.width;
    var height = hit.offsetHeight || rect.height;
    var scaleX = rect.width / width || 1;
    var scaleY = rect.height / height || 1;
    var size = Math.min(380, Math.max(170, height * 2.35));
    var x = clientX == null ? width / 2 : (clientX - rect.left) / scaleX;
    var y = clientY == null ? height / 2 : (clientY - rect.top) / scaleY;

    var ripple = document.createElement("span");
    ripple.className = "entry__ripple";
    ripple.dataset.rippleId = String(++rippleId);
    ripple.style.setProperty("--ripple-x", x + "px");
    ripple.style.setProperty("--ripple-y", y + "px");
    ripple.style.setProperty("--ripple-size", size + "px");

    ripple.addEventListener("animationend", function (event) {
      if (!event.animationName.endsWith("water-ripple")) return;
      ripple.remove();
    });

    container.appendChild(ripple);

    // Держим не больше четырёх кругов одновременно, как в оригинале.
    while (container.children.length > 4) {
      container.firstElementChild.remove();
    }
  }

  function clearRipples() {
    channels.forEach(function (channel) {
      if (channel.ripples) channel.ripples.textContent = "";
    });
  }

  /* ------------------------------- События ------------------------------- */

  channels.forEach(function (channel) {
    var hit = channel.hit;
    if (!hit) return;

    hit.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      addRipple(event.clientX, event.clientY, channel);
    });

    hit.addEventListener("focus", function () {
      setActive(channel.index);
      setHover(channel.index);
    });

    hit.addEventListener("click", function (event) {
      // detail === 0 — клик с клавиатуры (Enter/Space).
      if (event.detail === 0) addRipple(null, null, channel);

      setActive(channel.index);

      if (!channel.href) {
        handleLocked(channel.index);
      }
    });
  });

  if (menu) {
    // Наведение считаем по движению мыши, а не по pointerenter: пункты
    // меняют размер и позицию, и от «въезжающих» событий выбор прыгал бы.
    menu.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") return;

      var target = event.target;
      if (!(target instanceof Element)) return;

      var hit = target.closest(".entry__hit");
      if (!hit) return;

      var index = channels.findIndex(function (channel) {
        return channel.hit === hit;
      });

      if (index < 0) return;
      if (index === hoveredIndex && index === activeIndex) return;

      setActive(index);
      setHover(index);
    });

    menu.addEventListener("pointerleave", clearHover);

    menu.addEventListener("focusout", function (event) {
      var next = event.relatedTarget;
      if (!(next instanceof Node) || !menu.contains(next)) clearHover();
    });
  }

  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    var target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable)
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      focusChannel(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      var last = channels.length - 1;
      setActive(last);
      focusChannel(last);
      return;
    }

    if (event.key === "Enter") {
      var activeElement = document.activeElement;
      if (activeElement && activeElement.closest(".channel-menu")) return;

      event.preventDefault();
      var link = document.getElementById("channel-" + activeIndex);
      if (link) link.click();
    }
  }

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("blur", clearHover);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      clearHover();
      clearRipples();
    }
  });

  window.addEventListener("pageshow", clearRipples);

  /* -------------------------------- Видео -------------------------------- */

  if (video) {
    video.playbackRate = 0.85;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
    } else {
      // Автовоспроизведение может быть заблокировано — остаётся первый кадр.
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {});
      }
    }
  }

  /* -------------------------------- Старт -------------------------------- */

  render();
})();
