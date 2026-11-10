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
const heroVideo = document.querySelector('.hero video');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let heroInView = true;

const playHero = () => {
  if (reduceMotion.matches || !heroInView || document.hidden || !heroVideo.paused) return;
  heroVideo.muted = true; // some browsers only allow autoplay when muted is set in script too
  const attempt = heroVideo.play();
  if (attempt) attempt.catch(() => {});
};

if (reduceMotion.matches) {
  heroVideo.pause();
} else {
  heroVideo.addEventListener('canplay', playHero);
  ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach((type) =>
    addEventListener(type, playHero, { passive: true }));
  document.addEventListener('visibilitychange', playHero);
  addEventListener('pageshow', playHero); // back/forward cache on iPhone
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    if (heroInView) playHero(); else heroVideo.pause(); // saves battery off screen
  }).observe(document.querySelector('.hero'));
  playHero();
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
