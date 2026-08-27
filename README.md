# 🛡️ Cyber Threat Hub

<div align="center">

### Plataforma de Cyber Threat Intelligence para monitoramento de ameaças cibernéticas

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js\&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript\&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-Frontend-E34F26?logo=html5\&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Frontend-1572B6?logo=css3\&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker\&logoColor=white)

**Cyber Threat Intelligence • Ransomware • CVEs • Cybersecurity News • Alertas**

</div>

---

## 📖 Sobre o Projeto

O **Cyber Threat Hub** é uma plataforma de **Cyber Threat Intelligence (CTI)** desenvolvida para centralizar informações sobre ameaças cibernéticas.

A aplicação coleta e organiza dados provenientes de diferentes fontes para permitir o acompanhamento de **ataques de ransomware, vulnerabilidades, notícias de cibersegurança e incidentes relacionados ao Brasil**.

Quando um novo ataque de ransomware envolvendo uma organização brasileira é identificado, a plataforma pode gerar alertas automaticamente por **E-mail, Telegram e Microsoft Teams**.

---

## ✨ Funcionalidades

* 📊 **Dashboard** com métricas e gráficos de ameaças;
* 📰 **CyberSec News** com notícias de cibersegurança via RSS;
* 🚨 **Threat Feed** para monitoramento de ransomware;
* 🇧🇷 Detecção automática de ataques relacionados ao Brasil;
* 🛡️ Monitoramento de vulnerabilidades e CVEs;
* 🔎 Pesquisa de notícias, ameaças e vulnerabilidades;
* 📧 Alertas por E-mail;
* ✈️ Alertas pelo Telegram;
* 🟣 Alertas pelo Microsoft Teams;
* 🗃️ Armazenamento local utilizando SQLite;
* 🔄 Atualização automática das fontes de inteligência;
* ⚙️ Painel para configuração das integrações.

---

## 🌐 Fontes de Inteligência

O projeto utiliza diferentes fontes para coleta e correlação das informações:

| Fonte               | Finalidade                            |
| ------------------- | ------------------------------------- |
| **Ransomware.Live** | Incidentes e vítimas de ransomware    |
| **RansomFeed**      | Fonte complementar de ransomware      |
| **NIST NVD**        | Vulnerabilidades e CVEs               |
| **CVEFeed.io**      | Informações complementares sobre CVEs |
| **Feeds RSS**       | Notícias de cibersegurança            |

As notícias são coletadas de fontes como **The Hacker News, CyberSecurity News, SecurityWeek, BleepingComputer, Krebs on Security, Dark Reading e CISO Advisor**.

---

## 🇧🇷 Detecção e Alertas

Durante a coleta de novos incidentes, o backend verifica o país associado à vítima.

Registros identificados como:

```text
BR
Brazil
Brasil
```

são tratados como incidentes brasileiros.

Quando um novo incidente do Brasil é identificado, a plataforma pode distribuir automaticamente o alerta através de:

```text
Novo ataque detectado
        │
        ├──► 📧 E-mail
        ├──► ✈️ Telegram
        └──► 🟣 Microsoft Teams
```

O sistema também verifica os registros existentes para evitar o armazenamento duplicado de uma mesma ameaça.

---

## 🧰 Tecnologias

### Frontend

* HTML5
* CSS3
* JavaScript
* Chart.js
* Font Awesome

### Backend

* Node.js
* Express.js
* Axios
* Nodemailer
* RSS Parser
* SQLite3
* Dotenv

### DevOps

* Git / GitHub
* Docker
* Docker Compose

---

## 🏗️ Arquitetura

```text
 Ransomware.Live ──┐
 RansomFeed ───────┤
 NIST NVD ─────────┤
 CVEFeed.io ───────┼──► Node.js + Express ──► SQLite
 RSS Feeds ────────┘             │
                                 │
                       ┌─────────┴─────────┐
                       ▼                   ▼
                    Frontend            Alertas
                HTML + CSS + JS     E-mail / Telegram
                                         / Teams
```

---

# 🚀 Instalação

## 1. Pré-requisitos

Tenha instalado:

* Node.js
* npm
* Git
* Docker Desktop *(opcional)*

## 2. Clone o projeto

```bash
git clone https://github.com/ArthurNeiva017/Projeto-CyberThreatHub.git
cd Projeto-CyberThreatHub
```

## 3. Instale as dependências

```bash
cd backend
npm install
```

---

# 🔑 Configuração das APIs

Dentro da pasta `backend`, crie um arquivo chamado:

```text
.env
```

Configure suas próprias credenciais:

```env
# E-mail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_aplicativo
ALERT_EMAIL_TO="email1@exemplo.com, email2@exemplo.com"

# Telegram
TELEGRAM_BOT_TOKEN=seu_token
TELEGRAM_CHAT_ID=seu_chat_id

# Ransomware.Live
RANSOMWARE_LIVE_API_KEY=sua_api_key

# Microsoft Teams
TEAMS_WEBHOOK_URL=sua_url_do_webhook
```

### 📧 Gmail

Utilize uma **Senha de App do Google** em `SMTP_PASS`, e não a senha normal da conta.

### ✈️ Telegram

Informe o token do Bot em `TELEGRAM_BOT_TOKEN` e o ID do usuário, grupo ou canal em `TELEGRAM_CHAT_ID`.

### 🔴 Ransomware.Live

Informe sua chave da API em `RANSOMWARE_LIVE_API_KEY`.

### 🟣 Microsoft Teams

Informe a URL do Webhook/fluxo utilizado para receber os alertas em `TEAMS_WEBHOOK_URL`.

> ⚠️ **Nunca publique seu arquivo `.env` no GitHub.** Ele contém senhas, tokens, API Keys e Webhooks privados.

---

# ▶️ Iniciando a Aplicação

## 🪟 Windows

Na pasta principal do projeto:

```cmd
iniciar_tcc.bat
```

## 🐧 Linux / macOS

```bash
chmod +x iniciar_tcc.sh
./iniciar_tcc.sh
```

## ⚙️ Manualmente

Também é possível iniciar diretamente pelo Node.js:

```bash
cd backend
node src/server.js
```

Depois acesse:

```text
http://localhost:3001
```

---

## 🐳 Docker

Para executar utilizando Docker:

```bash
docker compose up --build
```

Acesse:

```text
http://localhost:3002
```

Para encerrar:

```bash
docker compose down
```

---

## 📁 Estrutura

```text
Projeto-CyberThreatHub/
│
├── backend/
│   ├── src/
│   │   ├── database/
│   │   ├── services/
│   │   └── server.js
│   ├── package.json
│   └── arquivos de teste
│
├── frontend/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── Dockerfile
├── docker-compose.yml
├── iniciar_tcc.bat
├── iniciar_tcc.sh
└── README.md
```

---

## 🗃️ Banco de Dados

O projeto utiliza **SQLite** para persistência local.

O banco armazena principalmente:

* 📰 Notícias;
* 🚨 Ameaças;
* 🛡️ CVEs;
* 📊 Métricas.

O arquivo do banco é criado automaticamente pela aplicação.

---

## 🔌 Principais Endpoints

```text
GET  /api/dashboard
GET  /api/noticias
GET  /api/ameacas
GET  /api/cves
GET  /api/cves/:id
GET  /api/settings
POST /api/settings
```

---

## 🔄 Atualização Automática

A aplicação realiza automaticamente a atualização das fontes de inteligência.

| Dados            |             Intervalo |
| ---------------- | --------------------: |
| Threat Feed      |            30 minutos |
| Vulnerabilidades |                1 hora |
| CVEFeed RSS      |                1 hora |
| Notícias         | Atualização periódica |

---

## 🔐 Segurança

As credenciais utilizadas pela aplicação devem permanecer no arquivo `.env`.

Certifique-se de que ele esteja incluído no `.gitignore`:

```gitignore
.env
*.env
```

Para compartilhar a estrutura necessária sem expor credenciais, utilize um `.env.example`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_TO=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

RANSOMWARE_LIVE_API_KEY=
TEAMS_WEBHOOK_URL=
```

> 🔒 Nunca envie senhas, tokens, API Keys ou Webhooks para o repositório público.

---

## 🎓 Finalidade

O **Cyber Threat Hub** foi desenvolvido para fins acadêmicos, educacionais e de pesquisa em **Cyber Threat Intelligence e Segurança da Informação**.

As informações utilizadas são provenientes de APIs e fontes públicas de inteligência e devem ser utilizadas exclusivamente para atividades legítimas de monitoramento, pesquisa e segurança defensiva.

---

## 👨‍💻 Autor

**Arthur Barroso Neiva**

Estudante de **Análise e Desenvolvimento de Sistemas**
Foco em **Cybersecurity, Cyber Threat Intelligence e Desenvolvimento de Software**

GitHub: **[@ArthurNeiva017](https://github.com/ArthurNeiva017)**

---

<div align="center">

### ☁️ Cyber Threat Hub

**Monitorar • Analisar • Detectar • Alertar**

</div>
