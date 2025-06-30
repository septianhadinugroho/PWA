class AboutPresenter {
  constructor(view, appPresenter) {
    this.view = view;
    this.appPresenter = appPresenter;
  }

  loadAboutInfo() {
    const aboutInfo = {
      title: 'Tentang Aplikasi',
      description: 'Story App adalah platform sederhana yang memungkinkan pengguna untuk membagikan cerita mereka melalui deskripsi, foto, dan lokasi.',
      features: [
        'HTML, CSS, dan JavaScript',
        'Vite sebagai bundler',
        'MapTiler untuk tampilan peta',
        'Story API dari Dicoding'
      ]
    };
    this.view.showAboutInfo(aboutInfo);
  }
}

export default AboutPresenter;