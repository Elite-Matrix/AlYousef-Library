(() => {
    let saved = null;
    try { saved = localStorage.getItem("yousef-theme"); } catch {}
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0f172a" : "#2563eb");
})();
