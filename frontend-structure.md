# Frontend Structure Documentation
## MSTI Automation - Grafana Clone

### Overview
Frontend MSTI Automation adalah aplikasi React dengan TypeScript yang dibangun menggunakan Vite. Aplikasi ini menyediakan interface untuk monitoring, alerting, dan automation management yang mirip dengan Grafana namun dengan design yang lebih sederhana dan sesuai preferensi.

### Technology Stack
- **Framework**: React 18.2.0 dengan TypeScript
- **Build Tool**: Vite 5.1.4
- **Styling**: Tailwind CSS 3.4.1 + SASS
- **Routing**: React Router DOM 6.22.3
- **State Management**: Zustand 5.0.3
- **Charts**: Multiple libraries untuk visualization
  - ApexCharts + React-ApexCharts
  - Chart.js + React-Chart.js-2
  - ECharts + ECharts-for-React
  - Recharts
- **HTTP Client**: Axios 1.6.7
- **Date Handling**: date-fns 3.3.1
- **Development**: ESLint + TypeScript ESLint

### Directory Structure

```
frontend/msti-automation/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components
│   │   └── visualizations/ # Chart dan visualization components
│   ├── pages/              # Page components
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── alerting/       # Alert management
│   │   ├── connections/    # Data source management
│   │   └── automation/     # Automation features
│   ├── services/           # API calls dan business logic
│   ├── store/              # Zustand state management
│   ├── context/            # React Context providers
│   ├── types/              # TypeScript type definitions
│   ├── assets/             # Static assets
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   ├── config.ts           # Application configuration
│   └── index.css           # Global styles
├── public/                 # Static public assets
├── docker-compose.yml      # Docker configuration
├── Dockerfile             # Container configuration
├── nginx.conf             # Nginx configuration
├── tailwind.config.cjs    # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

### Core Components

#### 1. Layout Components (`src/components/layout/`)
- **`Layout.tsx`**: Main application layout wrapper
- **`Header.tsx`**: Top navigation bar dengan user info
- **`Sidebar.tsx`**: Side navigation menu

#### 2. Visualization Components (`src/components/visualizations/`)
- **`TimeSeries.tsx`**: Time series charts untuk metrics
- **`Gauge.tsx`**: Gauge charts untuk single value metrics
- **`Table.tsx`**: Tabular data display
- **`Interface.tsx`**: Network interface status display
  - Interface card components
  - Status indicators (UP/DOWN)
  - Bandwidth dan error metrics
  - Grid layout untuk multiple interfaces

#### 3. Shared Components (`src/components/`)
- **`NewDashboard.tsx`**: Dashboard creation component
- **`SourceSelector.tsx`**: Data source selection widget

### Page Structure

#### 1. Dashboard (`src/pages/dashboard/`)
- **`DashboardExplorer.tsx`**: Dashboard listing dan management
- **`NewDashboard.tsx`**: Dashboard creation form
- **`PanelForm.tsx`**: Panel creation dan editing

#### 2. Main Dashboard (`src/pages/Dashboard.tsx`)
- **372 lines** - Main dashboard view
- Real-time data updates
- Panel grid layout
- Interactive visualizations

#### 3. Alerting (`src/pages/alerting/`)

**Alert Rules:**
- **`AlertRules.tsx`**: Alert rules listing
- **`forms/AlertRuleForm.tsx`**: Create/edit alert rules

**Contact Points:**
- **`contacts/ContactPointsList.tsx`**: Contact points management
- **`contacts/ContactPointForm.tsx`**: Create/edit contact points

#### 4. Connections (`src/pages/connections/`)
- **`DataSources.tsx`**: Data source listing
- **`NewConnection.tsx`**: Connection type selection
- **`datasource-forms/InfluxDBForm.tsx`**: InfluxDB configuration form

#### 5. Automation (`src/pages/automation/`)

**Webhook Management:**
- **`webhook/WebhookList.tsx`**: Webhook endpoints listing
- **`webhook/WebhookForm.tsx`**: Create/edit webhooks

**Ansible Management:**
- **`ansible/server/`**: Ansible server management
  - `ServerList.tsx`: Server listing
  - `ServerForm.tsx`: Server configuration
- **`ansible/config/`**: Configuration management
  - `ConfigList.tsx`: Config listing
  - `ConfigForm.tsx`: Config editing
- **`ansible/inventory/`**: Inventory management
  - `InventoryList.tsx`: Inventory listing
  - `InventoryForm.tsx`: Inventory editing
- **`ansible/scenario/`**: Scenario management
  - `ScenarioList.tsx`: Scenario listing
  - `ScenarioForm.tsx`: Scenario creation/editing

### Services Layer (`src/services/`)

#### 1. API Service (`api.ts`)
- Axios instance configuration
- Base URL: `http://192.168.238.10:3001/api`
- Request/Response interceptors
- Authentication handling
- Error handling

#### 2. Specialized Services
- **`dataSourceService.ts`**: Data source operations
- **`metricService.ts`**: Metric fetching dan processing
- **`visualizationService.ts`**: Visualization data handling

### State Management (`src/store/`)

#### Zustand Stores:
- **`apiStore.ts`**: API state management
- **`dashboardStore.ts`**: Dashboard state
- **`dataSourceStore.ts`**: Data source state
- **`ansibleStore.ts`**: Ansible automation state

### Context Providers (`src/context/`)
- **`ApiContext.tsx`**: API configuration context
- **`SourceContext.tsx`**: Data source context

### Type Definitions (`src/types/`)
- **`flux.ts`**: Flux query type definitions
- **`vite-env.d.ts`**: Vite environment types

### Key Features Implemented

#### 1. Dashboard Management
- Dashboard creation dan editing
- Panel management dengan drag-and-drop (dapat ditambahkan)
- Multiple visualization types
- Real-time data updates
- Variable support untuk dynamic queries

#### 2. Data Source Integration
- InfluxDB connection management
- Connection testing
- Multiple data source support
- Query builder interface

#### 3. Visualization Types
- **Time Series**: Line charts untuk time-based data
- **Gauge**: Circular gauge untuk single values
- **Table**: Tabular data dengan sorting
- **Interface**: Network interface monitoring dengan status cards

#### 4. Alert Management
- Alert rule configuration
- Contact point management
- Webhook integration
- Alert history (dapat ditambahkan)

#### 5. Automation Features
- Ansible server management
- Playbook management
- Inventory configuration
- Scenario creation
- Webhook endpoints management

### Styling Architecture

#### Tailwind CSS Configuration
- Custom theme configuration
- Component utilities
- Responsive design
- Dark mode support (dapat ditambahkan)

#### SASS Integration
- Modular CSS architecture
- Component-specific styles
- Global style definitions

### Routing Structure

```
/                           → Dashboard (redirect)
/dashboard                  → Dashboard Explorer
/dashboard/new             → New Dashboard
/dashboard/view/:id        → Single Dashboard View
/dashboard/:id/panel/new   → New Panel Form
/dashboard/:id/panel/edit/:panelId → Edit Panel

/alerting/rules            → Alert Rules List
/alerting/rules/new        → New Alert Rule
/alerting/contacts         → Contact Points List
/alerting/contacts/new     → New Contact Point

/connections/data-sources  → Data Sources List
/connections/new           → New Connection
/connections/data-sources/new/influxdb → InfluxDB Form

/automation/webhook        → Webhook List
/automation/ansible/server → Ansible Server List
/automation/ansible/config → Config List
/automation/ansible/inventory → Inventory List
/automation/ansible/scenario → Scenario List
```

### Performance Optimizations
- Lazy loading untuk routes
- Component memoization
- Efficient re-rendering dengan Zustand
- Vite optimizations untuk fast builds

### Development Features
- Hot Module Replacement (HMR)
- TypeScript strict mode
- ESLint dengan React hooks rules
- PostCSS processing

### Build Configuration
- **Development**: `npm run dev` dengan Vite dev server
- **Production**: `npm run build` dengan TypeScript compilation
- **Preview**: `npm run preview` untuk testing builds

### Container Configuration
- **Nginx**: Production serving dengan Nginx
- **Multi-stage builds**: Development dan production
- **Port**: 6969 (production), 5173 (development)

### Extension Points
- Plugin system untuk visualization baru
- Theme customization
- Custom automation providers
- Additional data source types

### UI/UX Features
- Responsive design untuk mobile dan desktop
- Loading states dan error handling
- Toast notifications (dapat ditambahkan)
- Modal dialogs untuk forms
- Confirmation dialogs untuk destructive actions

### Security Features
- XSS protection dengan React
- CSRF protection
- Input sanitization
- Secure API communication

Frontend ini dirancang dengan fokus pada user experience yang intuitif, performance yang optimal, dan maintainability yang tinggi. Architecture modular memungkinkan pengembangan fitur baru dengan mudah dan scaling yang efisien. 