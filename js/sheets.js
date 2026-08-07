const Sheets = {
  accessToken: null,
  spreadsheetId: null,

  setAuth(token, sheetId) {
    this.accessToken = token
    this.spreadsheetId = sheetId
    localStorage.setItem('wm-sheet-id', sheetId)
  },

  getAuth() {
    this.accessToken = localStorage.getItem('wm-access-token')
    this.spreadsheetId = localStorage.getItem('wm-sheet-id')
    return !!(this.accessToken && this.spreadsheetId)
  },

  async request(path, method = 'GET', body = null) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${path}`
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(url, opts)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Erro na API do Sheets')
    }
    return res.json()
  },

  async getRange(sheet, range) {
    const data = await this.request(`/values/${encodeURIComponent(sheet)}!${range}`)
    return data.values || []
  },

  async setRange(sheet, range, values) {
    return this.request(
      `/values/${encodeURIComponent(sheet)}!${range}?valueInputOption=RAW`,
      'PUT',
      { values }
    )
  },

  // Busca a próxima linha vazia e escreve lá — garante que nunca sobrescreve
  async appendRow(sheet, values) {
    return this.request(
      `/values/${encodeURIComponent(sheet)}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      'POST',
      { values: [values] }
    )
  },

  async updateRow(sheet, id, values) {
    const rows = await this.getRange(sheet, 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) throw new Error('Registro não encontrado')
    const rowNum = rowIndex + 1
    return this.setRange(sheet, `A${rowNum}`, [values])
  },

  async deleteRow(sheet, id) {
    const rows = await this.getRange(sheet, 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return
    const rowNum = rowIndex + 1
    return this.request(
      `/values/${encodeURIComponent(sheet)}!A${rowNum}:Z${rowNum}:clear`,
      'POST'
    )
  },

  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  },

  // ==== CAIXINHAS ====
  // Lê a partir da linha 2 (pula cabeçalho)
  async getCaixinhas() {
    const rows = await this.getRange('Caixinhas', 'A2:H1000')
    return rows
      .filter(r => r[0] && r[0] !== 'id') // ignora se cabeçalho veio junto
      .map(r => ({
        id: r[0], nome: r[1], comunidade: r[2],
        data_pedido: r[3], data_envio: r[4],
        transportadora: r[5], codigo_rastreio: r[6],
        status: r[7] || 'accumulating'
      }))
  },

  async getCaixinha(id) {
    const all = await this.getCaixinhas()
    return all.find(c => c.id === id)
  },

  async createCaixinha(data) {
    const id = this.genId()
    await this.appendRow('Caixinhas', [
      id, data.nome, data.comunidade,
      data.data_pedido || '', data.data_envio || '',
      data.transportadora || 'Correios', data.codigo_rastreio || '',
      data.status || 'accumulating'
    ])
    return id
  },

  async updateCaixinha(id, data) {
    return this.updateRow('Caixinhas', id, [
      id, data.nome, data.comunidade,
      data.data_pedido || '', data.data_envio || '',
      data.transportadora || 'Correios', data.codigo_rastreio || '',
      data.status || 'accumulating'
    ])
  },

  // ==== ITENS ====
  async getItens(caixinhaId) {
    const rows = await this.getRange('Itens', 'A2:K1000')
    return rows
      .filter(r => r[0] && r[0] !== 'id' && r[1] === caixinhaId)
      .map(r => ({
        id: r[0], caixinha_id: r[1], foto_url: r[2],
        tipo_item: r[3], tipo_ceg: r[4], nome_ceg: r[5],
        nome_set: r[6], linha_ref: r[7], claim: r[8],
        quantidade: parseInt(r[9]) || 1, separado: r[10] === 'TRUE'
      }))
  },

  async createItem(data) {
    const id = this.genId()
    await this.appendRow('Itens', [
      id, data.caixinha_id, data.foto_url || '',
      data.tipo_item, data.tipo_ceg, data.nome_ceg,
      data.nome_set, data.linha_ref || '', data.claim || '',
      data.quantidade || 1, 'FALSE'
    ])
    return id
  },

  async updateItem(id, data) {
    return this.updateRow('Itens', id, [
      id, data.caixinha_id, data.foto_url || '',
      data.tipo_item, data.tipo_ceg, data.nome_ceg,
      data.nome_set, data.linha_ref || '', data.claim || '',
      data.quantidade || 1, data.separado ? 'TRUE' : 'FALSE'
    ])
  },

  async toggleSeparado(id, valor) {
    const rows = await this.getRange('Itens', 'A:K')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return
    const rowNum = rowIndex + 1
    return this.setRange('Itens', `K${rowNum}`, [[valor ? 'TRUE' : 'FALSE']])
  },

  async deleteItem(id) {
    return this.deleteRow('Itens', id)
  },

  // ==== CONFIG ====
  async getConfig() {
    const rows = await this.getRange('Config', 'A2:B1000')
    const config = {
      tipo_item: [], tipo_ceg: [], nome_ceg: [], nome_set: [], comunidade: []
    }
    rows.filter(r => r[0] && r[0] !== 'tipo').forEach(r => {
      if (config[r[0]] !== undefined) config[r[0]].push(r[1])
    })
    return config
  },

  async addConfigItem(tipo, valor) {
    return this.appendRow('Config', [tipo, valor])
  },

  async deleteConfigItem(tipo, valor) {
    const rows = await this.getRange('Config', 'A:B')
    const rowIndex = rows.findIndex(r => r[0] === tipo && r[1] === valor)
    if (rowIndex === -1) return
    const rowNum = rowIndex + 1
    return this.request(`/values/Config!A${rowNum}:B${rowNum}:clear`, 'POST')
  },

  // ==== RASTREAMENTO CORREIOS ====
  async getRastreamento(codigo) {
    try {
      const res = await fetch(
        `https://api.linketrack.com/track/json?user=teste&token=1abcd00b2731640422849d3892b0a4ea23f5b8c5d3e53c0f9e5a0b1c2d3e4f5&codigo=${codigo}`
      )
      const data = await res.json()
      if (data.eventos && data.eventos.length > 0) {
        const ultimo = data.eventos[0]
        return {
          status: ultimo.descricao,
          local: ultimo.local,
          data: ultimo.data + ' ' + ultimo.hora,
          eventos: data.eventos
        }
      }
      return null
    } catch { return null }
  },

  // ==== SETUP INICIAL ====
  // Garante cabeçalhos na linha 1 de cada aba
  async initSpreadsheet() {
    try {
      const meta = await this.request('')
      const existingSheets = meta.sheets.map(s => s.properties.title)
      const needed = ['Caixinhas', 'Itens', 'Config']
      const toCreate = needed.filter(n => !existingSheets.includes(n))

      if (toCreate.length > 0) {
        await this.request(':batchUpdate', 'POST', {
          requests: toCreate.map(title => ({
            addSheet: { properties: { title } }
          }))
        })
      }

      // Sempre garante cabeçalhos na linha 1
      await this.setRange('Caixinhas', 'A1:H1', [
        ['id','nome','comunidade','data_pedido','data_envio','transportadora','codigo_rastreio','status']
      ])
      await this.setRange('Itens', 'A1:K1', [
        ['id','caixinha_id','foto_url','tipo_item','tipo_ceg','nome_ceg','nome_set','linha_ref','claim','quantidade','separado']
      ])
      await this.setRange('Config', 'A1:B1', [['tipo','valor']])

      // Adiciona config padrão só se Config estiver vazia
      const configRows = await this.getRange('Config', 'A2:B10')
      if (configRows.length === 0) {
        const defaults = [
          ['tipo_item','Photocard'],['tipo_item','Álbum'],['tipo_item','Cacareco'],
          ['tipo_ceg','Caixinha Mercari'],['tipo_ceg','CEG Inter'],
          ['nome_set','Pedido Individual']
        ]
        for (const row of defaults) await this.appendRow('Config', row)
      }

      return true
    } catch (e) {
      console.error('Erro ao inicializar planilha:', e)
      return false
    }
  }
}
