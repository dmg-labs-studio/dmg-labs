/* =============================================================
   DMG Labs — scripts.js
   Unified JS for all pages. Each module is self-contained and
   guards against missing DOM elements, so pages that don't use
   a feature simply skip it without errors.
   ============================================================= */


/* ── SCROLL REVEAL ── */
(function () {
  var obs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
})();


/* ── ACTIVE NAV LINK ── */
(function () {
  var current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav__link').forEach(function (a) {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
})();


/* ── IMAGE CAROUSEL (with video support) ── */
(function () {
  function initCarousel(el) {
    var track   = el.querySelector('.img-carousel__track');
    var slides  = Array.from(el.querySelectorAll('.img-carousel__slide'));
    var dots    = el.querySelectorAll('.img-carousel__dot');
    var btnPrev = el.querySelector('.img-carousel__btn--prev');
    var btnNext = el.querySelector('.img-carousel__btn--next');
    var counter = el.querySelector('.img-carousel__counter');
    var n       = slides.length;
    var cur     = 0;

    /* Per-slide video setup */
    slides.forEach(function (slide) {
      if (!slide.classList.contains('img-carousel__slide--video')) return;

      var video   = slide.querySelector('video');
      var overlay = slide.querySelector('.carousel-video-play');
      var muteBtn = slide.querySelector('.carousel-video-mute');
      if (!video) return;

      function togglePlay() {
        if (video.paused) { video.play(); } else { video.pause(); }
      }

      if (overlay) overlay.addEventListener('click', togglePlay);
      video.addEventListener('click', togglePlay);

      video.addEventListener('play', function () {
        if (overlay) overlay.classList.add('hidden');
        if (muteBtn) muteBtn.classList.add('visible');
      });
      video.addEventListener('pause', function () {
        if (overlay) overlay.classList.remove('hidden');
        if (muteBtn) muteBtn.classList.remove('visible');
      });

      if (muteBtn) {
        muteBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          video.muted = !video.muted;
          muteBtn.textContent = video.muted ? '\uD83D\uDD07 UNMUTE' : '\uD83D\uDD08 MUTE';
        });
      }
    });

    /* Navigation */
    function go(idx) {
      /* Pause video on the slide we're leaving */
      var leavingSlide = slides[cur];
      if (leavingSlide && leavingSlide.classList.contains('img-carousel__slide--video')) {
        var leavingVideo = leavingSlide.querySelector('video');
        if (leavingVideo && !leavingVideo.paused) leavingVideo.pause();
      }

      cur = (idx + n) % n;
      track.style.transform = 'translateX(-' + (cur * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === cur); });
      if (counter) counter.textContent = (cur + 1) + ' / ' + n;

      /* Auto-resume video if it was already playing */
      var arrivingSlide = slides[cur];
      if (arrivingSlide && arrivingSlide.classList.contains('img-carousel__slide--video')) {
        var arrivingVideo = arrivingSlide.querySelector('video');
        if (arrivingVideo && arrivingVideo.currentTime > 0) arrivingVideo.play();
      }
    }

    if (btnPrev) btnPrev.addEventListener('click', function () { go(cur - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { go(cur - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
    });

    var tx0 = 0, ty0 = 0;
    el.addEventListener('touchstart', function (e) {
      tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx0;
      var dy = e.changedTouches[0].clientY - ty0;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 30) go(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });

    go(0);
  }

  document.querySelectorAll('.img-carousel').forEach(initCarousel);
})();


/* ── LIGHTBOX v3 (carousel navigation + media-grid zoom) ── */
(function () {
  var overlay  = document.getElementById('lb');
  var imgEl    = document.getElementById('lb-img');
  var btnClose = document.getElementById('lb-close');
  var btnPrev  = document.getElementById('lb-prev');
  var btnNext  = document.getElementById('lb-next');
  var counter  = document.getElementById('lb-counter');
  if (!overlay || !imgEl) return;

  var lbImages = [];
  var lbIdx    = 0;

  function getCarouselImages(carousel) {
    var imgs = [];
    carousel.querySelectorAll('.img-carousel__slide:not(.img-carousel__slide--placeholder) img').forEach(function (img) {
      imgs.push({ src: img.src, alt: img.alt || '' });
    });
    return imgs;
  }

  function updateNav() {
    if (btnPrev) btnPrev.hidden = (lbImages.length <= 1);
    if (btnNext) btnNext.hidden = (lbImages.length <= 1);
    if (counter) counter.textContent = lbImages.length > 1 ? (lbIdx + 1) + ' / ' + lbImages.length : '';
  }

  function showImage(idx) {
    lbIdx = (idx + lbImages.length) % lbImages.length;
    imgEl.src = lbImages[lbIdx].src;
    imgEl.alt = lbImages[lbIdx].alt;
    updateNav();
  }

  function openLB(images, startIdx) {
    lbImages = images;
    overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
    showImage(startIdx || 0);
    if (btnClose) btnClose.focus();
  }

  function closeLB() {
    overlay.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(function () { imgEl.src = ''; lbImages = []; }, 250);
  }

  /* Carousel click → lightbox */
  document.querySelectorAll('.img-carousel').forEach(function (carousel) {
    carousel.addEventListener('click', function (e) {
      if (e.target.closest('.img-carousel__btn') || e.target.closest('.img-carousel__dots')) return;
      var slide = e.target.closest('.img-carousel__slide:not(.img-carousel__slide--placeholder)');
      if (!slide) return;
      if (slide.classList.contains('img-carousel__slide--video')) return;
      var clickedImg = slide.querySelector('img');
      if (!clickedImg) return;
      var images   = getCarouselImages(carousel);
      var startIdx = images.findIndex(function (im) { return im.src === clickedImg.src; });
      openLB(images, startIdx < 0 ? 0 : startIdx);
    });
  });

  /* Media-grid / img-placeholder click → lightbox (single-image zoom) */
  document.querySelectorAll('.img-placeholder img').forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function (e) {
      var src = e.currentTarget.getAttribute('src');
      if (!src) return;
      openLB([{ src: src, alt: img.alt || '' }], 0);
    });
  });

  if (btnPrev) btnPrev.addEventListener('click', function (e) { e.stopPropagation(); showImage(lbIdx - 1); });
  if (btnNext) btnNext.addEventListener('click', function (e) { e.stopPropagation(); showImage(lbIdx + 1); });

  var tx0 = 0;
  imgEl.addEventListener('touchstart', function (e) { tx0 = e.touches[0].clientX; }, { passive: true });
  imgEl.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx0;
    if (Math.abs(dx) > 40) showImage(dx < 0 ? lbIdx + 1 : lbIdx - 1);
  }, { passive: true });

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLB(); });
  if (btnClose) btnClose.addEventListener('click', closeLB);
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('on')) return;
    if (e.key === 'Escape')     { closeLB(); }
    if (e.key === 'ArrowLeft')  { showImage(lbIdx - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { showImage(lbIdx + 1); e.preventDefault(); }
  });
})();


/* ── CONTACT MODAL ── */
(function () {
  var modal   = document.getElementById('contact-modal');
  var closeBtn = document.getElementById('contact-close');
  var sendBtn  = document.getElementById('contact-send');
  var subject  = document.getElementById('contact-subject');
  var message  = document.getElementById('contact-message');
  var email    = document.getElementById('contact-email');
  if (!modal) return;

  window.openContact = function (deviceName) {
    subject.value = deviceName || '';
    message.value = '';
    email.value   = '';
    modal.classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { message.focus(); }, 50);
  };

  function closeContact() {
    modal.classList.remove('on');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeContact);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeContact(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('on')) closeContact();
  });

  sendBtn.addEventListener('click', function () {
    var subj = subject.value.trim() || 'DMG Labs Enquiry';
    var msg  = message.value.trim();
    var from = email.value.trim();
    var body = '';
    if (msg)  body += msg;
    if (from) body += (body ? '\n\n' : '') + 'Reply to: ' + from;
    var mailto = 'mailto:alexanderdemattosgabriel@gmail.com'
      + '?subject=' + encodeURIComponent(subj)
      + '&body='    + encodeURIComponent(body);
    window.location.href = mailto;
    closeContact();
  });
})();


/* ── CODE BLOCK: copy-to-clipboard ── */
(function () {
  document.querySelectorAll('.code-block__copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var codeEl = btn.closest('.code-block').querySelector('pre code');
      var text   = codeEl ? codeEl.textContent : '';

      function flashCopied() {
        var orig = btn.textContent;
        btn.textContent = 'COPIED!';
        btn.classList.add('code-block__copy--copied');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('code-block__copy--copied');
        }, 2000);
      }

      navigator.clipboard.writeText(text).then(flashCopied).catch(function () {
        /* Fallback for non-HTTPS or older browsers */
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashCopied();
      });
    });
  });
})();


/* ── PRISM SYNTAX HIGHLIGHTING ── */
/* Only runs when Prism is loaded on the page (guide pages). */
(function () {
  if (typeof Prism !== 'undefined') Prism.highlightAll();
})();


/* ── PAC-MAN CANVAS GAME ── */
/* Only runs when the canvas element exists (index.html). */
(function () {
  var CV = document.getElementById('pacman-canvas');
  if (!CV) return;
  var CTX = CV.getContext('2d');
  var W = CV.width, H = CV.height;
  var PS = 4;
  var COLS = Math.floor(W / PS);
  var ROWS = Math.floor(H / PS);
  var C = { bg: '#071208', wall: '#2e6647', dot: '#5db870', power: '#f06a00', pac: '#f06a00', g1: '#e05050', g2: '#5090f0', scared: '#234d38', text: '#5db870', score: '#f06a00' };
  var T = [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],[1,0,1,1,0,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],[1,0,1,1,0,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,1,0,0,0,1],[1,0,0,0,0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],[1,1,1,1,0,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,0,1,1,1,0,1,1,1,1,1,1],[2,2,2,1,0,1,2,2,2,2,4,4,4,4,4,4,4,4,4,2,2,2,2,1,0,1,2,2,2,2,2],[1,1,1,1,0,1,0,1,1,2,4,4,4,4,4,4,4,4,4,2,1,1,0,1,0,1,1,1,1,1,1],[2,2,2,2,0,2,0,1,1,2,4,4,4,4,4,4,4,4,4,2,1,1,0,2,0,2,2,2,2,2,2],[1,1,1,1,0,1,0,1,1,2,2,2,2,2,2,2,2,2,2,2,1,1,0,1,0,1,1,1,1,1,1],[2,2,2,1,0,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,2,2,2,2,2],[1,1,1,1,0,1,0,1,1,2,2,2,2,2,2,2,2,2,2,2,1,1,0,1,0,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,1,0,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],[1,3,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,3,0,1],[1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1],[1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],[1,0,1,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,1,1,1,1,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]];
  var MR = T.length, MC = T[0].length;
  var SX = Math.floor(W / MC), SY = Math.floor(H / MR);
  var OX = Math.floor((W - MC * SX) / 2), OY = Math.floor((H - MR * SY) / 2);
  function mxToCanvas(col, row) { return [OX + col * SX, OY + row * SY]; }
  var maze, dots, score, lives, dir, nextDir, px, py, pAnim, pMouth, ghosts, scared, scaredTimer, gameState, animFrame;
  function initGame() { maze = T.map(function (r) { return r.slice(); }); dots = 0; score = 0; lives = 3; for (var r = 0; r < MR; r++) for (var c = 0; c < MC; c++) { if (maze[r][c] === 0 || maze[r][c] === 3) dots++; } dir = { x: 0, y: 0 }; nextDir = { x: 1, y: 0 }; px = 1; py = 1; pAnim = 0; pMouth = 0; scared = false; scaredTimer = 0; ghosts = [{ x: 13, y: 11, dx: 1, dy: 0, col: C.g1 }, { x: 15, y: 11, dx: -1, dy: 0, col: C.g2 }]; gameState = 'attract'; }
  var KEY_MAP = { 'ArrowUp': { x: 0, y: -1 }, 'ArrowDown': { x: 0, y: 1 }, 'ArrowLeft': { x: -1, y: 0 }, 'ArrowRight': { x: 1, y: 0 }, 'w': { x: 0, y: -1 }, 's': { x: 0, y: 1 }, 'a': { x: -1, y: 0 }, 'd': { x: 1, y: 0 } };
  document.addEventListener('keydown', function (e) { var d = KEY_MAP[e.key]; if (d) { nextDir = d; if (gameState === 'attract' || gameState === 'dead' || gameState === 'win') startGame(); e.preventDefault(); } });
  ['up', 'down', 'left', 'right'].forEach(function (name) { var btn = document.getElementById('btn-' + name); if (!btn) return; var dm = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; var fire = function () { nextDir = dm[name]; if (gameState === 'attract' || gameState === 'dead' || gameState === 'win') startGame(); }; btn.addEventListener('click', fire); btn.addEventListener('touchstart', function (e) { fire(); e.preventDefault(); }, { passive: false }); });
  function startGame() { if (gameState === 'win' || gameState === 'dead') initGame(); gameState = 'playing'; }
  function isWall(c, r) { if (c < 0) c = MC - 1; if (c >= MC) c = 0; if (r < 0 || r >= MR) return true; return maze[r][c] === 1; }
  function wrapC(c) { return ((c % MC) + MC) % MC; }
  var tick = 0;
  function update() { if (gameState !== 'playing') return; tick++; if (tick % 5 !== 0) return; pAnim = (pAnim + 1) % 8; pMouth = pAnim < 4 ? pAnim / 4 : (8 - pAnim) / 4; var tc = wrapC(Math.round(px) + nextDir.x), tr = Math.round(py) + nextDir.y; if (!isWall(tc, tr)) { dir = nextDir; } var nc = wrapC(Math.round(px) + dir.x), nr = Math.round(py) + dir.y; if (!isWall(nc, nr)) { px = nc; py = nr; } var cr = Math.round(py), cc = wrapC(Math.round(px)); if (maze[cr][cc] === 0) { maze[cr][cc] = 2; score += 10; dots--; } if (maze[cr][cc] === 3) { maze[cr][cc] = 2; score += 50; dots--; scared = true; scaredTimer = 60; } if (scared) { scaredTimer--; if (scaredTimer <= 0) scared = false; } ghosts.forEach(function (g) { var dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]; var nc2 = wrapC(Math.round(g.x) + g.dx), nr2 = Math.round(g.y) + g.dy; if (!isWall(nc2, nr2) && Math.random() > 0.3) { g.x = nc2; g.y = nr2; } else { var shuffled = dirs.sort(function () { return Math.random() - 0.5; }); for (var i = 0; i < shuffled.length; i++) { var d = shuffled[i]; var gc = wrapC(Math.round(g.x) + d.x), gr = Math.round(g.y) + d.y; if (!isWall(gc, gr)) { g.dx = d.x; g.dy = d.y; g.x = gc; g.y = gr; break; } } } if (Math.abs(g.x - px) <= 1 && Math.abs(g.y - py) <= 1) { if (scared) { score += 200; g.x = 13; g.y = 11; } else { lives--; px = 1; py = 1; dir = { x: 0, y: 0 }; nextDir = { x: 1, y: 0 }; if (lives <= 0) gameState = 'dead'; } } }); if (dots <= 0) gameState = 'win'; }
  function drawMaze() { for (var r = 0; r < MR; r++) { for (var c = 0; c < MC; c++) { var pos = mxToCanvas(c, r); var cx = pos[0], cy = pos[1]; var cell = maze[r][c]; if (cell === 1) { CTX.fillStyle = C.wall; CTX.fillRect(cx, cy, SX, SY); } else if (cell === 0) { var dx = cx + Math.floor(SX / 2) - 1, dy = cy + Math.floor(SY / 2) - 1; CTX.fillStyle = C.dot; CTX.fillRect(dx, dy, 2, 2); } else if (cell === 3) { var blink = (tick % 16) < 8; if (blink) { var bx = cx + Math.floor(SX / 2) - 2, by = cy + Math.floor(SY / 2) - 2; CTX.fillStyle = C.power; CTX.fillRect(bx, by, 4, 4); } } } } }
  function drawPacman() { var pos = mxToCanvas(Math.round(px), Math.round(py)); var cx = pos[0], cy = pos[1]; var r2 = Math.floor(SX * 0.45); var cx2 = cx + Math.floor(SX / 2), cy2 = cy + Math.floor(SY / 2); var mouthAngle = pMouth * 0.7; var baseAngle = dir.x > 0 ? 0 : dir.x < 0 ? Math.PI : dir.y > 0 ? Math.PI * 0.5 : -Math.PI * 0.5; CTX.fillStyle = C.pac; CTX.beginPath(); CTX.moveTo(cx2, cy2); CTX.arc(cx2, cy2, r2, baseAngle + mouthAngle, baseAngle + Math.PI * 2 - mouthAngle); CTX.closePath(); CTX.fill(); var ex = cx2 + Math.cos(baseAngle - 0.5) * r2 * 0.5; var ey = cy2 + Math.sin(baseAngle - 0.5) * r2 * 0.5; CTX.fillStyle = '#071208'; CTX.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2); }
  function drawGhosts() { ghosts.forEach(function (g) { var pos = mxToCanvas(Math.round(g.x), Math.round(g.y)); var cx = pos[0], cy = pos[1]; var gx = cx + 1, gy = cy + 1, gw = SX - 2, gh = SY - 2; var col = scared ? (tick % 8 < 4 ? C.scared : '#4a7c59') : g.col; CTX.fillStyle = col; CTX.fillRect(gx, gy + Math.floor(gh * 0.35), gw, Math.ceil(gh * 0.65)); CTX.beginPath(); CTX.arc(gx + gw / 2, gy + Math.floor(gh * 0.35), gw / 2, Math.PI, 0); CTX.fill(); var wy = gy + gh; for (var i = 0; i < 3; i++) { CTX.fillStyle = C.bg; CTX.beginPath(); CTX.arc(gx + (i + 0.5) * (gw / 3), wy, gw / 6, 0, Math.PI); CTX.fill(); } if (!scared) { CTX.fillStyle = '#fff'; CTX.fillRect(gx + 2, gy + 3, 3, 3); CTX.fillRect(gx + gw - 5, gy + 3, 3, 3); CTX.fillStyle = '#00f'; CTX.fillRect(gx + 3, gy + 4, 1, 1); CTX.fillRect(gx + gw - 4, gy + 4, 1, 1); } }); }
  function drawHUD() { CTX.fillStyle = C.score; CTX.font = 'bold 7px monospace'; CTX.fillText('SC:' + score, 2, 8); for (var i = 0; i < lives; i++) { var lx = W - 6 - i * 10, ly = 5; CTX.fillStyle = C.pac; CTX.beginPath(); CTX.moveTo(lx, ly); CTX.arc(lx, ly, 4, 0.3, Math.PI * 2 - 0.3); CTX.closePath(); CTX.fill(); } }
  function drawOverlay(msg, sub) { CTX.fillStyle = 'rgba(7,18,8,0.72)'; CTX.fillRect(0, 0, W, H); CTX.fillStyle = C.pac; CTX.font = 'bold 14px monospace'; CTX.textAlign = 'center'; CTX.fillText(msg, W / 2 - 7, H / 2 - 7); if (sub) { CTX.fillStyle = C.text; CTX.font = '10px monospace'; CTX.fillText(sub, W / 2 - 7, H / 2 + 7); } CTX.textAlign = 'left'; }
  function loop() { CTX.fillStyle = C.bg; CTX.fillRect(0, 0, W, H); update(); drawMaze(); if (gameState !== 'attract') drawPacman(); drawGhosts(); drawHUD(); if (gameState === 'attract') drawOverlay('DMG PAC', 'PRESS ARROW KEY'); if (gameState === 'dead') drawOverlay('GAME OVER', 'PRESS ARROW KEY'); if (gameState === 'win') drawOverlay('YOU WIN!', 'PRESS ARROW KEY'); animFrame = requestAnimationFrame(loop); }
  initGame();
  setTimeout(function () { loop(); }, 300);
})();

