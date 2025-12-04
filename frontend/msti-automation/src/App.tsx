import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import Dashboard from './pages/dashboard/DashboardExplorer'
import NewDashboard from './pages/dashboard/NewDashboard'
import SingleDashboard from './pages/Dashboard'
import PanelForm from './pages/dashboard/PanelForm'
import AlertRules from './pages/alerting/AlertRules'
import AlertRuleForm from './pages/alerting/forms/AlertRuleForm'
import NewConnection from './pages/connections/NewConnection'
import DataSources from './pages/connections/DataSources'
import InfluxDBForm from './pages/connections/datasource-forms/InfluxDBForm'
import WebhookList from './pages/automation/webhook/WebhookList'
import WebhookForm from './pages/automation/webhook/WebhookForm'
import AnsibleServerList from './pages/automation/ansible/server/ServerList'
import ServerForm from './pages/automation/ansible/server/ServerForm'
import ConfigList from './pages/automation/ansible/config/ConfigList'
import ConfigForm from './pages/automation/ansible/config/ConfigForm'
import InventoryList from './pages/automation/ansible/inventory/InventoryList'
import InventoryForm from './pages/automation/ansible/inventory/InventoryForm'
import ScenarioList from './pages/automation/ansible/scenario/ScenarioList'
import ScenarioForm from './pages/automation/ansible/scenario/ScenarioForm'
import FlowList from './pages/automation/discovery/FlowList'
import FlowNew from './pages/automation/discovery/FlowNew'
import FlowDetail from './pages/automation/discovery/FlowDetail'
import DiscoveryList from './pages/automation/discovery/DiscoveryList'
import NewDiscovery from './pages/automation/discovery/NewDiscovery'
import DiscoveryDetail from './pages/automation/discovery/DiscoveryDetail'
import TelegrafList from './pages/automation/telegraf/TelegrafList'
import TelegrafForm from './pages/automation/telegraf/TelegrafForm'
import Login from './pages/Login'
import { SourceProvider } from './context/SourceContext'
import { ApiProvider } from './context/ApiContext'
import useAuthStore from './store/authStore'
import './App.css'
import ContactPointsList from './pages/alerting/contacts/ContactPointsList'
import ContactPointForm from './pages/alerting/contacts/ContactPointForm'

import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  const { checkSession } = useAuthStore();

  // Check session on app load
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <ApiProvider>
      <SourceProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* Dashboard Routes */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/new" element={<NewDashboard />} />
                    <Route path="/dashboard/view/:id" element={<SingleDashboard />} />
                    <Route path="/dashboard/:dashboardId" element={<Dashboard />} />
                    <Route path="/dashboard/:dashboardId/panel/new" element={<PanelForm />} />
                    <Route path="/dashboard/:dashboardId/panel/edit/:panelId" element={<PanelForm />} />
                    
                    {/* Alerting Routes */}
                    <Route path="/alerting/rules" element={<AlertRules />} />
                    <Route path="/alerting/rules/new" element={<AlertRuleForm />} />
                    <Route path="/alerting/rules/edit/:id" element={<AlertRuleForm />} />
                    <Route path="/alerting/contacts" element={<ContactPointsList />} />
                    <Route path="/alerting/contacts/new" element={<ContactPointForm />} />
                    <Route path="/alerting/contacts/edit/:id" element={<ContactPointForm />} />
                    
                    {/* Connections Routes */}
                    <Route path="/connections/new" element={<NewConnection />} />
                    <Route path="/connections/data-sources" element={<DataSources />} />
                    <Route path="/connections/data-sources/new/influxdb" element={<InfluxDBForm />} />
                    <Route path="/connections/data-sources/edit/:id" element={<InfluxDBForm />} />
                    
                    {/* Automation Routes */}
                    {/* Webhook Routes */}
                    <Route path="/automation/webhook" element={<WebhookList />} />
                    <Route path="/automation/webhook/new" element={<WebhookForm />} />
                    <Route path="/automation/webhook/edit/:id" element={<WebhookForm />} />
                    
                    {/* Ansible Routes */}
                    {/* Server Routes */}
                    <Route path="/automation/ansible/server" element={<AnsibleServerList />} />
                    <Route path="/automation/ansible/server/new" element={<ServerForm />} />
                    <Route path="/automation/ansible/server/edit/:id" element={<ServerForm />} />
                    
                    {/* Config Routes */}
                    <Route path="/automation/ansible/config" element={<ConfigList />} />
                    <Route path="/automation/ansible/config/new" element={<ConfigForm />} />
                    <Route path="/automation/ansible/config/edit/:id" element={<ConfigForm />} />
                    
                    {/* Inventory Routes */}
                    <Route path="/automation/ansible/inventory" element={<InventoryList />} />
                    <Route path="/automation/ansible/inventory/new" element={<InventoryForm />} />
                    <Route path="/automation/ansible/inventory/edit/:id" element={<InventoryForm />} />
                    
                    {/* Scenario Routes */}
                    <Route path="/automation/ansible/scenario" element={<ScenarioList />} />
                    <Route path="/automation/ansible/scenario/new" element={<ScenarioForm />} />
                    <Route path="/automation/ansible/scenario/:id" element={<ScenarioForm />} />

                    {/* CDP Discovery Routes */}
                    <Route path="/automation/cdp" element={<DiscoveryList />} />
                    <Route path="/automation/cdp/new" element={<NewDiscovery />} />
                    <Route path="/automation/cdp/:id" element={<DiscoveryDetail />} />

                    {/* Flow Analytic (dummy FE) */}
                    <Route path="/automation/flow" element={<FlowList />} />
                    <Route path="/automation/flow/new" element={<FlowNew />} />
                    <Route path="/automation/flow/detail" element={<FlowDetail />} />

                    {/* Telegraf Routes */}
                    <Route path="/automation/telegraf" element={<TelegrafList />} />
                    <Route path="/automation/telegraf/new" element={<TelegrafForm />} />
                    <Route path="/automation/telegraf/edit/:filename" element={<TelegrafForm />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </SourceProvider>
    </ApiProvider>
  )
}

export default App
