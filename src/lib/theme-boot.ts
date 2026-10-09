/** Shared by the server layout (inline boot script) and the client theme store. */
export const THEME_STORAGE_KEY = "scriptura:v1:theme";

/**
 * Runs inline in <head> before first paint, so the saved theme is applied
 * without a flash. Without JS (or storage) the page stays light.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;
