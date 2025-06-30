function extractPathnameSegments(path) {
  const cleanPath = path.startsWith('#') ? path.slice(1) : path;
  const splitUrl = cleanPath.split('/').filter(segment => segment !== '');

  return {
    resource: splitUrl[0] || null,
    id: splitUrl[1] || null,
    verb: splitUrl[2] || null
  };
}

function constructRouteFromSegments(pathSegments) {
  let pathname = '/';

  if (pathSegments.resource) {
    pathname += pathSegments.resource;
  }

  if (pathSegments.id) {
    pathname += `/:id`;
  }

  if (pathSegments.verb) {
    pathname += `/${pathSegments.verb}`;
  }

  return pathname;
}

export function getActivePathname() {
  return window.location.hash.slice(1) || '/';
}

export function getActiveRoute() {
  const pathname = getActivePathname();
  const urlSegments = extractPathnameSegments(pathname);
  return constructRouteFromSegments(urlSegments);
}

export function parseActivePathname() {
  const pathname = getActivePathname();
  return extractPathnameSegments(pathname);
}

export function getRoute(pathname) {
  const urlSegments = extractPathnameSegments(pathname);
  return constructRouteFromSegments(urlSegments);
}

export function parsePathname(pathname) {
  return extractPathnameSegments(pathname);
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function getQueryParams() {
  const query = window.location.search.slice(1);
  const params = new URLSearchParams(query);
  return Object.fromEntries(params.entries());
}