# Technical Specification
## MSTI Automation - Grafana Clone

### Project Overview
MSTI Automation adalah platform monitoring dan automation management yang dirancang sebagai alternatif yang lebih sederhana dan customizable dari Grafana. Platform ini mengintegrasikan time-series monitoring dengan automation capabilities menggunakan Ansible, serta mendukung alert management dengan webhook integration.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   React + TS    │◄──►│  Express.js     │◄──►│   Services      │
│   Port: 6969    │    │  Port: 3001     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
                       ┌─────────────────┐               │
                       │   PostgreSQL    │               ▼
                       │   Database      │    ┌─────────────────┐
                       │   (Prisma ORM)  │    │    InfluxDB     │
                       └─────────────────┘    │  Time Series    │
                                │             │    Database     │
                                ▼             └─────────────────┘
                       ┌─────────────────┐               │
                       │ Webhook Server  │               ▼
                       │   Port: 3002    │    ┌─────────────────┐
                       └─────────────────┘    │ Ansible Servers │
                                              │   Automation    │
                                              └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18.2.0 + TypeScript 5.2.2
- **Build Tool**: Vite 5.1.4
- **State Management**: Zustand 5.0.3
- **Styling**: Tailwind CSS 3.4.1 + SASS 1.71.1
- **Routing**: React Router DOM 6.22.3
- **HTTP Client**: Axios 1.6.7
- **Visualization Libraries**:
  - ApexCharts 3.54.0 + React-ApexCharts 1.4.1
  - Chart.js 4.4.1 + React-Chart.js-2 5.2.0
  - ECharts 5.5.0 + ECharts-for-React 3.0.2
  - Recharts 2.12.2

#### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Language**: JavaScript (dapat diupgrade ke TypeScript)
- **Database**: PostgreSQL dengan Prisma ORM 6.6.0
- **Time Series DB**: InfluxDB dengan client 1.35.0
- **Process Manager**: PM2 6.0.5
- **WebSocket**: ws 8.16.0
- **Documentation**: Swagger UI Express 5.0.1

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **CI/CD**: GitHub Actions
- **Registry**: Docker Hub

### Database Schema

#### Core Models

**User Management:**
```sql
User {
  id: String (UUID, Primary Key)
  email: String (Unique)
  password_hash: String
  role: String
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Data Source Management:**
```sql
DataSource {
  id: String (UUID, Primary Key)
  userId: String (Foreign Key)
  name: String
  url: String
  type: String (influxdb, prometheus)
  token: String (Optional)
  username: String (Optional)
  password: String (Optional)
  database: String (Optional)
  organization: String (Optional)
  measurement: String (Optional)
  isDefault: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Visualization & Dashboard:**
```sql
Visualization {
  id: String (UUID, Primary Key)
  name: String
  type: String (dashboard, graph, gauge, table, interface)
  config: Json (Visualization configuration)
  queryConfig: Json (Query configuration)
  dataSourceId: String (Foreign Key, Optional)
  dashboardId: String (Foreign Key, Optional)
  position: Json (x, y, w, h for dashboard layout)
  createdAt: DateTime
  updatedAt: DateTime
}

Query {
  id: String (UUID, Primary Key)
  refId: String (A, B, C, etc.)
  query: String (Flux query string)
  visualizationId: String (Foreign Key)
  dataSourceId: String (Foreign Key)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Alert Management:**
```sql
AlertRule {
  id: String (UUID, Primary Key)
  userId: String (Foreign Key)
  queryId: String (Foreign Key, Optional)
  threshold: Float
  comparison_operator: String (gt, lt, eq, gte, lte)
  alertContactPointId: String (Foreign Key, Optional)
  enabled: Boolean
  dataSourceId: String (Foreign Key, Optional)
  metric_path: String (Optional)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Ansible Automation:**
```sql
AnsibleConfig {
  id: String (UUID, Primary Key)
  userId: String (Foreign Key)
  name: String
  config_file: String
  createdAt: DateTime
  updatedAt: DateTime
}

AnsiblePlaybook {
  id: String (UUID, Primary Key)
  ansibleConfigId: String (Foreign Key)
  name: String
  playbook_file: String
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Variables & Dashboard Variables:**
```sql
Variable {
  id: String (UUID, Primary Key)
  name: String
  label: String (Optional)
  type: String (query, custom, interval)
  query: String (Optional)
  options: Json (Possible values)
  current: String (Current selected value)
  dataSourceId: String (Foreign Key, Optional)
  userId: String (Foreign Key)
  createdAt: DateTime
  updatedAt: DateTime
}

DashboardVariable {
  id: String (UUID, Primary Key)
  name: String
  label: String (Optional)
  type: String (query, custom, textbox, constant)
  query: String (Optional)
  value: String[] (Array of values)
  dashboardId: String (Foreign Key)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### API Specifications

#### Base Configuration
- **Base URL**: `http://[host]:3001/api`
- **Content-Type**: `application/json`

#### Core Endpoints

**Data Sources:**
```
GET    /api/sources              # List all data sources
POST   /api/sources              # Create data source
GET    /api/sources/:id          # Get data source by ID
PUT    /api/sources/:id          # Update data source
DELETE /api/sources/:id          # Delete data source
POST   /api/sources/test-connection # Test connection
POST   /api/sources/buckets      # Get InfluxDB buckets
POST   /api/sources/measurements # Get measurements
```

**Visualizations & Dashboards:**
```
GET    /api/visualizations                    # List dashboards
POST   /api/visualizations                    # Create dashboard
GET    /api/visualizations/:id               # Get dashboard
PUT    /api/visualizations/:id               # Update dashboard
DELETE /api/visualizations/:id               # Delete dashboard
POST   /api/visualizations/:id/panels        # Create panel
PUT    /api/visualizations/panels/:panelId   # Update panel
DELETE /api/visualizations/panels/:panelId  # Delete panel
POST   /api/visualizations/query             # Execute query
POST   /api/visualizations/flux-query        # Execute Flux query
```

**Alert Management:**
```
GET    /api/alerts/rules         # List alert rules
POST   /api/alerts/rules         # Create alert rule
GET    /api/alerts/rules/:id     # Get alert rule
PUT    /api/alerts/rules/:id     # Update alert rule
DELETE /api/alerts/rules/:id     # Delete alert rule
```

**Automation:**
```
POST   /api/automation/webhook   # Handle incoming webhooks
GET    /api/automation/rules     # List automation rules
POST   /api/automation/rules     # Create automation rule
GET    /api/automation/rules/:id # Get automation rule
```

**Ansible Management:**
```
GET    /api/ansible/configs      # List ansible configs
POST   /api/ansible/configs      # Create ansible config
GET    /api/ansible/configs/:id  # Get ansible config
PUT    /api/ansible/configs/:id  # Update ansible config
DELETE /api/ansible/configs/:id  # Delete ansible config

GET    /api/ansible/playbooks    # List playbooks
POST   /api/ansible/playbooks    # Create playbook
POST   /api/ansible/playbooks/:id/execute # Execute playbook
```

### Data Flow Architecture

#### 1. Monitoring Data Flow
```
InfluxDB → Backend API → Data Processing → WebSocket → Frontend Updates
                    ↓
              Query Execution
                    ↓
            Data Transformation
                    ↓
           Visualization Rendering
```

#### 2. Alert Processing Flow
```
Metric Collection → Alert Evaluation → Threshold Check → Webhook Trigger
                                                              ↓
                                                      Ansible Execution
                                                              ↓
                                                      Automation Action
```

#### 3. Real-time Updates
```
WebSocket Connection → Live Data Stream → Component Updates → UI Refresh
```

### Deployment Specifications

#### 1. Development Environment
```yaml
Frontend: http://localhost:5173 (Vite dev server)
Backend: http://localhost:3001 (Express server)
Webhook: http://localhost:3002 (Webhook server)
Database: PostgreSQL (local atau Docker)
InfluxDB: External connection
```

#### 2. Production Environment
```yaml
Frontend: http://[host]:5172 (Nginx)
Backend: http://[host]:3001 (PM2)
Webhook: http://[host]:3002 (PM2)
Database: PostgreSQL (managed atau container)
InfluxDB: External managed service
```

#### 3. Container Configuration
```yaml
Backend Container:
  - Base: node:18-alpine
  - Working Directory: /app
  - Ports: 3001, 3002
  - Environment: NODE_ENV, DATABASE_URL
  - Health Check: /health endpoint

Frontend Container:
  - Base: nginx:alpine
  - Static Files: /usr/share/nginx/html
  - Port: 80
  - Config: custom nginx.conf
```

### Integration Specifications

#### 1. InfluxDB Integration
- **Client Library**: @influxdata/influxdb-client
- **Query Language**: Flux
- **Connection**: Token-based authentication
- **Features**: Bucket discovery, measurement listing, real-time queries

#### 2. Ansible Integration
- **Execution**: Shell command execution
- **Files**: Playbook, inventory, configuration files
- **Variables**: Dynamic variable injection
- **Output**: Execution logs dan status

#### 3. Webhook Integration
- **Format**: JSON payloads
- **Security**: Optional webhook signatures
- **Processing**: Asynchronous processing
- **Retries**: Configurable retry mechanism

### Monitoring & Logging

#### 1. Application Monitoring
- **Health Checks**: /health endpoints
- **Metrics**: Response times, error rates
- **Alerts**: System alerts untuk failures

#### 2. Logging
- **Frontend**: Console logging + error reporting
- **Backend**: Structured logging dengan winston (dapat ditambahkan)
- **Database**: Query logging
- **Access Logs**: Nginx access logs

Technical specification ini memberikan foundation yang solid untuk pengembangan dan maintenance MSTI Automation platform dengan fokus pada scalability, security, dan performance. 