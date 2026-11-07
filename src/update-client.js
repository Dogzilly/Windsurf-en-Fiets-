// Eerste installatie: geen reload. Bestaande controller vervangen: één reload per release.
export function installUpdateFlow({navigator,sessionStorage,location,addEventListener}, version) {
  if (!navigator.serviceWorker) return;
  const sw = navigator.serviceWorker;
  const wasControlled = !!sw.controller;
  const key = `wf-update:${location.pathname.replace(/[^/]*$/, '')}:${version}`;
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (!wasControlled || reloading) return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { return; } // Geen reloadlus wanneer sessieopslag is geblokkeerd.
    reloading = true;
    location.reload();
  });
  const register = () => sw.register(`sw.js?v=${encodeURIComponent(version)}`, {updateViaCache:'none'})
    .then(reg => reg.update()).catch(() => {});
  addEventListener('load', register, {once:true});
}
if (typeof window !== 'undefined') installUpdateFlow(window, __APP_VERSION__);
