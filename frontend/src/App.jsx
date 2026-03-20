import React, { useState } from 'react'
import { Layout, Menu, Typography, ConfigProvider } from 'antd'
import {
  DashboardOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Records from './pages/Records'
import Reports from './pages/Reports'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: 'tasks', icon: <CheckSquareOutlined />, label: '任务管理' },
  { key: 'records', icon: <FileTextOutlined />, label: '工作记录' },
  { key: 'reports', icon: <BarChartOutlined />, label: '周报月报' },
]

const pageMap = {
  dashboard: <Dashboard />,
  tasks: <Tasks />,
  records: <Records />,
  reports: <Reports />,
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          style={{
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
              {collapsed ? 'AI' : '🚀 AI工作台'}
            </Title>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key)}
            style={{ borderRight: 0 }}
          />
        </Sider>
        <Layout>
          <Header style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Title level={4} style={{ margin: 0 }}>
              {menuItems.find(m => m.key === currentPage)?.label}
            </Title>
          </Header>
          <Content style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 360,
            overflow: 'auto',
          }}>
            {pageMap[currentPage]}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
