# Guia de Implementação: Agente Claude Code para Fastify v5 OAuth API

## Visão Geral

Este guia explica como usar o agente Claude Code especializado para criar automaticamente uma infraestrutura completa de API OAuth com Fastify v5, incluindo:

- ✅ Arquitetura Docker modular com single docker-compose.yml
- ✅ PostgreSQL 15 com migrations e backups automatizados
- ✅ Redis 7 para caching e sessões
- ✅ OAuth 2.0 (Google + Apple Sign-In)
- ✅ Caddy 2 reverse proxy com HTTPS automático
- ✅ Scripts modulares para gerenciamento de serviços
- ✅ Configuração completa pronta para produção

## Estrutura dos Arquivos

Você receberá 3 arquivos principais:

```
📁 Arquivos Gerados
├── fastify-oauth-infrastructure-agent.md    # Agente Claude Code principal
├── CLAUDE.md                                 # Contexto persistente do projeto
└── IMPLEMENTATION_GUIDE.md                   # Este guia (você está aqui)
```

## Passo 1: Preparar o Ambiente

### 1.1 Pré-requisitos

Certifique-se de ter instalado:

```bash
# Verificar Docker
docker --version          # Necessário: 27.0+
docker compose version    # Necessário: v2.39.4+

# Verificar Node.js
node --version           # Necessário: 22.0+
npm --version            # Necessário: 10.0+
```

### 1.2 Instalar Claude Code

Se ainda não tem o Claude Code instalado:

```bash
# Via npm (recomendado)
npm install -g @anthropic-ai/claude-code

# Ou via Homebrew (macOS)
brew install claude-code
```

## Passo 2: Configurar o Agente no Projeto

### 2.1 Estrutura Recomendada

Crie a estrutura inicial do projeto:

```bash
# Criar diretório do projeto
mkdir meu-projeto-fastify
cd meu-projeto-fastify

# Criar estrutura Claude Code
mkdir -p .claude/agents

# Copiar os arquivos gerados
cp fastify-oauth-infrastructure-agent.md .claude/agents/
cp CLAUDE.md ./
```

### 2.2 Verificar Instalação do Agente

```bash
# Listar agentes disponíveis
claude code agents list

# Você deve ver:
# - fastify-oauth-infrastructure-specialist
```

## Passo 3: Executar o Agente

### 3.1 Método 1: Via Command Line (Recomendado)

```bash
# Inicializar projeto vazio
cd meu-projeto-fastify

# Invocar o agente
claude code "Use o agente fastify-oauth-infrastructure-specialist para criar a infraestrutura completa do zero"
```

### 3.2 Método 2: Via Interface Interativa

```bash
# Abrir Claude Code no projeto
claude code

# No prompt interativo, digitar:
@fastify-oauth-infrastructure-specialist crie toda a infraestrutura de OAuth API
```

### 3.3 O Que o Agente Fará Automaticamente

O agente executará todas as etapas definidas no workflow:

**Fase 1: Inicialização**
- ✅ Criar estrutura de diretórios completa
- ✅ Inicializar package.json com ES modules
- ✅ Criar .gitignore apropriado

**Fase 2: Infraestrutura Docker**
- ✅ Gerar docker-compose.yml com todos os serviços
- ✅ Criar Dockerfiles otimizados (multi-stage builds)
- ✅ Configurar PostgreSQL (database.Dockerfile + configs)
- ✅ Configurar Redis (redis.Dockerfile + redis.conf)
- ✅ Configurar API (server.Dockerfile)
- ✅ Configurar Caddy (caddy.Dockerfile + Caddyfile)

**Fase 3: Scripts Modulares**
- ✅ Criar scripts-docker/postgres/* (run, stop, log, exec, backup)
- ✅ Criar scripts-docker/redis/* (run, stop, log, exec)
- ✅ Criar scripts-docker/api/* (run, stop, log, exec, rebuild)
- ✅ Criar scripts-docker/caddy/* (run, stop, log, exec, reload)
- ✅ Criar scripts-docker/system/* (start-all, stop-all, health-check)

**Fase 4: Configuração**
- ✅ Gerar .env.example com todas as variáveis
- ✅ Copiar para .env (você precisará preencher os valores reais)

**Fase 5: Dependências**
- ✅ Instalar todas as dependências do npm
- ✅ Configurar TypeScript, Vitest, ESLint, Prettier

**Fase 6: Package.json**
- ✅ Adicionar todos os scripts npm (docker:*, db:*, test:*)

## Passo 4: Configurar Variáveis de Ambiente

### 4.1 Copiar Template

```bash
# O agente já cria .env.example
# Você precisa criar o .env real
cp .env.example .env
```

### 4.2 Configurar Variáveis Essenciais

Edite `.env` e altere estes valores:

```env
# Docker Container Names (podem manter os padrões ou customizar)
CONTAINER_POSTGRES_NAME=fastify-oauth-postgres
CONTAINER_REDIS_NAME=fastify-oauth-redis
CONTAINER_API_NAME=fastify-oauth-api
CONTAINER_CADDY_NAME=fastify-oauth-caddy

# Database (usar senha forte)
DATABASE_PASSWORD=sua-senha-segura-aqui

# JWT (gerar chave de 32+ caracteres)
JWT_SECRET=sua-chave-secreta-minimo-32-caracteres

# Google OAuth (obter em console.cloud.google.com)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret

# Apple OAuth (obter em developer.apple.com)
APPLE_CLIENT_ID=com.seuapp.service
APPLE_TEAM_ID=seu-team-id
APPLE_KEY_ID=seu-key-id
# Baixar AuthKey_XXXXX.p8 e colocar em ./keys/
APPLE_PRIVATE_KEY_PATH=./keys/AuthKey_XXXXX.p8

# Caddy (para desenvolvimento local)
CADDY_DOMAIN=localhost
CADDY_EMAIL=seu-email@exemplo.com
# Usar staging Let's Encrypt em desenvolvimento
CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory
```

### 4.3 Obter Credenciais OAuth

**Google OAuth:**
1. Acessar https://console.cloud.google.com/
2. Criar novo projeto ou selecionar existente
3. Ativar Google+ API
4. Criar credenciais OAuth 2.0
5. Adicionar http://localhost:3000/api/auth/oauth/google/callback nas URLs autorizadas
6. Copiar Client ID e Client Secret

**Apple Sign-In:**
1. Acessar https://developer.apple.com/account/
2. Certificates, Identifiers & Profiles
3. Criar App ID com Sign in with Apple habilitado
4. Criar Service ID
5. Criar Key para Sign in with Apple
6. Baixar arquivo .p8 e salvar em ./keys/
7. Anotar Team ID, Key ID, e Service ID

## Passo 5: Iniciar Infraestrutura

### 5.1 Primeira Inicialização

```bash
# Tornar scripts executáveis (caso necessário)
find scripts-docker -name "*.sh" -exec chmod +x {} \;

# Criar rede Docker
bash scripts-docker/system/network-create.sh

# Iniciar todos os serviços
npm run docker:start
# ou
bash scripts-docker/start.sh
```

### 5.2 Verificar Status

```bash
# Verificar containers
docker compose ps

# Você deve ver 4 serviços "healthy":
# - fastify-oauth-postgres
# - fastify-oauth-redis
# - fastify-oauth-api
# - fastify-oauth-caddy

# Verificar saúde
npm run docker:health
```

### 5.3 Testar Conectividade

```bash
# Testar PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Testar Redis
docker compose exec redis redis-cli ping

# Testar API
curl http://localhost:3000/health
# Deve retornar: {"status":"ok"}

# Testar Caddy (proxy reverso)
curl http://localhost/health
# Deve retornar: {"status":"ok"}
```

## Passo 6: Desenvolvimento

### 6.1 Modo Desenvolvimento

```bash
# Iniciar em modo watch (hot reload)
npm run dev

# Em outro terminal, ver logs
npm run docker:api:log
```

### 6.2 Gerenciamento de Serviços Individuais

```bash
# PostgreSQL
npm run docker:postgres          # iniciar
npm run docker:postgres:log      # ver logs
npm run docker:postgres:exec     # abrir psql
npm run docker:postgres:backup   # criar backup
npm run docker:postgres:stop     # parar

# Redis
npm run docker:redis             # iniciar
npm run docker:redis:exec        # abrir redis-cli
npm run docker:redis:log         # ver logs

# API
npm run docker:api               # iniciar
npm run docker:api:rebuild       # rebuild imagem
npm run docker:api:exec          # shell no container
npm run docker:api:log           # ver logs

# Caddy
npm run docker:caddy             # iniciar
npm run docker:caddy:reload      # recarregar config
npm run docker:caddy:log         # ver logs
```

### 6.3 Database Migrations

```bash
# Gerar nova migration
npm run db:generate

# Executar migrations
npm run db:migrate

# Abrir Drizzle Studio (visualizar DB)
npm run db:studio
```

### 6.4 Testes

```bash
# Rodar todos os testes
npm test

# Testes com UI
npm run test:ui

# Coverage
npm run test:coverage
```

## Passo 7: Estrutura Final do Projeto

Após a execução completa do agente, você terá:

```
meu-projeto-fastify/
├── .claude/
│   └── agents/
│       └── fastify-oauth-infrastructure-agent.md
├── docker/
│   ├── caddy/
│   │   ├── Caddyfile
│   │   └── caddy.Dockerfile
│   ├── database/
│   │   ├── database.Dockerfile
│   │   ├── postgresql.conf
│   │   ├── init-db.sh
│   │   ├── docker-entrypoint-extended.sh
│   │   └── backup-internal.sh
│   ├── redis/
│   │   ├── redis.Dockerfile
│   │   └── redis.conf
│   └── server/
│       └── server.Dockerfile
├── scripts-docker/
│   ├── postgres/
│   │   ├── run.sh
│   │   ├── stop.sh
│   │   ├── log.sh
│   │   ├── exec.sh
│   │   ├── remove.sh
│   │   └── backup.sh
│   ├── redis/
│   │   ├── run.sh
│   │   ├── stop.sh
│   │   ├── log.sh
│   │   ├── exec.sh
│   │   └── remove.sh
│   ├── api/
│   │   ├── run.sh
│   │   ├── stop.sh
│   │   ├── log.sh
│   │   ├── exec.sh
│   │   ├── remove.sh
│   │   └── rebuild.sh
│   ├── caddy/
│   │   ├── run.sh
│   │   ├── stop.sh
│   │   ├── log.sh
│   │   ├── exec.sh
│   │   ├── remove.sh
│   │   └── reload.sh
│   ├── system/
│   │   ├── start-all.sh
│   │   ├── stop-all.sh
│   │   ├── restart-all.sh
│   │   ├── health-check.sh
│   │   ├── logs-all.sh
│   │   ├── remove-all.sh
│   │   ├── remove-volumes.sh
│   │   ├── network-create.sh
│   │   └── network-remove.sh
│   └── start.sh
├── src/
│   ├── config/
│   ├── plugins/
│   ├── modules/
│   │   ├── auth/
│   │   └── user/
│   ├── routes/
│   │   └── api/
│   │       ├── auth/
│   │       ├── users/
│   │       └── profile/
│   ├── middleware/
│   ├── services/
│   ├── schemas/
│   ├── types/
│   ├── utils/
│   └── db/
│       ├── schema.ts
│       ├── client.ts
│       ├── migrations/
│       └── seeds/
├── test/
│   ├── helper/
│   ├── routes/
│   ├── services/
│   └── integration/
├── keys/                      # Colocar Apple AuthKey aqui
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
├── .env                       # Git ignored
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Passo 8: Verificação de Qualidade

### 8.1 Checklist de Verificação

Execute esta verificação completa:

```bash
# 1. Estrutura de diretórios
[ -d "docker/database" ] && echo "✅ docker/database" || echo "❌ docker/database"
[ -d "docker/redis" ] && echo "✅ docker/redis" || echo "❌ docker/redis"
[ -d "docker/server" ] && echo "✅ docker/server" || echo "❌ docker/server"
[ -d "docker/caddy" ] && echo "✅ docker/caddy" || echo "❌ docker/caddy"
[ -d "scripts-docker" ] && echo "✅ scripts-docker" || echo "❌ scripts-docker"

# 2. Arquivos Docker
[ -f "docker-compose.yml" ] && echo "✅ docker-compose.yml" || echo "❌ docker-compose.yml"
[ -f "docker/database/database.Dockerfile" ] && echo "✅ database.Dockerfile" || echo "❌ database.Dockerfile"
[ -f "docker/redis/redis.Dockerfile" ] && echo "✅ redis.Dockerfile" || echo "❌ redis.Dockerfile"
[ -f "docker/server/server.Dockerfile" ] && echo "✅ server.Dockerfile" || echo "❌ server.Dockerfile"
[ -f "docker/caddy/caddy.Dockerfile" ] && echo "✅ caddy.Dockerfile" || echo "❌ caddy.Dockerfile"

# 3. Configurações
[ -f ".env.example" ] && echo "✅ .env.example" || echo "❌ .env.example"
[ -f ".env" ] && echo "✅ .env" || echo "❌ .env"
[ -f "CLAUDE.md" ] && echo "✅ CLAUDE.md" || echo "❌ CLAUDE.md"

# 4. Scripts executáveis
find scripts-docker -name "*.sh" -type f | while read file; do
  [ -x "$file" ] && echo "✅ $file" || echo "❌ $file (não executável)"
done

# 5. Serviços rodando
docker compose ps | grep -q "healthy" && echo "✅ Serviços healthy" || echo "❌ Serviços não healthy"
```

## Passo 9: Troubleshooting Comum

### 9.1 Erro: "Network api-network not found"

```bash
# Criar rede manualmente
docker network create api-network
```

### 9.2 Erro: "Port already in use"

```bash
# Verificar portas em uso
lsof -i :3000   # API
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis
lsof -i :80     # Caddy HTTP
lsof -i :443    # Caddy HTTPS

# Parar processos conflitantes ou alterar portas em .env
```

### 9.3 Erro: "Permission denied" em scripts

```bash
# Tornar todos os scripts executáveis
find scripts-docker -name "*.sh" -exec chmod +x {} \;
```

### 9.4 Erro: Containers restarting continuamente

```bash
# Ver logs para identificar problema
docker compose logs api
docker compose logs postgres
docker compose logs redis
docker compose logs caddy

# Verificar .env está configurado corretamente
cat .env | grep -E "DATABASE_|REDIS_|JWT_"
```

### 9.5 Erro: API não conecta ao PostgreSQL

```bash
# Verificar PostgreSQL está rodando
docker compose ps postgres

# Testar conexão
docker compose exec postgres pg_isready -U postgres

# Verificar DATABASE_URL no .env
echo $DATABASE_URL

# Ver logs do PostgreSQL
docker compose logs postgres
```

## Passo 10: Próximos Passos

### 10.1 Implementar Lógica de Negócio

Agora que a infraestrutura está pronta, você pode:

1. **Criar rotas da API** em `src/routes/api/`
2. **Implementar autenticação OAuth** em `src/modules/auth/`
3. **Definir schemas do banco** em `src/db/schema.ts`
4. **Criar migrations** com `npm run db:generate`
5. **Escrever testes** em `test/`

### 10.2 Customizar Configurações

Ajuste conforme necessário:

- **PostgreSQL**: Editar `docker/database/postgresql.conf`
- **Redis**: Editar `docker/redis/redis.conf`
- **Caddy**: Editar `docker/caddy/Caddyfile`
- **API**: Modificar `docker/server/server.Dockerfile`

Após alterações em Dockerfiles:

```bash
# Rebuild específico
npm run docker:api:rebuild

# Ou rebuild completo
docker compose build --no-cache
docker compose up -d
```

### 10.3 Deploy para Produção

Quando estiver pronto para produção:

1. **Atualizar .env para produção:**
   ```env
   NODE_ENV=production
   CADDY_DOMAIN=api.seudominio.com
   CADDY_EMAIL=admin@seudominio.com
   CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory
   ```

2. **Gerar senhas fortes:**
   ```bash
   # JWT Secret (32+ caracteres)
   openssl rand -base64 32
   
   # Database Password
   openssl rand -base64 24
   ```

3. **Configurar OAuth produção:**
   - URLs de callback devem usar HTTPS
   - Atualizar em Google/Apple consoles

4. **Deploy:**
   ```bash
   # Subir em servidor
   docker compose up -d
   
   # Verificar
   curl https://api.seudominio.com/health
   ```

## Comandos Rápidos de Referência

```bash
# Iniciar tudo
npm run docker:start

# Parar tudo
npm run docker:stop

# Ver status
npm run docker:health

# Ver logs de todos os serviços
docker compose logs -f

# Backup do banco
npm run docker:postgres:backup

# Rebuild da API
npm run docker:api:rebuild

# Abrir shell na API
npm run docker:api:exec

# Abrir PostgreSQL
npm run docker:postgres:exec

# Abrir Redis CLI
npm run docker:redis:exec

# Recarregar Caddy
npm run docker:caddy:reload

# Modo desenvolvimento (hot reload)
npm run dev

# Executar migrations
npm run db:migrate

# Rodar testes
npm test

# Limpar tudo (CUIDADO: apaga dados)
docker compose down -v
```

## Suporte e Recursos

- **Documentação Oficial Fastify**: https://fastify.dev/
- **Docker Compose**: https://docs.docker.com/compose/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Caddy Server**: https://caddyserver.com/docs/

## Conclusão

Você agora tem uma infraestrutura completa e pronta para produção com:

✅ **Docker orchestration** modular e escalável  
✅ **PostgreSQL** com migrations automáticas  
✅ **Redis** para caching performático  
✅ **OAuth 2.0** (Google + Apple) configurado  
✅ **Caddy** com HTTPS automático  
✅ **Scripts modulares** para gerenciamento  
✅ **TypeScript + Fastify v5** com hot reload  
✅ **Testes automatizados** com Vitest  
✅ **Linting e formatting** configurados  

**O agente Claude Code automatizou toda a configuração complexa de infraestrutura, permitindo que você foque na lógica de negócio!**

---

Criado por: Agente Claude Code - Fastify OAuth Infrastructure Specialist  
Versão: 7.0 (Modular Architecture)  
Data: Outubro 2025
