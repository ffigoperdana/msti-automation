# Backend Structure Documentation
## MSTI Automation - Grafana Clone

### Overview
Backend MSTI Automation adalah sistem backend yang dibangun dengan Express.js dan TypeScript yang menyediakan API untuk sistem monitoring dan automation yang mirip dengan Grafana. Sistem ini mendukung koneksi ke InfluxDB, manajemen alert, dan integrasi dengan Ansible untuk automation.

### Technology Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL dengan Prisma ORM
- **Time Series DB**: InfluxDB (client v1.35.0)
- **Process Manager**: PM2
- **Documentation**: Swagger UI
- **WebSocket**: ws v8.16.0
- **HTTP Client**: Axios

### Directory Structure

```
backend/
├── src/
│   ├── controllers/          # Route handlers dan business logic
│   ├── services/            # Business logic dan external integrations
│   ├── routes/              # Route definitions
│   ├── utils/               # Utility functions
│   ├── swagger/             # API documentation
│   ├── app.js               # Express app configuration
│   ├── index.js             # Application entry point
│   ├── server.js            # Server setup
│   └── webhook_server.js    # Dedicated webhook server
├── prisma/                  # Database schema dan migrations
├── ansible-config/          # Ansible automation configurations
├── docker-compose.yml       # Docker services configuration
├── Dockerfile              # Container configuration
├── ecosystem.config.js     # PM2 configuration
└── entrypoint.sh           # Container startup script
```

### Core Components

#### 1. Controllers (`src/controllers/`)
Menangani HTTP requests dan responses:

- **`dataSourceController.js`** (351 lines)
  - Manajemen koneksi data source (InfluxDB, Prometheus)
  - Testing koneksi dan validasi
  - CRUD operations untuk data sources

- **`visualizationController.js`** (850 lines) 
  - Core visualization engine
  - Dashboard management (CRUD)
  - Panel management dan query execution
  - Flux query validation dan execution
  - Data transformation untuk berbagai tipe visualisasi

- **`alertRuleController.js`** (32 lines)
  - Manajemen alert rules
  - Alert threshold configuration

- **`automationController.js`** (49 lines)
  - Webhook handling dari alert system
  - Automation rule management
  - Integration dengan ansible automation

- **`ansibleConfigController.js`** (76 lines)
  - Ansible configuration management
  - CRUD untuk ansible configs

- **`ansiblePlaybookController.js`** (76 lines)
  - Playbook management
  - Execution management

- **`userController.js`** (32 lines)
  - User management (basic implementation)

- **`variableController.js`** (176 lines)
  - Dashboard variables management
  - Query variables untuk dynamic queries

- **`dashboardController.js`** (211 lines)
  - Dashboard-specific operations
  - Panel management dalam dashboard

- **`sourceController.js`** (250 lines)
  - Source data management
  - Metric collection dan aggregation

#### 2. Services (`src/services/`)
Business logic dan external integrations:

- **`metricService.js`** (388 lines)
  - InfluxDB query execution
  - Data transformation dan formatting
  - Metric collection dan processing

- **`automationService.js`** (99 lines)
  - Webhook processing dari alert system
  - Automation rule evaluation
  - Integration dengan external systems

- **`ansibleService.js`** (100 lines)
  - Ansible playbook execution
  - Inventory management
  - Variables dan configuration handling
  - Temporary file management untuk execution

- **`alertService.js`** (69 lines)
  - Alert rule evaluation
  - Webhook triggering
  - Alert history management

- **`websocketService.js`** (141 lines)
  - Real-time communication
  - Live data streaming
  - Dashboard updates

- **`metricServiceFirst.js`** (111 lines)
  - Alternative metric service implementation
  - Legacy support

#### 3. Database Layer (Prisma)

**Schema Models:**
- **User**: User management dengan role-based access
- **DataSource**: InfluxDB/Prometheus connections
- **Visualization**: Dashboard dan panel definitions
- **Query**: Query definitions untuk panels
- **AlertRule**: Alert configuration dan thresholds
- **AnsibleConfig**: Ansible server configurations
- **AnsiblePlaybook**: Playbook definitions
- **Variable**: Dashboard variables untuk dynamic queries
- **DashboardVariable**: Variable bindings untuk dashboards

#### 4. Routes (`src/routes/`)
- **`sourceRoutes.js`**: Source data endpoints
- **`visualizationRoutes.js`**: Visualization API endpoints

### Key Features Implemented

#### 1. Data Source Management
- InfluxDB integration dengan Flux query support
- Connection testing dan validation
- Multiple data source support
- Bucket dan measurement discovery

#### 2. Visualization Engine
- Dashboard creation dan management
- Multiple panel types (time series, gauge, table, interface)
- Real-time data updates via WebSocket
- Query builder dengan Flux support
- Variable substitution dalam queries

#### 3. Alert System
- Alert rule configuration
- Threshold-based alerting
- Webhook notifications
- Alert history tracking
- Contact point management

#### 4. Automation Integration
- Ansible server management
- Playbook execution
- Inventory management
- Configuration management
- Webhook-triggered automation

#### 5. Real-time Features
- WebSocket connections untuk live updates
- Real-time metric streaming
- Dashboard auto-refresh

### Configuration Files

#### PM2 Ecosystem (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'msti-backend',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

#### Docker Configuration
- **Multi-stage build** untuk optimasi
- **Development** dan **production** environments
- **Volume mounting** untuk hot reload
- **Environment variables** support

### Security Features
- CORS configuration
- Input validation
- Error handling middleware
- Environment-based configuration

### Performance Features
- Connection pooling untuk database
- Query caching (dapat ditambahkan)
- Resource limiting dalam Docker
- Memory management dengan PM2

### Extension Points
- Plugin system untuk data sources baru
- Custom visualization types
- Alert channel extensions
- Automation provider integration

### Development Workflow
1. **Development**: `npm run dev` dengan hot reload
2. **Production**: PM2 dengan process management
3. **Containerization**: Docker dengan multi-stage builds
4. **Database**: Prisma migrations

### API Documentation
- Swagger UI tersedia di `/api-docs`
- RESTful API design
- Comprehensive error responses
- Input validation

Struktur backend ini dirancang untuk scalability dan maintainability, dengan clear separation of concerns dan modular architecture yang memungkinkan ekstensibilitas untuk fitur-fitur baru. 