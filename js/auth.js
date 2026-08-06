// Google OAuth 2.0
// CLIENT_ID deve ser configurado em js/config.js (não versionado)
const Auth = {
  CLIENT_ID: window.WM_CONFIG?.googleClientId || '',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  tokenClient: null,

  init() {
    // Carregar Google Identity Services
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
    // Verificar se já tem token válido
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    if (token && expiry && Date.now() < parseInt(expiry)) {
      Sheets.accessToken = token
      this.onAuthenticated()
    }
  },

  login() {
    if (!this.tokenClient) {
      alert('Google Identity Services ainda carregando. Tente novamente em instantes.')
      return
    }
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
    this.onAuthenticated()
  },

  async onAuthenticated() {
    // Verificar se já tem planilha configurada
    const sheetId = localStorage.getItem('wm-sheet-id')
    if (sheetId) {
      Sheets.spreadsheetId = sheetId
      window.location.href = 'dashboard.html'
    } else {
      // Primeira vez: criar planilha
      await this.setupSpreadsheet()
    }
  },

  async setupSpreadsheet() {
    showToast('Configurando sua planilha...')
    try {
      // Criar nova planilha
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
      showToast('Tudo pronto!')
      setTimeout(() => { window.location.href = 'dashboard.html' }, 1000)
    } catch (e) {
      console.error(e)
      showToast('Erro ao criar planilha', 'error')
    }
  },

  logout() {
    localStorage.removeItem('wm-access-token')
    localStorage.removeItem('wm-token-expiry')
    Sheets.accessToken = null
    window.location.href = 'index.html'
  },

  isLoggedIn() {
    const token = localStorage.getItem('wm-access-token')
    const expiry = localStorage.getItem('wm-token-expiry')
    return !!(token && expiry && Date.now() < parseInt(expiry))
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html'
      return false
    }
    Sheets.accessToken = localStorage.getItem('wm-access-token')
    Sheets.spreadsheetId = localStorage.getItem('wm-sheet-id')
    return true
  }
}
