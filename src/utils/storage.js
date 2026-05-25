export function setStorage(name, value) {
  window.localStorage.setItem(name, JSON.stringify(value));
}

export function getStorage(name) {
  try {
    return JSON.parse(window.localStorage.getItem(name));
  } catch (error) {
    console.log(`get ${name} for error ${error}`);
    return false;
  }
}

export function removeStorage(name) {
  window.localStorage.removeItem(name);
}
