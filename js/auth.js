const Auth = {
  CLIENT_ID: '342854763708-1ht7gkhjjm61s28uhba1cecub35qkak4.apps.googleusercontent.com',
  // drive.appdata = pasta oculta do app no Drive de cada usuária
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
  tokenClient: null,

  init() {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => this.onGisLoad()
    document.head.appendChild(script)
  },

  onGisLoad() {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (resp) => this.handleToken(resp)
    })
    // Verificar token em cache
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    if (token && expiry && Date.now() < parseInt(expiry)) {
      Sheets.accessToken = token
      if (typeof Drive !== 'undefined') Drive.init(token)
      this.onAuthenticated()
    }
  },

  login() {
    if (!this.tokenClient) { showToast('Aguarde e tente novamente', 'error'); return }
    this.tokenClient.requestAccessToken()
  },

  handleToken(resp) {
    if (resp.error) {
      console.error('Auth error:', resp.error)
      showToast('Erro ao fazer login com Google', 'error')
      return
    }
    const expiry = Date.now() + (resp.expires_in * 1000)
    localStorage.setItem('wm-access-token', resp.access_token)
    localStorage.setItem('wm-token-expiry', expiry.toString())
    Sheets.accessToken = resp.access_token
    if (typeof Drive !== 'undefined') Drive.init(resp.access_token)
    this.onAuthenticated()
  },

  async onAuthenticated() {
    try {
      // Buscar config no appDataFolder (funciona em qualquer dispositivo)
      const config = await this.loadConfig()

      if (config && config.sheetId && config.folderId) {
        // Configuração existente — usar IDs salvos
        Sheets.spreadsheetId = config.sheetId
        localStorage.setItem('wm-sheet-id', config.sheetId)
        if (typeof Drive !== 'undefined') {
          Drive.folderId = config.folderId
          localStorage.setItem('wm-drive-folder', config.folderId)
        }
        const page = location.pathname.split('/').pop() || 'index.html'
        if (page === 'index.html' || page === '' || page === '/') {
          window.location.href = 'dashboard.html'
        }
      } else {
        // Primeiro acesso — criar tudo
        await this.setupAccount()
      }
    } catch(e) {
      console.error('onAuthenticated error:', e)
      // Fallback: tentar localStorage
      const sheetId = localStorage.getItem('wm-sheet-id')
      if (sheetId) {
        Sheets.spreadsheetId = sheetId
        const page = location.pathname.split('/').pop() || 'index.html'
        if (page === 'index.html' || page === '' || page === '/') {
          window.location.href = 'dashboard.html'
        }
      } else {
        showToast('Erro ao carregar conta. Tente novamente.', 'error')
      }
    }
  },

  // Lê config do appDataFolder do Drive
  async loadConfig() {
    try {
      const token = Sheets.accessToken
      // Buscar arquivo wm-config no appDataFolder
      const search = await fetch(
        "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'wm-config.json'&fields=files(id,name)",
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await search.json()
      if (!data.files || data.files.length === 0) return null

      // Ler conteúdo do arquivo
      const fileId = data.files[0].id
      const content = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      return await content.json()
    } catch(e) {
      console.warn('loadConfig error:', e)
      return null
    }
  },

  // Salva config no appDataFolder
  async saveConfig(config) {
    try {
      const token = Sheets.accessToken

      // Verificar se já existe
      const search = await fetch(
        "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'wm-config.json'&fields=files(id)",
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await search.json()

      const content = JSON.stringify(config)
      const metadata = { name: 'wm-config.json', parents: ['appDataFolder'] }

      if (data.files && data.files.length > 0) {
        // Atualizar existente
        const fileId = data.files[0].id
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify({})], { type: 'application/json' }))
        form.append('file', new Blob([content], { type: 'application/json' }))
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
          { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }, body: form }
        )
      } else {
        // Criar novo
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', new Blob([content], { type: 'application/json' }))
        await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form }
        )
      }
    } catch(e) {
      console.warn('saveConfig error:', e)
    }
  },

  async setupAccount() {
    showToast('Configurando sua conta...')
    try {
      // 1. Criar planilha
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Sheets.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: 'wonuskiz-mail — dados' },
          sheets: [
            { properties: { title: 'Caixinhas' } },
            { properties: { title: 'Itens' } },
            { properties: { title: 'Config' } }
          ]
        })
      })
      const sheet = await res.json()
      if (!sheet.spreadsheetId) throw new Error('Falha ao criar planilha')
      const sheetId = sheet.spreadsheetId
      Sheets.spreadsheetId = sheetId
      localStorage.setItem('wm-sheet-id', sheetId)

      // 2. Tornar planilha pública
      await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Sheets.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      })

      // 3. Inicializar abas
      await Sheets.initSpreadsheet()

      // 4. Criar pasta de imagens
      let folderId = null
      if (typeof Drive !== 'undefined') {
        folderId = await Drive.ensureFolder()
      }

      // 5. Salvar config no appDataFolder — persiste em qualquer dispositivo
      await this.saveConfig({ sheetId, folderId })

      showToast('Tudo pronto!')
      setTimeout(() => { window.location.href = 'dashboard.html' }, 1000)
    } catch(e) {
      console.error('setupAccount error:', e)
      showToast('Erro ao configurar conta: ' + e.message, 'error')
    }
  },

  logout() {
    localStorage.removeItem('wm-access-token')
    localStorage.removeItem('wm-token-expiry')
    localStorage.removeItem('wm-sheet-id')
    localStorage.removeItem('wm-drive-folder')
    if (typeof Sheets !== 'undefined') Sheets.accessToken = null
    if (typeof Drive !== 'undefined') { Drive.accessToken = null; Drive.folderId = null }
    window.location.href = 'index.html'
  },

  isLoggedIn() {
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    return !!(token && expiry && Date.now() < parseInt(expiry))
  },

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'index.html'; return false }
    Sheets.accessToken = localStorage.getItem('wm-access-token')
    Sheets.spreadsheetId = localStorage.getItem('wm-sheet-id')
    if (typeof Drive !== 'undefined') Drive.init(localStorage.getItem('wm-access-token'))
    return true
  }
}