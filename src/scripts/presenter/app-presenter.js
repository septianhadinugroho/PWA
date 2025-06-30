export class AppPresenter {
  constructor(view, authModel) {
    if (!view || !authModel) {
      throw new Error('View and AuthModel instance must be provided');
    }

    this.view = view;
    this.authModel = authModel;
  }

  initialize() {
    const authState = this.authModel.getAccessToken() !== null;
    this.view.renderNavigation(authState);
    this.view.setupSkipLink();
  }
}