const Drive = {
  accessToken: null,
  folderId: null,

  init(token) {
    this.accessToken = token
    this.folderId = localStorage.getItem('wm-drive-folder')
  },

  async request(url, method = 'GET', body = null, headers = {}) {
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...headers
      }
    }
    if (body) opts.body = body
    const res = await fetch(url, opts)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // Cria (ou reutiliza) a pasta wonuskiz-mail no Drive
  async ensureFolder() {
    if (this.folderId) return this.folderId

    // Busca pasta existente
    const search = await this.request(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'wonuskiz-mail%20%E2%80%94%20imagens'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id,name)`
    )

    if (search.files && search.files.length > 0) {
      this.folderId = search.files[0].id
      localStorage.setItem('wm-drive-folder', this.folderId)
      return this.folderId
    }

    // Cria pasta nova
    const folder = await this.request(
      'https://www.googleapis.com/drive/v3/files',
      'POST',
      JSON.stringify({
        name: 'wonuskiz-mail — imagens',
        mimeType: 'application/vnd.google-apps.folder'
      }),
      { 'Content-Type': 'application/json' }
    )

    this.folderId = folder.id
    localStorage.setItem('wm-drive-folder', this.folderId)

    // Torna a pasta pública (qualquer pessoa com o link pode ver)
    await this.request(
      `https://www.googleapis.com/drive/v3/files/${this.folderId}/permissions`,
      'POST',
      JSON.stringify({ role: 'reader', type: 'anyone' }),
      { 'Content-Type': 'application/json' }
    )

    return this.folderId
  },

  // Faz upload de uma imagem (base64 dataURL) e retorna URL pública
  async uploadImage(base64DataUrl, fileName) {
    const folderId = await this.ensureFolder()

    // Converte dataURL para Blob
    const arr = base64DataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
    const blob = new Blob([u8arr], { type: mime })

    // Upload multipart
    const metadata = JSON.stringify({
      name: fileName || `photo_${Date.now()}.jpg`,
      parents: [folderId]
    })

    const form = new FormData()
    form.append('metadata', new Blob([metadata], { type: 'application/json' }))
    form.append('file', blob)

    const uploaded = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        body: form
      }
    )

    if (!uploaded.ok) {
      const err = await uploaded.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Erro no upload')
    }

    const file = await uploaded.json()
    const fileId = file.id

    // Torna o arquivo público
    await this.request(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      'POST',
      JSON.stringify({ role: 'reader', type: 'anyone' }),
      { 'Content-Type': 'application/json' }
    )

    // Retorna URL direta para exibição
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
  },

  // ==== PERFIL PRIVADO (endereço + foto URL) — salvo no appDataFolder ====
  async savePerfilPrivado(data) {
    // Busca arquivo existente
    const search = await this.request(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'wonuskiz-perfil.json'&fields=files(id)`
    )
    const json = JSON.stringify(data)
    const blob = new Blob([json], { type: 'application/json' })

    if (search.files && search.files.length > 0) {
      // Atualiza
      const fileId = search.files[0].id
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        { method: 'PATCH', headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }, body: blob }
      )
    } else {
      // Cria novo
      const metadata = JSON.stringify({ name: 'wonuskiz-perfil.json', parents: ['appDataFolder'] })
      const form = new FormData()
      form.append('metadata', new Blob([metadata], { type: 'application/json' }))
      form.append('file', blob)
      await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        { method: 'POST', headers: { 'Authorization': `Bearer ${this.accessToken}` }, body: form }
      )
    }
  },

  async loadPerfilPrivado() {
    try {
      const search = await this.request(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'wonuskiz-perfil.json'&fields=files(id)`
      )
      if (!search.files || search.files.length === 0) return null
      const fileId = search.files[0].id
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      )
      if (!res.ok) return null
      return await res.json()
    } catch(e) {
      console.warn('loadPerfilPrivado error:', e)
      return null
    }
  },

  // Deleta um arquivo do Drive (por URL)
  async deleteImage(url) {
    try {
      const match = url.match(/id=([^&]+)/)
      if (!match) return
      const fileId = match[1]
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      )
    } catch(e) {
      console.warn('Não foi possível deletar imagem:', e)
    }
  }
}
