import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import { SourceProvider } from './context/SourceContext'
import './App.css'
import ContactPointsList from './pages/alerting/contacts/ContactPointsList'
import ContactPointForm from './pages/alerting/contacts/ContactPointForm'

function App() {
  return (
    <SourceProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/new" element={<NewDashboard />} />
            <Route path="/dashboard/view/:id" element={<SingleDashboard />} />
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
          </Routes>
        </Layout>
      </Router>
    </SourceProvider>
  )
}

export default App
