import AboutPresenter from '../../../presenter/about-presenter';

class AboutPage {
  constructor() {
    this.presenter = new AboutPresenter(this);
  }

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <main id="main-content">
        <section class="container" aria-labelledby="about-heading">
          <div class="card">
            <h2 id="about-heading"><i class="fas fa-info-circle" aria-hidden="true"></i> Tentang Aplikasi</h2>
            <div id="aboutContent" aria-live="polite"></div>
          </div>
        </section>
      </main>
    `;
  }

  async afterRender() {
    this.presenter.loadAboutInfo();
  }

  showAboutInfo(info) {
    const aboutContent = document.getElementById('aboutContent');
    aboutContent.innerHTML = `
      <p>
        <strong>Story App</strong> adalah ${info.description}
      </p>
      <p id="features-label">Aplikasi ini dibangun menggunakan:</p>
      <ul aria-labelledby="features-label">
        ${info.features.map(feature => `
          <li>
            <span aria-hidden="true"><i class="fas fa-check-circle"></i></span>
            <span class="sr-only">Fitur: </span>
            ${feature}
          </li>
        `).join('')}
      </ul>
      <p>
        Dibuat dengan <span role="img" aria-label="love">❤️</span> oleh saya untuk memenuhi submission web intermediate.
      </p>
    `;
  }
}

export default AboutPage;