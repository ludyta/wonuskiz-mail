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

// ── LIGHTBOX ──
function openLightbox(src) {
  let lb = document.getElementById('wm-lightbox')
  if (!lb) {
    lb = document.createElement('div')
    lb.id = 'wm-lightbox'
    lb.className = 'wm-lightbox'
    lb.innerHTML = '<div class="wm-lb-close" onclick="closeLightbox()"><i class="ti ti-x"></i></div><img id="wm-lb-img" src="" alt="foto ampliada">'
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox() })
    document.body.appendChild(lb)
  }
  document.getElementById('wm-lb-img').src = src
  lb.classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  const lb = document.getElementById('wm-lightbox')
  if (lb) lb.classList.remove('open')
  document.body.style.overflow = ''
}

// Delegated click para ampliar — captura cliques no botão de zoom
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.ice-zoom-btn[data-lightbox]')
  if (btn) {
    e.stopPropagation()
    openLightbox(btn.dataset.lightbox)
  }
})

// ── SEPARADO — localStorage helpers ──
function getSepState(itemId) {
  try {
    const data = JSON.parse(localStorage.getItem('wm-sep') || '{}')
    return !!data[itemId]
  } catch { return false }
}

function setSepState(itemId, val) {
  try {
    const data = JSON.parse(localStorage.getItem('wm-sep') || '{}')
    if (val) data[itemId] = true
    else delete data[itemId]
    localStorage.setItem('wm-sep', JSON.stringify(data))
  } catch {}
}

// ── ITEM CARD EXPANDIDO ──
function itemCardExpHTML(item, isOwner) {
  isOwner = isOwner !== false
  const hasImg = item.foto_url && item.foto_url.length > 0
  const separado = getSepState(item.id)
  const cardDone = separado ? ' done' : ''
  const chkOn = separado ? ' on' : ''
  const sepDone = separado ? ' done' : ''
  const sepLbl = separado ? 'Separado ✓' : 'Marcar como separado'
  const sepSub = separado ? 'toque para desmarcar' : 'toque para confirmar'
  const imgLbData = hasImg ? ' data-lightbox="' + item.foto_url.replace(/"/g, '&quot;') + '"' : ''
  const qty = item.quantidade || 1

  let html = '<div class="item-card-exp' + cardDone + '" id="ice-' + item.id + '">'

  // 1. foto
  html += '<div class="ice-img-wrap">'
  if (hasImg) {
    html += '<img src="' + item.foto_url + '" alt="foto" loading="lazy">'
  } else {
    html += '<div class="ice-img-placeholder"><i class="ti ti-photo"></i></div>'
  }
  if (hasImg) {
    html += '<div class="ice-zoom-btn"' + imgLbData + '><i class="ti ti-zoom-in"></i></div>'
  }
  html += '<div class="ice-qty-badge"><i class="ti ti-package"></i>' + qty + (qty === 1 ? ' item' : ' itens') + '</div>'
  html += '</div>'

  // 2. infos rápidas
  html += '<div class="ice-quick">'
  html += '<div class="ice-eyebrow">' + (item.tipo_item || '—') + '<span class="dot">·</span>' + qty + (qty === 1 ? ' item' : ' itens') + '</div>'
  html += '<div class="ice-name">' + (item.claim || item.nome_set || '—') + '</div>'
  html += '<div class="ice-ceg">' + (item.nome_ceg || '—') + '</div>'
  html += '</div>'

  // 3. detalhes
  html += '<div class="ice-details">'
  html += '<div class="ice-d-row"><span class="ice-d-label">Tipo de CEG</span><span class="ice-d-val">' + (item.tipo_ceg || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Nome da CEG</span><span class="ice-d-val">' + (item.nome_ceg || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Nome do Set</span><span class="ice-d-val">' + (item.nome_set || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Linha / Nº</span><span class="ice-d-val">' + (item.linha_ref || '—') + '</span></div>'
  if (item.claim) {
    html += '<div class="ice-claim"><div class="ice-claim-lbl">Claim</div><div class="ice-claim-val">' + item.claim + '</div></div>'
  }
  html += '</div>'

  // 4. footer separado
  html += '<div class="ice-footer">'
  html += '<div class="ice-sep-btn' + sepDone + '" onclick="toggleIceSep(event,this,\'' + item.id + '\')">'
  html += '<div class="ice-big-chk' + chkOn + '"></div>'
  html += '<div><span class="ice-sep-lbl">' + sepLbl + '</span>'
  html += '<span class="ice-sep-sub">' + sepSub + '</span></div>'
  html += '</div>'
  if (isOwner) {
    html += '<a href="novo-item.html?id=' + item.id + '&caixinha_id=' + item.caixinha_id + '" class="ice-edit-btn" title="Editar"><i class="ti ti-edit"></i></a>'
  }
  html += '</div></div>'

  return html
}

function toggleIceSep(e, btn, itemId) {
  e.stopPropagation()
  const isDone = btn.classList.contains('done')
  const newVal = !isDone
  // card pai
  const card = btn.closest('.item-card-exp')
  if (card) card.classList.toggle('done', newVal)
  // botão
  btn.classList.toggle('done', newVal)
  const chk = btn.querySelector('.ice-big-chk')
  chk.classList.toggle('on', newVal)
  const lbl = btn.querySelector('.ice-sep-lbl')
  const sub = btn.querySelector('.ice-sep-sub')
  lbl.textContent = newVal ? 'Separado ✓' : 'Marcar como separado'
  sub.textContent = newVal ? 'toque para desmarcar' : 'toque para confirmar'
  setSepState(itemId, newVal)
}
