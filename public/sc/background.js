/* Cinematic sport wallpaper controller. Presentation only: no app state is stored or changed. */
(function () {
  const WALLPAPERS = {
    Football: '/sc/assets/bg-football.jpg',
    Cricket: '/sc/assets/bg-cricket.jpg',
    'Box Cricket': '/sc/assets/bg-cricket.jpg',
    Basketball: '/sc/assets/bg-basketball.jpg',
    Tennis: '/sc/assets/bg-tennis.jpg',
    Badminton: '/sc/assets/bg-badminton.jpg',
  };
  const layers = [...document.querySelectorAll('.sc-wallpaper-layer')];
  let active = 0;
  let current = '';

  const supported = sport => WALLPAPERS[sport] ? sport : '';
  const selectedSport = () => {
    const page = location.hash.slice(1) || 'home';
    const filters = typeof F === 'undefined' ? { p: {}, m: {}, g: {} } : F;
    if (page === 'host') return supported(document.querySelector('form select[name="sport"]')?.value);
    if (page === 'players') return supported(filters.p?.sport);
    if (page === 'matches') return supported(filters.m?.sport);
    if (page === 'grounds' || page === 'ground' || page === 'nearby') return supported(filters.g?.sport);
    return '';
  };

  function setWallpaper(sport) {
    const nextSport = supported(sport) || 'Football';
    if (nextSport === current || layers.length < 2) return;
    current = nextSport;
    const next = active === 0 ? 1 : 0;
    layers[next].style.backgroundImage = `url("${WALLPAPERS[nextSport]}")`;
    layers[next].dataset.sport = nextSport;
    layers[next].classList.add('is-active');
    layers[active].classList.remove('is-active');
    active = next;
    document.documentElement.dataset.wallpaperSport = nextSport.toLowerCase().replace(' ', '-');
  }

  const sync = () => requestAnimationFrame(() => setWallpaper(selectedSport()));
  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && (target.name === 'sport' || target.closest('.filters'))) sync();
  });
  window.addEventListener('hashchange', sync);
  document.addEventListener('pointermove', event => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = (event.clientX / innerWidth - 0.5) * -8;
    const y = (event.clientY / innerHeight - 0.5) * -6;
    document.documentElement.style.setProperty('--wallpaper-x', `${x}px`);
    document.documentElement.style.setProperty('--wallpaper-y', `${y}px`);
  }, { passive: true });

  const observer = new MutationObserver(sync);
  const app = document.getElementById('app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  setWallpaper('Football');
})();