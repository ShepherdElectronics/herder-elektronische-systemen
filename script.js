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
  'https://github.com/ShepherdElectronics/ti-piccolo-pmsm-dynamometer': 'projects/ti-piccolo-pmsm-dynamometer.html',
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
const projectMedia = {
  'project-page--esp32': '<div class="project-gallery project-gallery--esp32"><figure class="project-media project-media--wide"><div class="project-media__body"><strong>Architecture placeholder</strong>Sensor &rarr; controller &rarr; actuator signal-flow diagram</div><figcaption>Replace with an authorized architecture diagram.<span class="project-media__meta">Source: public repository documentation</span></figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Prototype placeholder</strong>Authorized hardware photograph</div><figcaption>Prototype or bench image, when cleared for publication.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Behavior placeholder</strong>Control response plot</div><figcaption>Measured response or software/hardware integration evidence.</figcaption></figure></div>',
  'project-page--c2000': '<div class="project-gallery project-gallery--c2000"><figure class="project-media"><div class="project-media__body"><strong>State-machine placeholder</strong>Command &rarr; timeout &rarr; fault latch</div><figcaption>Authorized state diagram or command table.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>PWM evidence placeholder</strong>Output state capture</div><figcaption>Scope capture or documented PWM behavior.</figcaption></figure><figure class="project-media project-media--wide"><div class="project-media__body"><strong>Hardware placeholder</strong>F28069M controller photograph</div><figcaption>Authorized hardware image, with board and revision identified when available.</figcaption></figure></div>',
  'project-page--dyno': '<div class="project-gallery project-gallery--dyno"><figure class="project-media project-media--wide"><div class="project-media__body"><strong>Testbed architecture placeholder</strong>Dual-motor PMSM &rarr; F28069M &rarr; CAN &rarr; real-time test</div><figcaption>Authorized dynamometer architecture diagram.<span class="project-media__meta">Source: public repository architecture documentation</span></figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Signal map placeholder</strong>CAN and QEP channels</div><figcaption>CAN signal map or controller/testbed photograph.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Measured data placeholder</strong>Speed / torque / power</div><figcaption>Measured plot with operating point and instrument context.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Efficiency map placeholder</strong>Validation result</div><figcaption>Efficiency map when source and publication authorization are confirmed.</figcaption></figure></div>',
  'project-page--smps': '<div class="project-gallery project-gallery--smps"><figure class="project-media project-media--wide"><div class="project-media__body"><strong>Flyback schematic placeholder</strong>Power stage and transformer path</div><figcaption>Authorized schematic excerpt.<span class="project-media__meta">Source: public repository documentation</span></figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Waveform placeholder</strong>Switching node and current</div><figcaption>Waveform panel with test conditions and instrument details.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Bench placeholder</strong>Transformer and electronic load</div><figcaption>Authorized transformer or bench photograph.</figcaption></figure><figure class="project-media"><div class="project-media__body"><strong>Component detail placeholder</strong>BOM and magnetics notes</div><figcaption>Component detail or BOM excerpt, subject to publication rights.</figcaption></figure></div>'
};
const projectPageClass = Object.keys(projectMedia).find((className) => document.body.classList.contains(className));
if (projectPageClass) {
  const placeholder = document.querySelector('.project-figure');
  if (placeholder) placeholder.outerHTML = projectMedia[projectPageClass];
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

const lightboxLinks = document.querySelectorAll('[data-lightbox]');
if (lightboxLinks.length) {
  const lightbox = document.createElement('dialog');
  lightbox.className = 'project-lightbox';
  lightbox.innerHTML = '<button class="project-lightbox__close" type="button" aria-label="Close enlarged image">Close <span aria-hidden="true">×</span></button><div class="project-lightbox__scroll"><img alt=""></div>';
  document.body.appendChild(lightbox);
  const lightboxImage = lightbox.querySelector('img');
  const closeLightbox = () => lightbox.close();
  lightbox.querySelector('.project-lightbox__close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightboxLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      lightboxImage.src = link.href;
      lightboxImage.alt = link.querySelector('img')?.alt || '';
      lightbox.showModal();
    });
  });
}