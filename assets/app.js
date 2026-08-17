/* =========================================================
   Domaine de Beauvent
   Rien d'externe, rien à compiler. Un seul fichier.
   ========================================================= */
(function () {
'use strict';

var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
var smoothstep = function (p, e0, e1) {
  var t = clamp((p - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
function rng(seed) {
  var s = seed >>> 0;
  return function () { return (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
}

/* =========================================================
   1. LE CAVEAU EST-IL OUVERT ? (heure de Zurich, pas celle du visiteur)
   ========================================================= */
var HORAIRE = { 2: [17, 19], 3: [17, 19], 4: [17, 19], 5: [17, 19], 6: [9, 12] };
var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var EN2NUM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function heureZurich() {
  var parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  var o = {};
  parts.forEach(function (p) { o[p.type] = p.value; });
  return { jour: EN2NUM[o.weekday], h: parseInt(o.hour, 10), m: parseInt(o.minute, 10) };
}

function etatCaveau() {
  var n = heureZurich();
  var mins = n.h * 60 + n.m;
  var auj = HORAIRE[n.jour];
  if (auj && mins >= auj[0] * 60 && mins < auj[1] * 60) {
    return { ouvert: true, texte: 'Le caveau est ouvert. Jusqu’à ' + auj[1] + 'h.' };
  }
  for (var d = 0; d < 8; d++) {
    var j = (n.jour + d) % 7;
    var h = HORAIRE[j];
    if (!h) continue;
    if (d === 0 && mins >= h[0] * 60) continue;
    var quand = d === 0 ? 'aujourd’hui' : (d === 1 ? 'demain' : JOURS[j]);
    return { ouvert: false, texte: 'Le caveau est fermé. Il rouvre ' + quand + ' à ' + h[0] + 'h.' };
  }
  return { ouvert: false, texte: 'Le caveau est fermé.' };
}

var statusText = document.getElementById('status-text');
var statusDot = document.querySelector('.status-dot');
var dernierEtat = null;
function majStatut() {
  var e = etatCaveau();
  if (dernierEtat === e.texte) return;          /* on n'écrit que si ça change */
  dernierEtat = e.texte;
  if (statusText) statusText.textContent = e.texte;
  if (statusDot) statusDot.setAttribute('data-open', e.ouvert ? 'true' : 'false');
}
majStatut();
setInterval(majStatut, 60000);

/* =========================================================
   2. LE HÉRO SCRUBÉ
   ========================================================= */
/* Trois tailles du film. On sert celle que l'écran affiche vraiment: au-delà,
   ce sont des pixels payés en fluidité pour rien, puisque le coût de décodage
   d'une image commande le nombre d'images que le défilement peut afficher. */
var FILMS = [
  { largeur: 1280, url: 'assets/hero-scrub-1280.mp4', octets: 17044756 },
  { largeur: 1600, url: 'assets/hero-scrub-1600.mp4', octets: 24104761 },
  { largeur: 1920, url: 'assets/hero-scrub-1920.mp4', octets: 32118688 }
];
function choisirFilm() {
  /* la scène est en plein écran et le film la remplit en "cover",
     donc la largeur réellement affichée est le plus grand des deux */
  var besoin = Math.max(window.innerWidth, window.innerHeight * 16 / 9);
  if (besoin <= 1400) return FILMS[0];
  if (besoin <= 1800) return FILMS[1];
  return FILMS[2];
}
var FILM = choisirFilm();
var VIDEO_URL = FILM.url;
var VIDEO_BYTES = FILM.octets;
var POSTER_URL = 'assets/img/hero-poster.jpg';

var hero = document.querySelector('.hero');
var stage = document.querySelector('.stage');
var video = document.getElementById('hero-video');
var ring = document.querySelector('.ring');
var posterLayer = document.querySelector('.poster');
var bandEls = [].slice.call(document.querySelectorAll('.band'));

/* ---- découpage du texte, une fois au chargement ---- */
function decouper(el, entrance, spread, seed) {
  var texte = el.textContent.trim();
  var r = rng(seed);

  if (entrance === 'blur') {
    el.textContent = '';
    var soft = document.createElement('span'); soft.className = 'soft'; soft.textContent = texte;
    var sharp = document.createElement('span'); sharp.className = 'sharp'; sharp.textContent = texte;
    el.appendChild(soft); el.appendChild(sharp);
    return;
  }

  var mots = texte.split(/(\s+)/).filter(function (t) { return t.length; });
  el.textContent = '';
  var parLettre = (entrance === 'grid');
  var totalLettres = texte.replace(/\s/g, '').length;
  var iLettre = 0, iMot = 0, nbMots = mots.filter(function (m) { return !/^\s+$/.test(m); }).length;

  mots.forEach(function (mot) {
    if (/^\s+$/.test(mot)) { el.appendChild(document.createTextNode(' ')); return; }
    var w = document.createElement('span');
    w.className = 'w';
    if (!parLettre) {
      w.style.setProperty('--th', (iMot / Math.max(1, nbMots) * 0.46).toFixed(3));
      w.textContent = mot;
      iMot++;
    } else {
      for (var i = 0; i < mot.length; i++) {
        var c = document.createElement('span');
        c.className = 'c';
        c.textContent = mot[i];
        c.style.setProperty('--th', (iLettre / Math.max(1, totalLettres) * spread + r() * 0.06).toFixed(3));
        c.style.setProperty('--jx', ((r() * 2 - 1) * 34).toFixed(1) + 'px');
        iLettre++;
        w.appendChild(c);
      }
    }
    el.appendChild(w);
  });
}

var bands = bandEls.map(function (el, i) {
  var entrance = el.getAttribute('data-entrance');
  var h = el.querySelector('.band-h');
  if (h) decouper(h, entrance, parseFloat(el.getAttribute('data-spread')) || 0.5, 9137 + i * 733);
  var a = parseFloat(el.getAttribute('data-a'));
  var b = parseFloat(el.getAttribute('data-b'));
  return {
    el: el, a: a, b: b,
    ramp: parseFloat(el.getAttribute('data-ramp')) || Math.min(0.025, (b - a) * 0.35),
    settle: el.classList.contains('band-settle'),
    first: i === 0, last: i === bandEls.length - 1,
    op: -1, k: -1
  };
});

/* ---- l'état de la page ---- */
var cible = 0, montre = 0, rafId = null, lastTick = 0;
var heroVisible = true;
var scrubOn = false;
var loadK = 0, loadDebut = 0;

function heroProgress() {
  if (!hero) return 0;
  var r = hero.getBoundingClientRect();
  var course = hero.offsetHeight - window.innerHeight;
  if (course <= 0) return 0;
  return clamp(-r.top / course, 0, 1);
}

/* ---- les seeks, jamais deux à la fois ---- */
var seekBusy = false, pendingTime = null;
function requestSeek(t) {
  if (!video.duration) return;
  if (seekBusy) { pendingTime = t; return; }
  seekBusy = true;
  video.currentTime = t;
}
video.addEventListener('seeked', function () {
  seekBusy = false;
  if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
});
video.addEventListener('error', function () { seekBusy = false; pendingTime = null; failVideo(); });

/* ---- les bandes ---- */
function majBandes(p) {
  for (var i = 0; i < bands.length; i++) {
    var b = bands[i];
    var f = Math.min(0.02, (b.b - b.a) / 3);
    var op;
    if (b.first) op = 1 - smoothstep(p, b.b - f, b.b);
    else if (b.last) op = smoothstep(p, b.a, b.a + f);
    else op = smoothstep(p, b.a, b.a + f) * (1 - smoothstep(p, b.b - f, b.b));

    var k = clamp((p - b.a) / b.ramp, 0, 1);
    if (b.first) k = Math.max(k, loadK);

    if (Math.abs(op - b.op) > 0.006) { b.op = op; b.el.style.opacity = op.toFixed(3); }
    if (Math.abs(k - b.k) > 0.008) {
      b.k = k;
      b.el.style.setProperty('--k', k.toFixed(3));
      if (b.settle) {
        b.el.style.setProperty('--ks', clamp((k - 0.5) * 3, 0, 1).toFixed(3));
        b.el.style.setProperty('--kb', clamp((k - 0.7) * 3.4, 0, 1).toFixed(3));
      }
    }
  }
}

/* ---- la boucle, qui se rendort ---- */
function tick(now) {
  var dt = Math.min(100, now - (lastTick || now));
  lastTick = now;

  if (loadDebut && loadK < 1) {
    loadK = clamp((now - loadDebut) / 900, 0, 1);
    loadK = loadK * loadK * (3 - 2 * loadK);
  }

  var k = 0.16;
  montre += (cible - montre) * (1 - Math.pow(1 - k, dt / 16.667));
  var converge = Math.abs(cible - montre) < 0.0005 && loadK >= 1;
  if (converge) { montre = cible; rafId = null; lastTick = 0; }
  else rafId = requestAnimationFrame(tick);

  requestSeek(montre * (video.duration || 0));
  majBandes(montre);
}

function onScroll() {
  cible = heroProgress();
  if (rafId === null && heroVisible && scrubOn) { lastTick = 0; rafId = requestAnimationFrame(tick); }
}

/* ---- le chargement de la vidéo, derrière l'anneau ---- */
var heroLance = false;
function initHeroOnce() {
  if (heroLance) return;
  heroLance = true;
  posterLayer.style.backgroundImage = "url('" + POSTER_URL + "')";
  loadDebut = performance.now();

  var demarre = false;
  function startBlobFetch() {
    if (demarre) return;
    demarre = true;
    chargerVideo().catch(failVideo);
  }
  var img = new Image();
  img.onload = startBlobFetch;
  img.onerror = startBlobFetch;
  img.src = POSTER_URL;
  setTimeout(startBlobFetch, 4000);
}

function chargerVideo() {
  var ctrl = new AbortController();
  var watchdog = setTimeout(function () { ctrl.abort(); }, 20000);

  return fetch(VIDEO_URL, { signal: ctrl.signal }).then(function (res) {
    if (!res.ok || !res.body) throw new Error('http ' + res.status);
    var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
    var reader = res.body.getReader();
    var chunks = [], got = 0, lastRing = 0;

    return (function pump() {
      return reader.read().then(function (r) {
        if (r.done) return;
        clearTimeout(watchdog);
        watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
        chunks.push(r.value);
        got += r.value.length;
        var frac = Math.min(1, got / total);
        var now = performance.now();
        if (now - lastRing > 100 || frac === 1) {
          lastRing = now;
          ring.style.setProperty('--ld', Math.round(126 * (1 - frac)));
        }
        return pump();
      });
    })().then(function () {
      clearTimeout(watchdog);
      ring.style.setProperty('--ld', 0);
      video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
      video.load();
      video.addEventListener('canplay', function () {
        requestSeek(heroProgress() * video.duration);
        stage.classList.add('video-ready');
        setTimeout(lancerIntro, 900);   /* le temps que l'image se fonde sur le poster */
      }, { once: true });
    });
  });
}

function failVideo() {
  if (stage.classList.contains('video-failed')) return;
  stage.classList.add('video-failed');   /* le poster porte toute la page */
}

/* ---- l'amorce: la descente part toute seule, et rend la main au premier geste ----
   Elle entraîne le film ET la page ensemble, pour qu'il n'y ait rien à rattraper
   quand le visiteur prend le relais. */
var introFaite = false, introRaf = null, introAttendu = 0;

function stopIntro() {
  if (introRaf !== null) { cancelAnimationFrame(introRaf); introRaf = null; }
}

function lancerIntro() {
  if (introFaite || !scrubOn) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.scrollY > 4) return;              /* le visiteur a déjà pris la main */
  introFaite = true;

  var course = hero.offsetHeight - window.innerHeight;
  if (course <= 0) return;
  var fin = course * 0.055;                    /* environ une seconde de film */
  var t0 = performance.now(), duree = 2800;

  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, stopIntro, { passive: true, once: true });
  });

  function pas(now) {
    /* si la position n'est plus celle qu'on a écrite, c'est le visiteur: on s'efface */
    if (Math.abs(window.scrollY - introAttendu) > 6) { introRaf = null; return; }
    var t = clamp((now - t0) / duree, 0, 1);
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    introAttendu = Math.round(fin * e);
    window.scrollTo({ top: introAttendu, behavior: 'instant' });
    onScroll();
    introRaf = t < 1 ? requestAnimationFrame(pas) : null;
  }
  introRaf = requestAnimationFrame(pas);
}

if (hero) {
  var io = new IntersectionObserver(function (es) {
    heroVisible = es[0].isIntersecting;
    if (heroVisible && scrubOn) onScroll();
  }, { threshold: 0 });
  io.observe(hero);
}

/* ---- les cinq portes, décidées en direct ---- */
var GATES = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)'
];
var MQLS = GATES.map(function (q) { return matchMedia(q); });

function enableScrub() {
  if (scrubOn) return;
  scrubOn = true;
  initHeroOnce();
  window.addEventListener('scroll', onScroll, { passive: true });
  bands.forEach(function (b) { b.op = -1; b.k = -1; });
  unpinFinalStates();
  majBandes(heroProgress());
  onScroll();
}
function disableScrub() {
  if (!scrubOn) return;
  scrubOn = false;
  stopIntro();
  window.removeEventListener('scroll', onScroll);
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
function applyHeroMode() {
  var gated = MQLS.some(function (m) { return m.matches; });
  if (gated) disableScrub(); else enableScrub();
}
MQLS.forEach(function (m) { m.addEventListener('change', applyHeroMode); });

/* =========================================================
   3. LES ENTRÉES AU SCROLL
   ========================================================= */
var reveals = [].slice.call(document.querySelectorAll('.reveal'));
var ioReveal = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    setTimeout(function () { e.target.classList.add('settled'); }, 1400);
    ioReveal.unobserve(e.target);
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
reveals.forEach(function (el) { ioReveal.observe(el); });

/* ---- la ligne de crête qui se dessine ---- */
var ridge = document.querySelector('.ridge');
var ridgeLine = document.querySelector('.ridge-line');
if (ridge && ridgeLine) {
  var len = Math.ceil(ridgeLine.getTotalLength());
  ridge.style.setProperty('--len', len);
  var ioRidge = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { ridge.classList.add('drawn'); ioRidge.disconnect(); }
  }, { threshold: 0.4 });
  ioRidge.observe(ridge);
}

/* =========================================================
   4. LA SEMAINE, le moment que le visiteur joue
   ========================================================= */
var hold = document.getElementById('hold');
var week = document.getElementById('week');
var promise = document.getElementById('promise');
var weekCount = document.getElementById('week-count');
var hint = document.getElementById('semaine-hint');
var slots = week ? [].slice.call(week.querySelectorAll('.slot')) : [];
var HEURES_TOTAL = 11;

var holdP = 0, holdActif = false, holdRaf = null, holdLast = 0, dernierCompte = -1, fini = false;

function peindreSemaine(p) {
  var heures = p * HEURES_TOTAL;
  var cumul = 0;
  slots.forEach(function (s) {
    var n = parseFloat(s.getAttribute('data-h'));
    s.style.setProperty('--fill', clamp((heures - cumul) / n, 0, 1).toFixed(3));
    cumul += n;
  });
  var affiche = Math.round(heures);
  if (affiche !== dernierCompte) {
    dernierCompte = affiche;
    if (weekCount) weekCount.innerHTML = '<b>' + affiche + '</b> / 11 heures';
  }
  if (p >= 1 && !fini) {
    fini = true;
    hold.classList.add('done');
    hold.querySelector('.hold-label').textContent = 'Ouvert';
    if (promise) promise.classList.add('lit');
    if (hint) hint.textContent = 'Voilà la semaine entière.';
  }
}

function holdTick(now) {
  var dt = Math.min(80, now - (holdLast || now));
  holdLast = now;
  var vitesse = holdActif ? 1 / 1500 : -1 / 900;
  holdP = clamp(holdP + dt * vitesse, 0, 1);
  hold.style.setProperty('--hold', holdP.toFixed(3));
  peindreSemaine(holdP);
  if ((holdActif && holdP < 1) || (!holdActif && holdP > 0)) holdRaf = requestAnimationFrame(holdTick);
  else { holdRaf = null; holdLast = 0; }
}
function holdStart(e) {
  if (e && e.cancelable) e.preventDefault();
  if (fini) return;
  holdActif = true;
  if (holdRaf === null) { holdLast = 0; holdRaf = requestAnimationFrame(holdTick); }
}
function holdStop() {
  holdActif = false;
  if (holdRaf === null && holdP > 0) { holdLast = 0; holdRaf = requestAnimationFrame(holdTick); }
}
if (hold) {
  hold.addEventListener('pointerdown', holdStart);
  hold.addEventListener('pointerup', holdStop);
  hold.addEventListener('pointercancel', holdStop);
  hold.addEventListener('pointerleave', holdStop);
  /* clavier: Entrée ou Espace donne l'état final d'un coup */
  hold.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); holdP = 1; hold.style.setProperty('--hold', 1); peindreSemaine(1); }
  });
}

/* =========================================================
   5. LE FORMULAIRE (mailto: le message part dans une vraie boîte)
   ========================================================= */
var form = document.getElementById('form');
if (form) {
  var champs = [
    { id: 'f-nom', err: 'e-nom', ok: function (v) { return v.trim().length > 1; } },
    { id: 'f-mail', err: 'e-mail', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    { id: 'f-msg', err: 'e-msg', ok: function (v) { return v.trim().length > 4; } }
  ];
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valide = true;
    champs.forEach(function (c) {
      var el = document.getElementById(c.id);
      var er = document.getElementById(c.err);
      var bon = c.ok(el.value);
      er.hidden = bon;
      el.setAttribute('aria-invalid', bon ? 'false' : 'true');
      if (!bon && valide) { el.focus(); }
      if (!bon) valide = false;
    });
    if (!valide) return;

    var nom = document.getElementById('f-nom').value.trim();
    var mail = document.getElementById('f-mail').value.trim();
    var msg = document.getElementById('f-msg').value.trim();
    var corps = msg + '\n\n' + nom + '\n' + mail;
    window.location.href = 'mailto:info@domainedebeauvent.ch'
      + '?subject=' + encodeURIComponent('Message du site, ' + nom)
      + '&body=' + encodeURIComponent(corps);
    document.getElementById('form-ok').hidden = false;
  });
}

/* =========================================================
   6. MOUVEMENT RÉDUIT, dans les deux sens
   ========================================================= */
function pinToFinalStates() {
  reveals.forEach(function (el) { el.classList.add('in', 'settled'); });
  if (ridge) ridge.classList.add('drawn');
  if (promise) promise.classList.add('lit');
  stopIntro();
  if (hold) { holdP = 1; fini = true; hold.classList.add('done'); hold.style.setProperty('--hold', 1); }
  slots.forEach(function (s) { s.style.setProperty('--fill', 1); });
  if (weekCount) weekCount.innerHTML = '<b>11</b> / 11 heures';
  if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
function unpinFinalStates() {
  /* le scroll reprend la main sur ce que pinToFinalStates avait figé */
  if (ridge && !ridge.classList.contains('was-drawn')) ridge.classList.remove('drawn');
  if (promise) promise.classList.remove('lit');
  if (hold && !fini) { hold.classList.remove('done'); hold.style.setProperty('--hold', 0); }
}

var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
mqReduce.addEventListener('change', function (e) {
  if (e.matches) pinToFinalStates(); else applyHeroMode();
});
if (mqReduce.matches) pinToFinalStates();

/* =========================================================
   7. ON MET TOUT EN PAUSE QUAND L'ONGLET EST CACHÉ
   ========================================================= */
document.addEventListener('visibilitychange', function () {
  document.body.classList.toggle('paused', document.hidden);
  if (document.hidden && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  else if (!document.hidden && scrubOn) onScroll();
});

/* ---- départ ---- */
applyHeroMode();

})();

/* =========================================================
   LA COUCHE VIVANTE
   Un seul moteur de scroll, des écritures uniquement sur changement,
   et rien d'autre que transform et opacity.
   ========================================================= */
(function () {
'use strict';

var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
var doux = matchMedia('(prefers-reduced-motion: reduce)');
var finPointeur = matchMedia('(pointer: fine)');

/* ---------------------------------------------------------
   1. LE MOTEUR: une boucle unique, qui dort quand rien ne bouge
   --------------------------------------------------------- */
var acteurs = [];       /* {el, visible, run(progres)} */
var raf = null;

function boucle() {
  var actif = false;
  var vh = window.innerHeight;
  for (var i = 0; i < acteurs.length; i++) {
    var a = acteurs[i];
    if (!a.visible) continue;
    actif = true;
    var r = a.el.getBoundingClientRect();
    /* 0 quand l'element entre par le bas, 1 quand il sort par le haut */
    a.run(clamp((vh - r.top) / (vh + r.height), 0, 1));
  }
  raf = actif ? requestAnimationFrame(boucle) : null;
}
function reveiller() { if (raf === null) raf = requestAnimationFrame(boucle); }

var ioMoteur = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    var a = acteurs.find(function (x) { return x.el === e.target; });
    if (a) a.visible = e.isIntersecting;
  });
  reveiller();
}, { rootMargin: '80px 0px' });

function inscrire(el, run) {
  acteurs.push({ el: el, visible: false, run: run });
  ioMoteur.observe(el);
}
window.addEventListener('scroll', reveiller, { passive: true });
window.addEventListener('resize', reveiller, { passive: true });

/* ---------------------------------------------------------
   2. PARALLAXE sur les images
   --------------------------------------------------------- */
if (!doux.matches) {
  [].slice.call(document.querySelectorAll('[data-parallax]')).forEach(function (fig) {
    var amp = parseFloat(fig.getAttribute('data-parallax')) || 20;
    var img = fig.querySelector('img');
    var dernier = null;
    inscrire(fig, function (p) {
      var y = ((p - 0.5) * -2 * amp).toFixed(1);
      if (y === dernier) return;             /* on n'ecrit que si ca change */
      dernier = y;
      img.style.setProperty('--py', y + 'px');
    });
  });
}

/* ---------------------------------------------------------
   3. LES CHIFFRES QUI MONTENT
   --------------------------------------------------------- */
var ioNum = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    ioNum.unobserve(e.target);
    var el = e.target, cible = parseInt(el.getAttribute('data-count'), 10);
    if (doux.matches) { el.textContent = cible; return; }
    var t0 = performance.now(), dur = 1100, dernier = -1;
    (function pas(now) {
      var t = clamp((now - t0) / dur, 0, 1);
      var e2 = 1 - Math.pow(1 - t, 3);
      var v = Math.round(cible * e2);
      if (v !== dernier) { dernier = v; el.textContent = v; }
      if (t < 1) requestAnimationFrame(pas);
    })(t0);
  });
}, { threshold: 0.6 });
[].slice.call(document.querySelectorAll('.num[data-count]')).forEach(function (n) {
  if (!doux.matches) n.textContent = '0';
  ioNum.observe(n);
});

/* ---------------------------------------------------------
   4. LES CARTES DE COULEUR: relief et lueur sous le pointeur
   --------------------------------------------------------- */
if (finPointeur.matches && !doux.matches) {
  [].slice.call(document.querySelectorAll('.vin')).forEach(function (carte) {
    var rect = null, tRaf = null, mx = 50, my = 50, rx = 0, ry = 0;
    function ecrire() {
      carte.style.setProperty('--mx', mx.toFixed(1) + '%');
      carte.style.setProperty('--my', my.toFixed(1) + '%');
      carte.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      carte.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      tRaf = null;
    }
    carte.addEventListener('pointerenter', function () {
      rect = carte.getBoundingClientRect();
      carte.classList.add('tilting');
      carte.style.setProperty('--glow', 1);
    });
    carte.addEventListener('pointermove', function (e) {
      if (!rect) rect = carte.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      mx = x * 100; my = y * 100;
      ry = (x - 0.5) * 7; rx = (0.5 - y) * 7;
      if (tRaf === null) tRaf = requestAnimationFrame(ecrire);
    });
    carte.addEventListener('pointerleave', function () {
      carte.classList.remove('tilting');
      carte.style.setProperty('--glow', 0);
      rx = 0; ry = 0;
      if (tRaf === null) tRaf = requestAnimationFrame(ecrire);
      rect = null;
    });
  });
}

/* ---------------------------------------------------------
   5. LE RAIL DES CUVÉES, qui se tire à la main
   --------------------------------------------------------- */
var rail = document.getElementById('rail');
if (rail) {
  var tire = false, xDepart = 0, gaucheDepart = 0, bouge = false;
  rail.addEventListener('pointerdown', function (e) {
    tire = true; bouge = false;
    xDepart = e.clientX; gaucheDepart = rail.scrollLeft;
    rail.classList.add('dragging');
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', function (e) {
    if (!tire) return;
    var d = e.clientX - xDepart;
    if (Math.abs(d) > 3) bouge = true;
    rail.scrollLeft = gaucheDepart - d;
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    rail.addEventListener(t, function (e) {
      if (!tire) return;
      tire = false;
      rail.classList.remove('dragging');
      try { rail.releasePointerCapture(e.pointerId); } catch (err) {}
    });
  });
  rail.addEventListener('click', function (e) { if (bouge) e.preventDefault(); }, true);
  /* clavier: les fleches font defiler le rail */
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { rail.scrollLeft += 160; e.preventDefault(); }
    if (e.key === 'ArrowLeft') { rail.scrollLeft -= 160; e.preventDefault(); }
  });
}

/* ---------------------------------------------------------
   6. LA FAQ QUI S'OUVRE EN DOUCEUR
   --------------------------------------------------------- */
[].slice.call(document.querySelectorAll('.faq details')).forEach(function (d) {
  var corps = d.querySelector('.faq-body');
  var interne = d.querySelector('.faq-inner');
  if (!corps || !interne) return;
  function ajuster() {
    if (doux.matches) { corps.style.height = d.open ? 'auto' : '0px'; return; }
    corps.style.height = (d.open ? interne.offsetHeight : 0) + 'px';
  }
  d.addEventListener('toggle', ajuster);
  new ResizeObserver(function () { if (d.open) ajuster(); }).observe(interne);
  ajuster();
});

/* ---------------------------------------------------------
   7. LE BOUTON PRINCIPAL, AIMANTÉ
   --------------------------------------------------------- */
if (finPointeur.matches && !doux.matches) {
  [].slice.call(document.querySelectorAll('.btn-accent')).forEach(function (btn) {
    btn.classList.add('magnet');
    var r = null, bRaf = null, bx = 0, by = 0;
    function ecrire() { btn.style.setProperty('--bx', bx.toFixed(1) + 'px'); btn.style.setProperty('--by', by.toFixed(1) + 'px'); bRaf = null; }
    btn.addEventListener('pointerenter', function () { r = btn.getBoundingClientRect(); btn.classList.add('pulling'); });
    btn.addEventListener('pointermove', function (e) {
      if (!r) r = btn.getBoundingClientRect();
      bx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      by = (e.clientY - (r.top + r.height / 2)) * 0.3;
      if (bRaf === null) bRaf = requestAnimationFrame(ecrire);
    });
    btn.addEventListener('pointerleave', function () {
      btn.classList.remove('pulling');
      bx = 0; by = 0;
      if (bRaf === null) bRaf = requestAnimationFrame(ecrire);
      r = null;
    });
  });
}

/* ---------------------------------------------------------
   8. LES CITATIONS, RÉVÉLÉES MOT À MOT
   --------------------------------------------------------- */
[].slice.call(document.querySelectorAll('.q p')).forEach(function (p) {
  var mots = p.textContent.trim().split(/\s+/);
  p.textContent = '';
  mots.forEach(function (m, i) {
    var s = document.createElement('span');
    s.className = 'qw';
    s.textContent = m;
    s.style.transitionDelay = (i * 0.035).toFixed(3) + 's';
    p.appendChild(s);
    if (i < mots.length - 1) p.appendChild(document.createTextNode(' '));
  });
});
var ioQ = new IntersectionObserver(function (es) {
  es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('said'); ioQ.unobserve(e.target); } });
}, { threshold: 0.35 });
[].slice.call(document.querySelectorAll('.q')).forEach(function (q) { ioQ.observe(q); });

/* ---------------------------------------------------------
   9. LE VOILE DE BRUME DU RÉCIT
   --------------------------------------------------------- */
var coteau = document.querySelector('.coteau');
if (coteau && !doux.matches) {
  var dernierF = null;
  inscrire(coteau, function (p) {
    var f = Math.min(1, p * 1.4).toFixed(2);
    if (f === dernierF) return;
    dernierF = f;
    coteau.style.setProperty('--fog', f);
  });
}

/* ---------------------------------------------------------
   10. LE COMPTE À REBOURS RÉEL JUSQU'À L'OUVERTURE
   --------------------------------------------------------- */
var elCompte = document.getElementById('status-count');
var HOR = { 2: [17, 19], 3: [17, 19], 4: [17, 19], 5: [17, 19], 6: [9, 12] };
function zurich() {
  var o = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
  return { j: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], h: +o.hour, m: +o.minute };
}
function majCompte() {
  if (!elCompte) return;
  var n = zurich(), mins = n.h * 60 + n.m, auj = HOR[n.j], txt = '';
  if (auj && mins >= auj[0] * 60 && mins < auj[1] * 60) {
    var reste = auj[1] * 60 - mins;
    txt = 'encore ' + (reste >= 60 ? Math.floor(reste / 60) + ' h ' + (reste % 60) + ' min' : reste + ' min');
  } else {
    for (var d = 0; d < 8; d++) {
      var j = (n.j + d) % 7, h = HOR[j];
      if (!h) continue;
      if (d === 0 && mins >= h[0] * 60) continue;
      var delta = d * 1440 + h[0] * 60 - mins;
      var jours = Math.floor(delta / 1440), heures = Math.floor((delta % 1440) / 60), minutes = delta % 60;
      txt = 'dans ' + (jours ? jours + ' j ' : '') + (jours || heures ? heures + ' h ' : '') + minutes + ' min';
      break;
    }
  }
  if (elCompte.textContent !== txt) elCompte.textContent = txt;
}
majCompte();
setInterval(majCompte, 30000);

})();
