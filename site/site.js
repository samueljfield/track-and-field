const banner = document.querySelector('.banner');
const toggle = banner.querySelector('.banner__toggle');
const links = [...banner.querySelectorAll('.banner__links a')];

const setOpen = (open) => {
  banner.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.textContent = open ? 'close' : 'menu';
};

// Banner drops in once the hero has scrolled nearly out of view
new IntersectionObserver(([entry]) => {
  banner.classList.toggle('is-visible', !entry.isIntersecting);
  if (entry.isIntersecting) setOpen(false);
}, { rootMargin: '-120px 0px 0px 0px' }).observe(document.querySelector('.hero'));

// Narrow screens: menu button opens the link panel
toggle.addEventListener('click', () => setOpen(!banner.classList.contains('is-open')));
links.forEach((link) => link.addEventListener('click', () => setOpen(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && banner.classList.contains('is-open')) {
    setOpen(false);
    toggle.focus();
  }
});

// Underline the link for the section in the middle of the screen
const spy = new IntersectionObserver((entries) => {
  entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
    links.forEach((link) => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach((link) => spy.observe(document.querySelector(link.hash)));

// Hero video: keep it playing wherever the browser allows. Phones can block
// autoplay (iPhone Low Power Mode, data saver) or stall it after the tab
// is hidden, so retry on load, on the first touch or scroll, and whenever
// the hero comes back into view. The poster shows until it plays.
// In-app browsers (Instagram, Facebook, TikTok) only allow play() during a
// real tap, which browsers count on touchend and click, not touchstart.
const heroVideo = document.querySelector('.hero video');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let heroInView = true;

const playHero = () => {
  if (reduceMotion.matches || flipbookOn || !heroInView || document.hidden || !heroVideo.paused) return;
  heroVideo.muted = true; // some browsers only allow autoplay when muted is set in script too
  const attempt = heroVideo.play();
  if (attempt) attempt.catch(() => {});
};

// Instagram, Facebook and TikTok open links in their own browser, which won't
// autoplay video. There the hero plays a flipbook of still frames instead
// (portrait crops of the same footage at its own 30 per second), which always animates.
// Phones that block the video for another reason fall back to it as well.
// Add ?hero=frames to the address to preview the flipbook anywhere.
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp/i;
const FRAME_COUNT = 339;
const FRAME_FPS = 29.97;
const FRAME_DIR = 'design-systems/02-field-recruit/media/hero-frames/';
let flipbookOn = false;

const startFlipbook = () => {
  if (flipbookOn) return;
  flipbookOn = true;
  heroVideo.pause();
  heroVideo.removeAttribute('autoplay');
  heroVideo.hidden = true;

  const media = document.querySelector('.hero__media');
  const layers = [0, 1].map(() => {
    const img = document.createElement('img');
    img.className = 'hero__frame';
    img.alt = '';
    img.decoding = 'async';
    media.prepend(img);
    return img;
  });

  // Fetch every frame in order, eight at a time, so playback can begin early
  const urls = Array.from({ length: FRAME_COUNT }, (_, i) => `${FRAME_DIR}${i}.jpg`);
  const ready = new Array(FRAME_COUNT).fill(false);
  let next = 0;
  const fetchNext = () => {
    if (next >= FRAME_COUNT) return;
    const i = next++;
    fetch(urls[i]).then(() => { ready[i] = true; }).catch(() => {}).finally(fetchNext);
  };
  for (let k = 0; k < 8; k++) fetchNext();

  // Two stacked images: decode the next frame off screen, then swap, so it never flickers
  let shown = -1, front = 0, busy = false;
  const tick = () => {
    if (busy || !heroInView || document.hidden) return;
    const i = (shown + 1) % FRAME_COUNT;
    if (!ready[i]) return; // still downloading: hold the current frame
    busy = true;
    const back = layers[1 - front];
    back.src = urls[i];
    back.decode().catch(() => {}).then(() => {
      back.classList.add('is-shown');
      layers[front].classList.remove('is-shown');
      front = 1 - front;
      shown = i;
      busy = false;
    });
  };
  setInterval(tick, 1000 / FRAME_FPS);
};

if (reduceMotion.matches) {
  heroVideo.pause();
} else if (IN_APP.test(navigator.userAgent) || new URLSearchParams(location.search).get('hero') === 'frames') {
  startFlipbook();
} else {
  heroVideo.addEventListener('canplay', playHero);
  ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'scroll', 'keydown'].forEach((type) =>
    addEventListener(type, playHero, { passive: true }));
  document.addEventListener('visibilitychange', playHero);
  addEventListener('pageshow', playHero); // back/forward cache on iPhone
  playHero();
  // A phone held upright that still hasn't started the video after 4 seconds
  setTimeout(() => {
    if (heroVideo.paused && heroInView && !document.hidden && matchMedia('(orientation: portrait)').matches) startFlipbook();
  }, 4000);
}

if (!reduceMotion.matches) {
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    if (flipbookOn) return;
    if (heroInView) playHero(); else heroVideo.pause(); // saves battery off screen
  }).observe(document.querySelector('.hero'));
}

// Consultation form: sends straight to sam@fieldrecruit.com.au through Web3Forms.
// The access key is tied to that inbox and is safe to keep in page code.
// Until a key is set, the form falls back to opening the visitor's email app.
const WEB3FORMS_KEY = '13288dcf-a3a5-4920-9355-ddfc054163ca';
const TO_EMAIL = 'sam@fieldrecruit.com.au';

const form = document.querySelector('#consultation-form');
const status = form.querySelector('.form-status');
const sendButton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const about = form.elements.goals.value.trim();
  const subject = `Free consultation: ${name}`;

  if (!WEB3FORMS_KEY) {
    const body = `Name: ${name}\nEmail: ${email}\n\n${about}`;
    window.location.href = `mailto:${TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Your email app should open with your message. Press send there to reach Sam.';
    return;
  }

  sendButton.disabled = true;
  status.textContent = 'Sending…';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject,
        from_name: 'Field Recruit website',
        name,
        email,
        message: about || '(nothing written)',
        botcheck: form.elements.botcheck.checked,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || res.status);
    form.reset();
    status.textContent = 'Thanks, your message has been sent. Sam will be in touch soon.';
  } catch {
    status.textContent = `Sorry, that didn’t send. Please try again or email ${TO_EMAIL}.`;
  } finally {
    sendButton.disabled = false;
  }
});
