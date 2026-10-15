const Sheets = {
  accessToken: null,
  spreadsheetId: null,

  setAuth(token, sheetId) {
    this.accessToken = token
    this.spreadsheetId = sheetId
    localStorage.setItem('wm-sheet-id', sheetId)
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
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // Lê range de uma aba
  async getRange(sheet, range) {
    try {
      const data = await this.request(`/values/${encodeURIComponent(sheet + '!' + range)}`)
      return data.values || []
    } catch (e) {
      console.error('getRange error:', sheet, range, e)
      return []
    }
  },

  // Escreve range
  async setRange(sheet, range, values) {
    return this.request(
      `/values/${encodeURIComponent(sheet + '!' + range)}?valueInputOption=RAW`,
      'PUT',
      { values }
    )
  },

  // Append — usa A:A como âncora, o Sheets encontra a próxima linha vazia automaticamente
  async appendRow(sheet, values) {
    return this.request(
      `/values/${encodeURIComponent(sheet + '!A:A')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      'POST',
      { values: [values] }
    )
  },

  async updateRow(sheet, id, values) {
    const rows = await this.getRange(sheet, 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) throw new Error('Registro não encontrado')
    return this.setRange(sheet, `A${rowIndex + 1}`, [values])
  },

  async clearRow(sheet, rowNum) {
    return this.request(
      `/values/${encodeURIComponent(sheet + '!A' + rowNum + ':Z' + rowNum)}:clear`,
      'POST'
    )
  },

  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  },

  // ==== CAIXINHAS ====
  async getCaixinhas() {
    const rows = await this.getRange('Caixinhas', 'A2:I1000')
    return rows
      .filter(r => r[0] && r[0] !== 'id')
      .map(r => ({
        id: r[0],
        nome: r[1] || '',
        comunidade: r[2] || '',
        data_pedido: r[3] || '',
        data_envio: r[4] || '',
        tipo_envio: r[5] || '',
        transportadora: r[6] || 'Correios',
        codigo_rastreio: r[7] || '',
        status: r[8] || 'accumulating'
      }))
  },

  async getCaixinha(id) {
    const all = await this.getCaixinhas()
    return all.find(c => c.id === id) || null
  },

  async createCaixinha(data) {
    const id = this.genId()
    await this.appendRow('Caixinhas', [
      id,
      data.nome || '',
      data.comunidade || '',
      data.data_pedido || '',
      data.data_envio || '',
      data.tipo_envio || '',
      data.transportadora || 'Correios',
      data.codigo_rastreio || '',
      data.status || 'accumulating'
    ])
    return id
  },

  async updateCaixinha(id, data) {
    return this.updateRow('Caixinhas', id, [
      id,
      data.nome || '',
      data.comunidade || '',
      data.data_pedido || '',
      data.data_envio || '',
      data.tipo_envio || '',
      data.transportadora || 'Correios',
      data.codigo_rastreio || '',
      data.status || 'accumulating'
    ])
  },

  // ==== ITENS ====
  async getItens(caixinhaId) {
    const rows = await this.getRange('Itens', 'A2:M1000')
    return rows
      .filter(r => r[0] && r[0] !== 'id' && r[1] === caixinhaId)
      .map(r => ({
        id: r[0],
        caixinha_id: r[1],
        foto_url: r[2] || '',
        tipo_item: r[3] || '',
        tipo_ceg: r[4] || '',
        nome_ceg: r[5] || '',
        nome_set: r[6] || '',
        linha_ref: r[7] || '',
        claim: r[8] || '',
        quantidade: parseInt(r[9]) || 1,
        separado: r[10] === 'TRUE',
        membro: r[11] || '',
        claims: r[12] || ''
      }))
  },

  async createItem(data) {
    const id = this.genId()
    await this.appendRow('Itens', [
      id,
      data.caixinha_id,
      data.foto_url || '',
      data.tipo_item || '',
      data.tipo_ceg || '',
      data.nome_ceg || '',
      data.nome_set || '',
      data.linha_ref || '',
      data.claim || '',
      data.quantidade || 1,
      'FALSE',
      data.membro || '',
      data.claims || ''
    ])
    return id
  },

  async updateItem(id, data) {
    return this.updateRow('Itens', id, [
      id,
      data.caixinha_id,
      data.foto_url || '',
      data.tipo_item || '',
      data.tipo_ceg || '',
      data.nome_ceg || '',
      data.nome_set || '',
      data.linha_ref || '',
      data.claim || '',
      data.quantidade || 1,
      data.separado ? 'TRUE' : 'FALSE',
      data.membro || '',
      data.claims || ''
    ])
  },

  async toggleSeparado(id, valor) {
    const rows = await this.getRange('Itens', 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return
    return this.setRange('Itens', `K${rowIndex + 1}`, [[valor ? 'TRUE' : 'FALSE']])
  },

  async deleteItem(id) {
    const rows = await this.getRange('Itens', 'A:A')
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return
    return this.clearRow('Itens', rowIndex + 1)
  },

  // ==== CONFIG ====
  async getConfig() {
    const rows = await this.getRange('Config', 'A2:B1000')
    const config = {
      tipo_item: [], tipo_ceg: [], nome_ceg: [], nome_set: [], comunidade: [],
      perfil_nome: [], perfil_handle: []
    }
    rows
      .filter(r => r[0] && r[0] !== 'tipo')
      .forEach(r => {
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
    return this.clearRow('Config', rowIndex + 1)
  },

  // ==== PERFIL (nome e @ — público, lido pelo caixinha-publica.html) ====
  async getPerfilPublico() {
    const config = await this.getConfig()
    return {
      nome: config.perfil_nome ? config.perfil_nome[0] || '' : '',
      handle: config.perfil_handle ? config.perfil_handle[0] || '' : ''
    }
  },

  async savePerfilPublico(nome, handle) {
    // Remove valores antigos se existirem
    const rows = await this.getRange('Config', 'A:B')
    const toDelete = rows
      .map((r, i) => ({ row: i + 1, tipo: r[0], val: r[1] }))
      .filter(r => r.tipo === 'perfil_nome' || r.tipo === 'perfil_handle')
    for (const r of toDelete) await this.clearRow('Config', r.row)
    // Grava novos valores
    if (nome) await this.appendRow('Config', ['perfil_nome', nome])
    if (handle) await this.appendRow('Config', ['perfil_handle', handle])
  },

  // ==== RASTREAMENTO ====
  async getRastreamento(codigo) {
    try {
      const res = await fetch(
        `https://api.linketrack.com/track/json?user=teste&token=1abcd00b2731640422849d3892b0a4ea23f5b8c5d3e53c0f9e5a0b1c2d3e4f5&codigo=${codigo}`
      )
      const data = await res.json()
      if (data.eventos?.length > 0) {
        const u = data.eventos[0]
        return { status: u.descricao, local: u.local, data: u.data + ' ' + u.hora }
      }
      return null
    } catch { return null }
  },

  // ==== INIT — garante cabeçalhos e dados padrão ====
  async initSpreadsheet() {
    try {
      // 1. Criar abas que faltam
      const meta = await this.request('')
      const existing = meta.sheets.map(s => s.properties.title)
      const needed = ['Caixinhas', 'Itens', 'Config']
      const toCreate = needed.filter(n => !existing.includes(n))
      if (toCreate.length > 0) {
        await this.request(':batchUpdate', 'POST', {
          requests: toCreate.map(title => ({ addSheet: { properties: { title } } }))
        })
      }

      // 2. Sempre escreve cabeçalhos na linha 1 (idempotente)
      await this.setRange('Caixinhas', 'A1:I1', [[
        'id','nome','comunidade','data_pedido','data_envio',
        'tipo_envio','transportadora','codigo_rastreio','status'
      ]])
      await this.setRange('Itens', 'A1:M1', [[
        'id','caixinha_id','foto_url','tipo_item','tipo_ceg',
        'nome_ceg','nome_set','linha_ref','claim','quantidade','separado','membro','claims'
      ]])
      await this.setRange('Config', 'A1:B1', [['tipo','valor']])

      // 3. Dados padrão de config só se vazia
      const configRows = await this.getRange('Config', 'A2:B2')
      if (configRows.length === 0) {
        const defaults = [
          ['tipo_item','Photocard'],
          ['tipo_item','Álbum'],
          ['tipo_item','Cacareco'],
          ['tipo_ceg','Caixinha Mercari'],
          ['tipo_ceg','CEG Inter'],
          ['nome_set','Pedido Individual']
        ]
        for (const row of defaults) await this.appendRow('Config', row)
      }

      return true
    } catch (e) {
      console.error('initSpreadsheet error:', e)
      return false
    }
  }
}
