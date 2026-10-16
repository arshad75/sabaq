export const PREFS_KEY = "sabaq:prefs";

/** Inline in <head> so the saved theme applies before first paint. */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}");var e=document.documentElement;if(p.theme==="light"||p.theme==="dark")e.dataset.theme=p.theme;if(typeof p.textScale==="number")e.style.setProperty("--reading-scale",String(p.textScale));}catch(_){}`;
