# wonuskiz-mail ✦

Plataforma pessoal para organizar pedidos de envio nacional de K-pop.

## Setup

### 1. Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto (ex: `wonuskiz-mail`)
3. Ative a **Google Sheets API**
4. Em **Credenciais → Criar credenciais → ID do cliente OAuth 2.0**:
   - Tipo: **Aplicativo da Web**
   - Origens JS autorizadas: `https://ludyta.github.io`
   - URIs de redirecionamento: `https://ludyta.github.io/wonuskiz-mail/`
5. Copie o **Client ID**

### 2. Configurar o Client ID

Crie o arquivo `js/config.js` (não versionado, não commitar):

```js
window.WM_CONFIG = {
  googleClientId: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'
}
```

Adicione a referência no `<head>` de cada HTML antes dos outros scripts:
```html
<script src="js/config.js"></script>
```

### 3. GitHub Pages

1. No repositório: **Settings → Pages**
2. Source: **Deploy from branch → main → / (root)**
3. Aguardar deploy em `https://ludyta.github.io/wonuskiz-mail/`

### 4. Primeiro acesso

1. Acesse a URL do GitHub Pages
2. Faça login com sua conta Google
3. O sistema cria a planilha automaticamente no seu Google Drive
4. Compartilhe a planilha como "qualquer pessoa com o link pode ver" para habilitar a visão pública

## Páginas

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Login |
| `dashboard.html` | Visão geral das caixinhas |
| `caixinha.html?id=X` | Página da caixinha (privada) |
| `caixinha-publica.html?id=X&sheet=ID` | Visão compartilhável com a gom |
| `nova-caixinha.html` | Criar/editar caixinha |
| `novo-item.html?caixinha_id=X` | Criar/editar item |
| `configuracoes.html` | Gerenciar listas dos selects |

## Estrutura dos dados (Google Sheets)

**Aba Caixinhas:** id · nome · comunidade · data_pedido · data_envio · transportadora · codigo_rastreio · status

**Aba Itens:** id · caixinha_id · foto_url · tipo_item · tipo_ceg · nome_ceg · nome_set · linha_ref · claim · quantidade · separado

**Aba Config:** tipo · valor
