/* ============================================================
   海上小飞龙 · 全站交互
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------------------------------------------- 顶部引流条 */
  function initTopbar() {
    var bar = $("#promoTopbar");
    if (!bar) return;
    if (LS.get("topbar_closed") === "1") { bar.classList.add("is-hidden"); return; }
    var close = $("[data-close-topbar]", bar);
    if (close) {
      close.addEventListener("click", function () {
        bar.classList.add("is-hidden");
        LS.set("topbar_closed", "1");
      });
    }
  }

  /* ---------------------------------------------- 移动端菜单 */
  function initNav() {
    var toggle = $("#navToggle"), nav = $("#mainNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".nav-link", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------- 二维码弹窗 */
  function initModal() {
    var modal = $("#wechatModal");
    if (!modal) return;

    var lastFocus = null;

    function open(trigger, fromKeyboard) {
      // 记住是谁触发的弹窗，关闭时把焦点还回去。
      // 不用 document.activeElement：程序化调用 click() 或 Safari 点按钮
      // 都不会让按钮获得焦点，那样还回去的就是 <body>，等于没还。
      lastFocus = trigger || document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      // 记录一次转化意向
      try {
        if (window.gtag) window.gtag("event", "wechat_modal_open");
      } catch (e) {}
      // 只有键盘触发才把焦点移进弹窗。
      // 鼠标点击时不移：那样焦点框会跟着出现，视觉很吵；
      // 而且不依赖 :focus-visible 的浏览器启发式判断，行为是确定的。
      if (fromKeyboard) {
        var btn = $(".wechat-modal-close", modal);
        if (btn) btn.focus();
      }
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = "";
      // 焦点还给刚才触发弹窗的那个元素，键盘操作不会「丢失位置」
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // 打开：全站有多处「关注公众号」按钮，用事件委托一次搞定
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-open-wechat]");
      if (!trigger) return;
      e.preventDefault();
      // e.detail === 0 表示事件由键盘触发（回车/空格），鼠标点击时 detail >= 1
      open(trigger, e.detail === 0);
    });

    // 关闭：直接绑在弹窗自身上，**不要**委托到 document。
    //
    // ⚠️ 这里踩过一个坑：关闭按钮 × 位于 .wechat-modal-box 内部，而 box 上
    //    曾经挂了一句 stopPropagation，事件被拦在 box 那里、冒泡不到 document，
    //    于是 × 点了毫无反应（遮罩因为不在 box 里，反而是正常的）。
    //    绑在 modal 上就没这个问题 —— × 和遮罩都在 modal 内部，冒泡一定能到达。
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-modal]")) { e.preventDefault(); close(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ---------------------------------------------- 读完后弹层 */
  function initReadEnd() {
    var panel = $("[data-readend]");
    if (!panel) return;

    if (LS.get("readend_dismissed") === "1") return;

    var delay = (parseInt(panel.dataset.delay, 10) || 25) * 1000;
    var scrollPct = parseInt(panel.dataset.scroll, 10) || 70;
    var timeOk = false, scrollOk = false, shown = false;

    function tryShow() {
      if (shown || !timeOk || !scrollOk) return;
      shown = true;
      panel.classList.add("is-show");
    }

    setTimeout(function () { timeOk = true; tryShow(); }, delay);

    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      var pct = (window.scrollY / h) * 100;
      if (pct >= scrollPct) {
        scrollOk = true;
        tryShow();
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var dismiss = $("[data-dismiss-readend]", panel);
    if (dismiss) {
      dismiss.addEventListener("click", function () {
        panel.classList.remove("is-show");
        LS.set("readend_dismissed", "1");
      });
    }
  }

  /* ---------------------------------------------- 浮动二维码 */
  function initFloating() {
    var el = $("#floatingQr");
    if (!el) return;
    if (LS.get("floating_closed") === "1") return;
    if (window.innerWidth < 981) return;

    var shown = false;
    function onScroll() {
      if (shown) return;
      if (window.scrollY > 700) {
        shown = true;
        el.classList.add("is-show");
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var close = $("[data-close-floating]", el);
    if (close) {
      close.addEventListener("click", function () {
        el.classList.remove("is-show");
        LS.set("floating_closed", "1");
      });
    }
  }

  /* ---------------------------------------------- 数字滚动动画 */
  function initCounters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      nodes.forEach(function (n) { n.textContent = n.dataset.count; });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var node = entry.target;
        io.unobserve(node);
        var target = parseInt(node.dataset.count, 10) || 0;
        var start = performance.now();
        var dur = 1100;
        (function step(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          node.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
          else node.textContent = target;
        })(start);
      });
    }, { threshold: 0.4 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------------------------------------------- 滚动入场 */
  function initReveal() {
    var els = $$(".feat-card, .mini-card, .post-card, .cta-panel, .about-card");
    if (!els.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    els.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------- 动效：卡片光晕跟随鼠标 */
  /*
     在卡片上监听 mousemove，把鼠标相对位置写进 --mx / --my，
     CSS 用这两个变量定位 radial-gradient 光斑（见 style.css 的 .fx-spot）。

     不做节流：这里只写两个 CSS 变量，合成在下一帧才发生，开销可以忽略；
     加了节流反而会让光斑一顿一顿的，显得迟钝。

     触屏设备直接跳过 —— 没有 hover，挂了也是白挂。
     整个函数还受 <html> 上的 fx-spot 控制（构建时按配置注入）。
  */
  function initSpotlight() {
    if (!document.documentElement.classList.contains("fx-spot")) return;
    if (!hasFinePointer()) return;

    $$(".feat-card, .mini-card, .post-card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
      // 移出时把光斑收回默认位置，下次进入不会从上次停的地方突然亮起
      card.addEventListener("mouseleave", function () {
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      });
    });
  }

  /* ---------------------------------------------- 动效：卡片轻微 3D 倾斜 */
  /*
     鼠标在卡片里的相对位置 → 倾斜角度。
     幅度上限刻意压到 2.5deg：再大文字会发虚，看起来像在抖，而不是「浮」。
  */
  var TILT_MAX = 2.5;

  function initTilt() {
    if (!document.documentElement.classList.contains("fx-tilt")) return;
    if (!hasFinePointer()) return;

    $$(".feat-card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        // 归一到 [-0.5, 0.5]，0 表示鼠标在卡片正中
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        // 鼠标往右移 → 右侧下沉，这是「被按下去」的自然方向
        card.style.setProperty("--ry", (-px * TILT_MAX * 2).toFixed(2) + "deg");
        card.style.setProperty("--rx", (py * TILT_MAX * 2).toFixed(2) + "deg");
      });
      card.addEventListener("mouseleave", function () {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }

  /* ---------------------------------------------- 动效：导航栏滚动收缩 */
  /*
     滚过一小段后给头部挂 .is-scrolled，让它变矮、加重投影。

     用 rAF 节流：scroll 触发极频繁，而这里既读 window.scrollY 又写 class，
     不加节流会反复触发强制同步布局，滚动明显发涩。
  */
  function initNavShrink() {
    if (!document.documentElement.classList.contains("fx-nav")) return;
    var header = $(".site-header");
    if (!header) return;

    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    update();   // 刷新时可能已经在页面中部，先对齐一次
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* 是否是「精确指针」设备。触屏没有 hover，光晕和倾斜都不该启用。 */
  function hasFinePointer() {
    return !!(window.matchMedia &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }

  /* ---------------------------------------------- 代码块增强 */
  function initCodeBlocks() {
    $$(".post-content pre").forEach(function (pre) {
      var code = $("code", pre);
      if (!code) return;

      var lang = "";
      var cls = code.className || "";
      var m = cls.match(/language-(\w+)/);
      if (m) lang = m[1];

      var bar = document.createElement("div");
      bar.className = "code-bar";

      if (lang) {
        var tag = document.createElement("span");
        tag.className = "code-lang";
        tag.textContent = lang;
        bar.appendChild(tag);
      } else {
        bar.appendChild(document.createElement("span"));
      }

      var btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "复制";
      btn.addEventListener("click", function () {
        var text = code.innerText;
        function done() {
          btn.textContent = "已复制";
          setTimeout(function () { btn.textContent = "复制"; }, 1600);
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else {
          fallback(text, done);
        }
      });
      bar.appendChild(btn);
      pre.insertBefore(bar, pre.firstChild);
      pre.classList.add("has-bar");
    });

    function fallback(text, cb) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); cb(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------------------------------------------- 上下篇导航 */
  function initPostNav() {
    var dataEl = $("#postNavData"), host = $("#postNav");
    if (!dataEl || !host) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

    var html = "";
    if (data.prev) {
      html += '<a class="post-nav-item post-nav-item--prev" href="/posts/' + data.prev.slug + '.html">' +
        '<span class="post-nav-label">← 上一篇</span>' +
        '<span class="post-nav-title">' + esc(data.prev.title) + '</span></a>';
    }
    if (data.next) {
      html += '<a class="post-nav-item post-nav-item--next" href="/posts/' + data.next.slug + '.html">' +
        '<span class="post-nav-label">下一篇 →</span>' +
        '<span class="post-nav-title">' + esc(data.next.title) + '</span></a>';
    }
    if (html) host.innerHTML = html;

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
  }

  /* ---------------------------------------------- 阅读进度条 */
  function initProgress() {
    if (!$(".post-content")) return;
    var bar = document.createElement("div");
    bar.className = "read-progress";
    document.body.appendChild(bar);

    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------------------------------------- 站内搜索 */
  function initSearch() {
    var input = $("#siteSearch"), results = $("#searchResults");
    if (!input || !results) return;

    var index = null, loading = false;

    function load() {
      if (index || loading) return;
      loading = true;
      fetch("/search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (d) { index = d; loading = false; })
        .catch(function () { loading = false; });
    }

    input.addEventListener("focus", load);

    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value.trim().toLowerCase();
        if (!q) { results.innerHTML = ""; results.hidden = true; return; }
        if (!index) { load(); results.innerHTML = '<p class="search-empty">正在加载…</p>'; results.hidden = false; return; }

        var hits = index.filter(function (p) {
          return p.t.toLowerCase().indexOf(q) > -1 ||
                 p.d.toLowerCase().indexOf(q) > -1 ||
                 p.x.toLowerCase().indexOf(q) > -1 ||
                 (p.g || []).some(function (g) { return g.toLowerCase().indexOf(q) > -1; });
        }).slice(0, 8);

        if (!hits.length) {
          results.innerHTML = '<p class="search-empty">没有找到相关文章</p>';
        } else {
          results.innerHTML = hits.map(function (p) {
            return '<a class="search-hit" href="' + p.u + '">' +
              '<span class="search-hit-title">' + escapeHtml(p.t) + '</span>' +
              '<span class="search-hit-desc">' + escapeHtml(p.d) + '</span></a>';
          }).join("");
        }
        results.hidden = false;
      }, 130);
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-box")) results.hidden = true;
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
  }

  /* ---------------------------------------------- 正文图片：失败兜底 */
  /*
     文章配图托管在语雀 CDN（cdn.nlark.com），靠 <img referrerpolicy="no-referrer">
     绕开它的 Referer 防盗链（构建脚本会自动加这个属性）。
     但这是「借用」对方的宽容策略，语雀随时可能改规则。一旦改了，全站配图会同时裂掉，
     所以这里加一层兜底：加载失败时换成一个占位图，而不是留下难看的破图标 + 白框。
  */
  function initImageFallback() {
    // 内联 SVG 占位图，避免额外请求
    var PLACEHOLDER =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220">' +
          '<rect width="640" height="220" fill="#101728"/>' +
          '<g fill="none" stroke="#2c3a55" stroke-width="2">' +
          '<rect x="8" y="8" width="624" height="204" rx="12" stroke-dasharray="8 8"/>' +
          "</g>" +
          '<text x="320" y="104" text-anchor="middle" fill="#6b7a99" ' +
          'font-family="system-ui,sans-serif" font-size="17">图片加载失败</text>' +
          '<text x="320" y="134" text-anchor="middle" fill="#4d5a75" ' +
          'font-family="system-ui,sans-serif" font-size="13">' +
          "图片源暂时不可用，可前往公众号「海上小飞龙」查看原文" +
          "</text>" +
          "</svg>"
      );

    function guard(img) {
      // 已经兜底过的就不再处理，避免死循环
      if (img.dataset.imgFallback === "1") return;
      // 占位图本身（data: URL）不处理
      if (img.src.indexOf("data:") === 0) return;
      img.dataset.imgFallback = "1";
      img.classList.add("img-broken");
      img.src = PLACEHOLDER;
      img.removeAttribute("srcset");
    }

    // 用捕获阶段的事件委托，而不是给每张图单独挂 onerror。
    // 原因：img 的 error 事件不冒泡，但会在捕获阶段向下传递，
    // 所以监听 document 的捕获阶段能覆盖到「加载后动态插入」的图片。
    document.addEventListener(
      "error",
      function (e) {
        var el = e.target;
        if (el && el.tagName === "IMG" && el.closest && el.closest(".post-content")) {
          guard(el);
        }
      },
      true
    );

    // 兜底：如果监听器挂上之前图片就已经失败了（比如浏览器缓存了错误结果），
    // error 事件不会再触发，只能靠 complete + naturalWidth 判断。
    $$(".post-content img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) guard(img);
    });
  }

  /* ---------------------------------------------- 正文图片：点击放大 */
  /*
     技术文章的架构图、流程图在正文宽度下常常看不清，点一下看大图是刚需。
     不用第三方库，纯手写一个轻量 lightbox：点击遮罩 / 按 Esc / 点关闭按钮都能退出。
  */
  function initImageZoom() {
    var imgs = $$(".post-content img");
    if (!imgs.length) return;

    var box = document.createElement("div");
    box.className = "img-zoom";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "查看大图");
    box.innerHTML =
      '<button class="img-zoom-close" type="button" aria-label="关闭">&times;</button>' +
      '<img class="img-zoom-img" alt="">';
    document.body.appendChild(box);

    var big = $(".img-zoom-img", box);
    var lastFocus = null;

    function open(src, alt) {
      big.src = src;
      big.alt = alt || "";
      box.classList.add("is-open");
      document.body.classList.add("img-zoom-lock");
      lastFocus = document.activeElement;
      $(".img-zoom-close", box).focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.classList.remove("img-zoom-lock");
      // 清空 src，避免大图继续占着内存
      setTimeout(function () { big.removeAttribute("src"); }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    imgs.forEach(function (img) {
      // 被链接包着的图片不参与放大，也不给 zoom-in 光标（否则鼠标提示会骗人）
      if (img.closest("a")) return;

      img.classList.add("img-zoomable");
      img.addEventListener("click", function (e) {
        // 兜底占位图就别放大了
        if (img.classList.contains("img-broken")) return;
        e.preventDefault();
        open(img.currentSrc || img.src, img.alt);
      });
    });

    box.addEventListener("click", function (e) {
      // 点遮罩或关闭按钮都退出，点大图本身不退出
      if (e.target === box || e.target.classList.contains("img-zoom-close")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("is-open")) close();
    });
  }

  /* ---------------------------------------------- 主题切换 */
  /*
     深色 / 浅色主题切换。

     真正的「首次应用」发生在 <head> 的内联脚本里（构建时注入，见 build.py
     的 THEME_INIT_SCRIPT）—— 那一步必须在样式表加载前跑完，否则刷新页面会
     先画一帧默认色再切换，出现明显闪烁。这里只负责响应点击。

     三种状态：
       localStorage 有值  → 用存的值
       没有值            → 跟随系统 prefers-color-scheme
       用户点过按钮      → 写入 localStorage，从此不再跟随系统
  */
  var THEME_KEY = "theme";
  // 浏览器地址栏/状态栏的配色，跟着主题走
  var THEME_COLOR = { dark: "#0a0e17", light: "#f6f8fc" };

  /*
     应用主题。**刻意不做过渡动画** —— 渐变（background-image）无法参与 CSS transition，
     而纯色背景可以，两者一旦不同步，过渡的那几百毫秒里就会出现
     「深色背景 + 浅色主题的渐变文字」这种几乎看不清的组合
     （hero 标题、统计数字都是渐变文字，中招最明显）。
     所以直接瞬间切换，详见 style.css 里的说明。
  */
  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);

    var meta = document.getElementById("themeColorMeta");
    if (meta) meta.setAttribute("content", THEME_COLOR[theme] || THEME_COLOR.dark);

    var btn = $("#themeToggle");
    if (btn) {
      var to = theme === "dark" ? "浅色" : "深色";
      btn.setAttribute("aria-label", "切换到" + to + "主题");
      btn.setAttribute("title", "切换到" + to + "主题");
    }
  }

  function initTheme() {
    var root = document.documentElement;
    // 内联脚本已经设好了，这里只是兜底（万一那段脚本被 CSP 拦了）
    var current = root.getAttribute("data-theme");
    if (current !== "light" && current !== "dark") {
      current = (window.matchMedia &&
                 window.matchMedia("(prefers-color-scheme: light)").matches)
        ? "light" : "dark";
    }
    applyTheme(current);

    var btn = $("#themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      LS.set(THEME_KEY, next);
    });

    // 用户没手动选过主题时，跟随系统切换
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onSystemChange = function (e) {
        if (LS.get(THEME_KEY)) return;   // 用户已明确选过，不覆盖
        applyTheme(e.matches ? "light" : "dark");
      };
      if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
      else if (mq.addListener) mq.addListener(onSystemChange);   // 老 Safari
    }
  }

  /* ---------------------------------------------- 键盘快捷键 */
  function initShortcuts() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && !/input|textarea/i.test(e.target.tagName)) {
        var s = $("#siteSearch");
        if (s) { e.preventDefault(); s.focus(); }
      }
    });
  }

  /* ---------------------------------------------- 初始化 */
  function boot() {
    initTheme();
    initTopbar();
    initNav();
    initModal();
    initReadEnd();
    initFloating();
    initCounters();
    initReveal();
    initNavShrink();
    initSpotlight();
    initTilt();
    initCodeBlocks();
    initPostNav();
    initProgress();
    initSearch();
    initImageFallback();
    initImageZoom();
    initShortcuts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
