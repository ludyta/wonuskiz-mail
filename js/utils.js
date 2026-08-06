// Toast notification
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast'
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  const icon = type === 'success' ? 'ti-check' : 'ti-alert-circle'
  toast.innerHTML = `<i class="ti ${icon}"></i> ${msg}`
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 3000)
}

// Format date pt-BR
function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

// Combobox setup
function setupCombo(inputEl, dropdownEl, options, allowNew = true) {
  inputEl.addEventListener('focus', () => {
    renderOptions(inputEl.value)
    dropdownEl.classList.add('open')
  })
  inputEl.addEventListener('blur', () => {
    setTimeout(() => dropdownEl.classList.remove('open'), 150)
  })
  inputEl.addEventListener('input', () => renderOptions(inputEl.value))

  function renderOptions(query) {
    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    dropdownEl.innerHTML = ''
    filtered.forEach(opt => {
      const el = document.createElement('div')
      el.className = 'combo-opt'
      el.textContent = opt
      el.addEventListener('mousedown', () => { inputEl.value = opt; dropdownEl.classList.remove('open') })
      dropdownEl.appendChild(el)
    })
    if (allowNew && query && !options.find(o => o.toLowerCase() === query.toLowerCase())) {
      const el = document.createElement('div')
      el.className = 'combo-opt new'
      el.innerHTML = `<i class="ti ti-plus"></i> Adicionar "${query}"`
      el.addEventListener('mousedown', () => { dropdownEl.classList.remove('open') })
      dropdownEl.appendChild(el)
    }
  }
}

// Accordion toggle
function setupAccordion(headerEl) {
  headerEl.addEventListener('click', () => {
    const body = headerEl.nextElementSibling
    const arrow = headerEl.querySelector('.acc-arrow')
    const preview = headerEl.querySelector('.acc-preview')
    const isOpen = body.classList.contains('open')
    body.classList.toggle('open', !isOpen)
    if (arrow) arrow.classList.toggle('open', !isOpen)
    if (preview) preview.style.display = isOpen ? 'flex' : 'none'
  })
}

// Qty stepper
function setupQty(inputEl) {
  const wrap = inputEl.closest('.qty-wrap')
  wrap.querySelector('.qty-minus').addEventListener('click', () => {
    inputEl.value = Math.max(1, parseInt(inputEl.value || 1) - 1)
  })
  wrap.querySelector('.qty-plus').addEventListener('click', () => {
    inputEl.value = parseInt(inputEl.value || 1) + 1
  })
}

// View toggle (cards/table)
function setupViewToggle(cardsBtn, tableBtn, cardsEl, tableEl) {
  cardsBtn.addEventListener('click', () => {
    cardsEl.style.display = 'grid'
    tableEl.style.display = 'none'
    cardsBtn.classList.add('active')
    tableBtn.classList.remove('active')
    localStorage.setItem('wm-view', 'cards')
  })
  tableBtn.addEventListener('click', () => {
    cardsEl.style.display = 'none'
    tableEl.style.display = 'block'
    tableBtn.classList.add('active')
    cardsBtn.classList.remove('active')
    localStorage.setItem('wm-view', 'table')
  })
  // Default: cards
  const saved = localStorage.getItem('wm-view') || 'cards'
  if (saved === 'table') tableBtn.click()
  else cardsBtn.click()
}

// Status helpers
const STATUS_MAP = {
  accumulating: { label: 'Acumulando', cls: 'stamp-accumulating' },
  posted:       { label: 'Postado',    cls: 'stamp-posted' },
  transit:      { label: 'Em trânsito', cls: 'stamp-transit' },
  received:     { label: 'Recebido',   cls: 'stamp-received' },
}

function statusStamp(status) {
  const s = STATUS_MAP[status] || STATUS_MAP.accumulating
  return `<span class="status-stamp ${s.cls}">${s.label}</span>`
}

function statusBadge(status) {
  const s = STATUS_MAP[status] || STATUS_MAP.accumulating
  const colors = {
    accumulating: 'color:#7a1a6c',
    posted:       'color:#1a2f8a',
    transit:      'color:#7a4a00',
    received:     'color:#0a5c2a',
  }
  return `<span class="badge" style="${colors[status] || ''}">${s.label}</span>`
}

// Generate public URL for a caixinha
function publicUrl(caixinhaId) {
  return `${location.origin}/caixinha-publica.html?id=${caixinhaId}`
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('Link copiado!')
  } catch {
    showToast('Não foi possível copiar', 'error')
  }
}
