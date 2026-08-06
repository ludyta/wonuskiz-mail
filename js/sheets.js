// Google Sheets API Integration
// Planilhas necessárias:
// - Caixinhas: id, nome, comunidade, data_pedido, data_envio, transportadora, codigo_rastreio, status
// - Itens: id, caixinha_id, foto_url, tipo_item, tipo_ceg, nome_ceg, nome_set, linha_ref, claim, quantidade
// - Config: tipo (tipo_item|tipo_ceg|nome_ceg|nome_set|comunidade), valor

const Sheets = {
  // Configurado após login Google OAuth
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

  // Lê todos os valores de uma aba
  async getRange(sheet, range) {
    const data = await this.request(`/values/${sheet}!${range}`)
    return data.values || []
  },

  // Escreve valores
  async setRange(sheet, range, values) {
    return this.request(`/values/${sheet}!${range}?valueInputOption=RAW`, 'PUT', { values })
  },

  // Adiciona linha ao final de uma aba
  async appendRow(sheet, values) {
    return this.request(`/values/${sheet}!A:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
      values: [values]
    })
  },

  // Atualiza linha específica (busca por id na col A)
  async updateRow(sheet, id, values) {
    const rows = await this.getRange(sheet, 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) throw new Error('Registro não encontrado')
    const rowNum = rowIndex + 1
    return this.setRange(sheet, `A${rowNum}`, [values])
  },

  // Deleta linha (limpa conteúdo)
  async deleteRow(sheet, id) {
    const rows = await this.getRange(sheet, 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return
    const rowNum = rowIndex + 1
    // Limpar conteúdo da linha
    return this.request(`/values/${sheet}!A${rowNum}:Z${rowNum}:clear`, 'POST')
  },

  // Gera ID único
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  },

  // ==== CAIXINHAS ====
  async getCaixinhas() {
    const rows = await this.getRange('Caixinhas', 'A2:I1000')
    return rows
      .filter(r => r[0])
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
      .filter(r => r[0] && r[1] === caixinhaId)
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
    rows.filter(r => r[0]).forEach(r => {
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
      const res = await fetch(`https://api.linketrack.com/track/json?user=teste&token=1abcd00b2731640422849d3892b0a4ea23f5b8c5d3e53c0f9e5a0b1c2d3e4f5&codigo=${codigo}`)
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
    } catch {
      return null
    }
  },

  // Setup inicial: cria abas na planilha se não existirem
  async initSpreadsheet() {
    try {
      const meta = await this.request('')
      const sheets = meta.sheets.map(s => s.properties.title)
      const needed = ['Caixinhas', 'Itens', 'Config']
      const toCreate = needed.filter(n => !sheets.includes(n))
      
      if (toCreate.length > 0) {
        await this.request(':batchUpdate', 'POST', {
          requests: toCreate.map(title => ({
            addSheet: { properties: { title } }
          }))
        })
        // Adicionar cabeçalhos
        await this.setRange('Caixinhas', 'A1:H1', [['id','nome','comunidade','data_pedido','data_envio','transportadora','codigo_rastreio','status']])
        await this.setRange('Itens', 'A1:K1', [['id','caixinha_id','foto_url','tipo_item','tipo_ceg','nome_ceg','nome_set','linha_ref','claim','quantidade','separado']])
        await this.setRange('Config', 'A1:B1', [['tipo','valor']])
        // Config padrão
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
