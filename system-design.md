# System Design Document
## MSTI Automation - Grafana Clone

### Overview
Dokumen ini menjelaskan design sistem MSTI Automation yang merupakan platform monitoring dan automation management. Sistem ini dirancang untuk memberikan alternatif yang lebih sederhana dan customizable dari Grafana dengan integrasi automation menggunakan Ansible.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MSTI Automation Platform                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Frontend    │    │   Backend    │    │   External   │     │
│  │   React TS    │◄──►│ Express.js   │◄──►│   Services   │     │
│  │   Port: 6969  │    │ Port: 3001   │    │              │     │
│  └───────────────┘    └──────────────┘    └──────────────┘     │
│                               │                   │             │
│                               ▼                   │             │
│                    ┌──────────────┐               │             │
│                    │ PostgreSQL   │               ▼             │
│                    │ Database     │    ┌──────────────┐         │
│                    │ (Prisma)     │    │   InfluxDB   │         │
│                    └──────────────┘    │ Time Series  │         │
│                               │        │   Database   │         │
│                               ▼        └──────────────┘         │
│                    ┌──────────────┐               │             │
│                    │ Webhook      │               ▼             │
│                    │ Server       │    ┌──────────────┐         │
│                    │ Port: 3002   │    │ Ansible      │         │
│                    └──────────────┘    │ Servers      │         │
│                                        │ Automation   │         │
│                                        └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components Design

#### 1. Frontend Layer (React + TypeScript)

**Architecture Pattern**: Component-Based Architecture dengan Hooks
**State Management**: Zustand (Lightweight state management)
**Routing**: React Router DOM dengan nested routing

```
Frontend Components Hierarchy:
├── App.tsx (Main app dengan routing)
├── Layout/
│   ├── Header.tsx (Navigation bar)
│   ├── Sidebar.tsx (Side navigation)
│   └── Layout.tsx (Main layout wrapper)
├── Pages/
│   ├── Dashboard/ (Dashboard management)
│   ├── Alerting/ (Alert rules & contacts)
│   ├── Connections/ (Data source management)
│   └── Automation/ (Ansible & webhook management)
├── Components/
│   ├── Visualizations/ (Chart components)
│   └── Common/ (Reusable UI components)
└── Services/
    ├── api.ts (HTTP client)
    ├── dataSourceService.ts
    └── metricService.ts
```

**Key Design Patterns:**
- **Composition over Inheritance**: React functional components
- **Custom Hooks**: Reusable stateful logic
- **Context Pattern**: Global state sharing
- **Provider Pattern**: Dependency injection

#### 2. Backend Layer (Express.js)

**Architecture Pattern**: Layered Architecture
**Design**: MVC (Model-View-Controller) pattern

```
Backend Layer Structure:
├── Controllers/ (HTTP request handlers)
├── Services/ (Business logic)
├── Models/ (Database models via Prisma)
├── Routes/ (API endpoint definitions)
├── Utils/ (Helper functions)
└── Middleware/ (Cross-cutting concerns)
```

**Key Design Patterns:**
- **Repository Pattern**: Data access abstraction (Prisma)
- **Service Layer Pattern**: Business logic separation
- **Dependency Injection**: Service composition
- **Error Handling Middleware**: Centralized error management

#### 3. Database Design (PostgreSQL + Prisma)

**Design Pattern**: Domain-Driven Design with normalized schema

**Core Entities:**
- **User**: Authentication & authorization
- **DataSource**: External data connection management
- **Visualization**: Dashboard & panel definitions
- **Query**: Query definitions dengan Flux support
- **AlertRule**: Alert configuration
- **Webhook**: Webhook configuration
- **AnsibleConfig**: Automation configuration

**Relationships:**
- User → DataSource (One-to-Many)
- User → AlertRule (One-to-Many)  
- DataSource → Visualization (One-to-Many)
- Visualization → Query (One-to-Many)
- Visualization → Visualization (Self-referencing untuk dashboard-panel)

### Data Flow Design

#### 1. Monitoring Data Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ InfluxDB│───►│ Backend │───►│Transform│───►│Frontend │
│         │    │   API   │    │ Service │    │ Display │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                     │
                     ▼
               ┌─────────┐
               │WebSocket│
               │ Service │
               └─────────┘
                     │
                     ▼
               ┌─────────┐
               │Real-time│
               │ Updates │
               └─────────┘
```

**Flow Steps:**
1. **Data Query**: Frontend requests data via API
2. **Query Execution**: Backend executes Flux queries ke InfluxDB
3. **Data Transformation**: Raw data diformat untuk visualization
4. **Response**: Transformed data dikirim ke frontend
5. **Rendering**: Frontend merender visualization
6. **Real-time Updates**: WebSocket untuk live data

#### 2. Alert Processing Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Metric  │───►│ Alert   │───►│Threshold│───►│Webhook  │
│Collector│    │Evaluator│    │ Check   │    │Trigger  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                   │
                                                   ▼
                                            ┌─────────┐
                                            │ Ansible │
                                            │Execution│
                                            └─────────┘
```

**Flow Steps:**
1. **Metric Collection**: Scheduled metric gathering
2. **Alert Evaluation**: Compare dengan alert rules
3. **Threshold Check**: Evaluate alert conditions
4. **Webhook Trigger**: Send webhook jika alert triggered
5. **Ansible Execution**: Execute automation playbooks

#### 3. Automation Workflow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Alert   │───►│Webhook  │───►│Ansible  │───►│Target   │
│Triggered│    │Received │    │Playbook │    │Systems  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                     │              │
                     ▼              ▼
               ┌─────────┐    ┌─────────┐
               │Log Event│    │Update   │
               │         │    │Status   │
               └─────────┘    └─────────┘
```

### Deployment Design

#### 1. Containerization Strategy
```
Development Environment:
├── docker-compose.dev.yml
├── Hot reload enabled
├── Development databases
└── Debug logging

Production Environment:
├── docker-compose.prod.yml
├── Optimized builds
├── Production databases
└── Structured logging
```

#### 2. CI/CD Pipeline Design
```
GitHub Actions Workflow:
├── Code Push
├── Automated Testing
├── Build Docker Images
├── Push to Docker Hub
├── Deploy to Production
└── Health Checks
```

Design sistem ini memberikan foundation yang solid untuk scaling, maintenance, dan extension MSTI Automation platform dengan mempertimbangkan best practices dalam software architecture dan system design. 