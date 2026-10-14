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

// ── ITEM CARD EXPANDIDO ──
function itemCardExpHTML(item, isOwner) {
  isOwner = isOwner !== false
  const hasImg = item.foto_url && item.foto_url.length > 0
  const sepDone = item.separado ? 'done' : ''
  const chkOn = item.separado ? 'on' : ''
  const sepLbl = item.separado ? 'Separado ✓' : 'Marcar como separado'
  const sepSub = item.separado ? 'toque para desmarcar' : 'toque para confirmar'
  const sepColor = item.separado ? 'color:#3edc78' : ''
  const imgClick = hasImg ? 'openLightbox("' + item.foto_url + '")' : ''
  const imgCursor = hasImg ? 'cursor:zoom-in' : 'cursor:default'

  let html = '<div class="item-card-exp" id="ice-' + item.id + '">'

  // Imagem
  html += '<div class="ice-img-wrap">'
  if (hasImg) {
    html += '<img src="' + item.foto_url + '" alt="foto" loading="lazy">'
  } else {
    html += '<div class="ice-img-placeholder"><i class="ti ti-photo"></i></div>'
  }
  html += '<div class="ice-img-overlay" onclick="' + imgClick + '" style="' + imgCursor + '">'
  html += '<span class="ice-qty-badge">× ' + (item.quantidade || 1) + '</span>'
  if (hasImg) {
    html += '<span class="ice-zoom-hint"><i class="ti ti-zoom-in" style="font-size:10px"></i> ampliar</span>'
  } else {
    html += '<span></span>'
  }
  html += '</div></div>'

  // Cabeçalho
  html += '<div class="ice-header">'
  html += '<div class="ice-type">' + (item.tipo_item || '—') + '</div>'
  html += '<div class="ice-setname">' + (item.claim || item.nome_set || '—') + '</div>'
  html += '<div class="ice-ref">' + (item.linha_ref || '—') + '</div>'
  html += '</div>'

  // Toggle detalhes
  html += '<div class="ice-details-toggle" onclick="toggleIceDetails(this)">'
  html += '<span class="ice-toggle-lbl"><i class="ti ti-list-details"></i> Exibir detalhes</span>'
  html += '<i class="ti ti-chevron-down ice-chevron"></i>'
  html += '</div>'

  // Detalhes
  html += '<div class="ice-details">'
  html += '<div class="ice-d-row"><span class="ice-d-label">Tipo</span><span class="ice-d-val">' + (item.tipo_item || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">CEG</span><span class="ice-d-val">' + (item.tipo_ceg || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Nome da CEG</span><span class="ice-d-val">' + (item.nome_ceg || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Set</span><span class="ice-d-val">' + (item.nome_set || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Linha / Nº</span><span class="ice-d-val">' + (item.linha_ref || '—') + '</span></div>'
  html += '<div class="ice-d-row"><span class="ice-d-label">Quantidade</span><span class="ice-d-val qty">' + (item.quantidade || 1) + ' itens</span></div>'
  if (item.claim) {
    html += '<div class="ice-claim"><div class="ice-claim-lbl">Claim</div><div class="ice-claim-val">' + item.claim + '</div></div>'
  }
  html += '</div>'

  // Footer
  html += '<div class="ice-footer">'
  html += '<div class="ice-sep-btn ' + sepDone + '" onclick="toggleIceSep(event,this,\'' + item.id + '\')">'
  html += '<div class="ice-big-chk ' + chkOn + '"></div>'
  html += '<div><span class="ice-sep-lbl" style="' + sepColor + '">' + sepLbl + '</span>'
  html += '<span class="ice-sep-sub">' + sepSub + '</span></div>'
  html += '</div>'
  if (isOwner) {
    html += '<div class="ice-action-btns">'
    html += '<a href="novo-item.html?id=' + item.id + '&caixinha_id=' + item.caixinha_id + '" class="ice-edit-btn" title="Editar"><i class="ti ti-edit"></i></a>'
    html += '<button class="ice-del-btn" onclick="confirmDeleteItem(event,\'' + item.id + '\')" title="Excluir"><i class="ti ti-trash"></i></button>'
    html += '</div>'
  }
  html += '</div></div>'

  return html
}

function toggleIceDetails(toggle) {
  const details = toggle.nextElementSibling
  const chevron = toggle.querySelector('.ice-chevron')
  const lbl = toggle.querySelector('.ice-toggle-lbl')
  const isOpen = details.classList.contains('open')
  details.classList.toggle('open', !isOpen)
  chevron.classList.toggle('open', !isOpen)
  lbl.innerHTML = isOpen
    ? '<i class="ti ti-list-details"></i> Exibir detalhes'
    : '<i class="ti ti-list-details"></i> Ocultar detalhes'
}

async function toggleIceSep(e, btn, itemId) {
  e.stopPropagation()
  const isDone = btn.classList.contains('done')
  const newVal = !isDone
  btn.classList.toggle('done', newVal)
  const chk = btn.querySelector('.ice-big-chk')
  chk.classList.toggle('on', newVal)
  const lbl = btn.querySelector('.ice-sep-lbl')
  const sub = btn.querySelector('.ice-sep-sub')
  lbl.textContent = newVal ? 'Separado ✓' : 'Marcar como separado'
  lbl.style.color = newVal ? '#3edc78' : ''
  sub.textContent = newVal ? 'toque para desmarcar' : 'toque para confirmar'
  try {
    await Sheets.toggleSeparado(itemId, newVal)
  } catch(err) {
    btn.classList.toggle('done', isDone)
    chk.classList.toggle('on', isDone)
    lbl.textContent = isDone ? 'Separado ✓' : 'Marcar como separado'
    lbl.style.color = isDone ? '#3edc78' : ''
    sub.textContent = isDone ? 'toque para desmarcar' : 'toque para confirmar'
    showToast('Erro ao atualizar', 'error')
  }
}
