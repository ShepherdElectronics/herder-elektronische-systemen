document.documentElement.classList.add('js-enabled');

const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#primary-nav');
if (nav && !nav.querySelector('a[href$="about.html"]')) {
  const aboutLink = document.createElement('a');
  aboutLink.href = 'about.html';
  aboutLink.textContent = 'About';
  nav.insertBefore(aboutLink, nav.querySelector('.nav-cta'));
}
if (nav && !nav.querySelector('a[href$="projects.html"]')) {
  const projectsLink = document.createElement('a');
  projectsLink.href = 'projects.html';
  projectsLink.textContent = 'Projects';
  nav.insertBefore(projectsLink, nav.querySelector('a[href$="about.html"]') || nav.querySelector('.nav-cta'));
}

const projectRegistry = {
  'https://github.com/ShepherdElectronics/esp32-robotics-control-platform': 'projects/esp32-robotics-control-platform.html',
  'https://github.com/ShepherdElectronics/SafetyCritical_Actuator_F28069M': 'projects/ti-c2000-actuator-controller.html',
  'https://github.com/ShepherdElectronics/Labs_Dyno_TI-Piccolo-Motor-Drive-Testbed': 'projects/ti-piccolo-pmsm-dynamometer.html',
  'https://github.com/ShepherdElectronics/5V-1A-SMPS': 'projects/5v-1a-smps.html'
};
if (!document.body.classList.contains('project-page')) {
  document.querySelectorAll('a[href^="https://github.com/ShepherdElectronics/"]').forEach((repoLink) => {
    const projectHref = projectRegistry[repoLink.href];
    if (!projectHref) return;
    repoLink.target = '_blank';
    repoLink.rel = 'noopener noreferrer';
    repoLink.setAttribute('aria-label', `${repoLink.textContent.trim()} external GitHub repository`);
    repoLink.textContent = 'View repository ↗';
    if (repoLink.parentElement?.querySelector(`a[href="${projectHref}"]`)) return;
    const projectLink = document.createElement('a');
    projectLink.href = projectHref;
    projectLink.className = repoLink.className;
    projectLink.textContent = 'View project';
    projectLink.setAttribute('aria-label', 'View first-party project page');
    repoLink.parentElement?.insertBefore(projectLink, repoLink);
  });
}
document.querySelectorAll('.service-page .services-menu').forEach((menu) => menu.removeAttribute('open'));

navToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Open navigation');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const revealElements = document.querySelectorAll('.reveal');
const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 }) : null;

revealElements.forEach((element) => {
  if (observer) observer.observe(element);
  else element.classList.add('visible');
});
