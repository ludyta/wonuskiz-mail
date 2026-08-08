const Auth = {
  get CLIENT_ID() {
    return window.WM_CONFIG?.googleClientId || localStorage.getItem('wm-client-id') || ''
  },
  // Adicionado drive.file para upload de imagens
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  tokenClient: null,

  init() {
    if (!this.CLIENT_ID) {
      if (!location.pathname.includes('setup')) window.location.href = 'setup.html'
      return
    }
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
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    if (token && expiry && Date.now() < parseInt(expiry)) {
      Sheets.accessToken = token
      Sheets.spreadsheetId = localStorage.getItem('wm-sheet-id')
      Drive.init(token)
      this.onAuthenticated()
    }
  },

  login() {
    if (!this.CLIENT_ID) { window.location.href = 'setup.html'; return }
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
    Drive.init(resp.access_token)
    this.onAuthenticated()
  },

  async onAuthenticated() {
    const sheetId = localStorage.getItem('wm-sheet-id')
    if (sheetId) {
      Sheets.spreadsheetId = sheetId
      if (!location.pathname.includes('dashboard')) {
        window.location.href = 'dashboard.html'
      }
    } else {
      await this.setupSpreadsheet()
    }
  },

  async setupSpreadsheet() {
    showToast('Configurando sua conta...')
    try {
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
      const sheetId = sheet.spreadsheetId
      localStorage.setItem('wm-sheet-id', sheetId)
      Sheets.spreadsheetId = sheetId
      await Sheets.initSpreadsheet()
      // Cria pasta de imagens no Drive
      await Drive.ensureFolder()
      showToast('Tudo pronto!')
      setTimeout(() => { window.location.href = 'dashboard.html' }, 1000)
    } catch(e) {
      console.error(e)
      showToast('Erro ao configurar conta. Tente novamente.', 'error')
    }
  },

  logout() {
    localStorage.removeItem('wm-access-token')
    localStorage.removeItem('wm-token-expiry')
    localStorage.removeItem('wm-drive-folder')
    Sheets.accessToken = null
    Drive.accessToken = null
    window.location.href = 'index.html'
  },

  isLoggedIn() {
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    return !!(token && expiry && Date.now() < parseInt(expiry))
  },

  requireAuth() {
    if (!this.CLIENT_ID) { window.location.href = 'setup.html'; return false }
    if (!this.isLoggedIn()) { window.location.href = 'index.html'; return false }
    Sheets.accessToken = localStorage.getItem('wm-access-token')
    Sheets.spreadsheetId = localStorage.getItem('wm-sheet-id')
    Drive.init(localStorage.getItem('wm-access-token'))
    return true
  }
}
