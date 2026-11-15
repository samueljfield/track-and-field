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

// Google Calendar booking page ("Free consultation" appointment schedule on
// the Field Recruit account). Book opens it in a new tab.
const BOOKING_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0AJfvdPDhUf9Mnr_HBGpAoTGFOf7TlsxkGCCMMLZBSx5x86Jh-OyUh3j--x9DlaQsa1etcAv2p';

const form = document.querySelector('#consultation-form');
const status = form.querySelector('.form-status');
const sendButton = form.querySelector('button[type="submit"]');

// Status line with an optional link back to the booking page
const setStatus = (text, linkText) => {
  status.textContent = text;
  if (linkText) {
    const link = document.createElement('a');
    link.href = BOOKING_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = linkText;
    status.append(' ', link);
  }
};

// Book: open Sam's calendar in a new tab straight away (it has to happen
// during the click, or browsers block the tab), and at the same time email
// Sam the details. Google sends its own email once a time is chosen; the
// visitor's email is in both subjects so the two can be matched up.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const about = form.elements.goals.value.trim();
  const subject = `Consultation booking: ${name} (${email})`;

  window.open(BOOKING_URL, '_blank', 'noopener');

  if (!WEB3FORMS_KEY) {
    const body = `Name: ${name}\nEmail: ${email}\n\n${about}`;
    window.location.href = `mailto:${TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('Choose a time in the tab that just opened, then press send in your email app.', 'Calendar didn’t open?');
    return;
  }

  sendButton.disabled = true;
  setStatus('Opening Sam’s calendar and sending your details…');
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
        message: `${about || '(nothing written)'}\n\nThey were sent to your booking page. Google will email you separately when they choose a time, from the booking made with ${email}.`,
        botcheck: form.elements.botcheck.checked,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || res.status);
    form.reset();
    setStatus('Thanks, Sam has your details. Now choose a time in the tab that just opened.', 'Calendar didn’t open?');
  } catch {
    setStatus(`Sorry, your details didn’t send. Please try again or email ${TO_EMAIL}. You can still choose a time:`, 'open Sam’s calendar');
  } finally {
    sendButton.disabled = false;
  }
});
