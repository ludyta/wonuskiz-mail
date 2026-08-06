const Theme = {
  init() {
    const saved = localStorage.getItem('wm-theme') || 'light'
    this.apply(saved)
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wm-theme', theme)
    const btn = document.getElementById('theme-toggle')
    if (btn) {
      const icon = btn.querySelector('i')
      const label = btn.querySelector('span')
      if (icon) icon.className = theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon'
      if (label) label.textContent = theme === 'dark' ? 'light' : 'dark'
    }
  },
  toggle() {
    const current = localStorage.getItem('wm-theme') || 'light'
    this.apply(current === 'dark' ? 'light' : 'dark')
  }
}
