/**
 * 工作台仪表盘 - 首页
 */
import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, List, Tag, Empty, Spin } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { statsApi, taskApi, recordApi } from '../services/api'

const { Title, Text, Paragraph } = Typography

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentTasks, setRecentTasks] = useState([])
  const [recentRecords, setRecentRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, tasksRes, recordsRes] = await Promise.all([
        statsApi.get(),
        taskApi.list({ parent_only: true }),
        recordApi.list({ page_size: 5 }),
      ])
      setStats(statsRes.data)
      setRecentTasks(tasksRes.data.tasks.slice(0, 5))
      setRecentRecords(recordsRes.data.records.slice(0, 5))
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="总记录数"
              value={stats?.total_records || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="总任务数"
              value={stats?.total_tasks || 0}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="已完成任务"
              value={stats?.completed_tasks || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="活跃天数"
              value={stats?.active_days || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近任务 & 最近记录 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="📋 最近任务" size="small">
            {recentTasks.length > 0 ? (
              <List
                size="small"
                dataSource={recentTasks}
                renderItem={(task) => (
                  <List.Item>
                    <Text
                      delete={task.is_completed}
                      type={task.is_completed ? 'secondary' : undefined}
                    >
                      {task.title}
                    </Text>
                    {task.is_completed ? (
                      <Tag color="green">已完成</Tag>
                    ) : (
                      <Tag color={task.priority === 2 ? 'red' : task.priority === 1 ? 'orange' : 'blue'}>
                        {['普通', '重要', '紧急'][task.priority]}
                      </Tag>
                    )}
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="📝 最近记录" size="small">
            {recentRecords.length > 0 ? (
              <List
                size="small"
                dataSource={recentRecords}
                renderItem={(record) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text type="secondary">{record.record_date}</Text>}
                      description={
                        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                          {record.content}
                        </Paragraph>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
