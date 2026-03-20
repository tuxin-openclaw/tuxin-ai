/**
 * 任务管理页面
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, List, Button, Input, Select, Tag, Space, Modal, Form,
  Checkbox, Typography, Tooltip, Popconfirm, message, Spin, Empty, Badge
} from 'antd'
import {
  PlusOutlined, ThunderboltOutlined, DeleteOutlined,
  EditOutlined, BranchesOutlined, RightOutlined, DownOutlined,
} from '@ant-design/icons'
import { taskApi } from '../services/api'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const priorityOptions = [
  { value: 0, label: '普通', color: 'blue' },
  { value: 1, label: '重要', color: 'orange' },
  { value: 2, label: '紧急', color: 'red' },
]

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filter, setFilter] = useState(null) // null=全部, true=已完成, false=进行中
  const [splitting, setSplitting] = useState(null) // 正在拆解的任务ID
  const [collapsed, setCollapsed] = useState(new Set()) // 已折叠的父任务ID集合
  const [form] = Form.useForm()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = { parent_only: true }
      if (filter !== null) params.is_completed = filter
      const res = await taskApi.list(params)
      setTasks(res.data.tasks)
    } catch (err) {
      message.error('加载任务失败')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleCreate = () => {
    setEditingTask(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingTask) {
        await taskApi.update(editingTask.id, values)
        message.success('任务已更新')
      } else {
        await taskApi.create(values)
        message.success('任务已创建')
      }
      setModalVisible(false)
      loadTasks()
    } catch (err) {
      if (err.errorFields) return // form validation
      message.error('操作失败')
    }
  }

  const handleToggle = async (taskId) => {
    try {
      await taskApi.toggle(taskId)
      loadTasks()
    } catch (err) {
      message.error('操作失败')
    }
  }

  const handleDelete = async (taskId) => {
    try {
      await taskApi.delete(taskId)
      message.success('任务已删除')
      loadTasks()
    } catch (err) {
      message.error('删除失败')
    }
  }

  const handleSplit = async (taskId) => {
    setSplitting(taskId)
    try {
      await taskApi.split(taskId)
      message.success('AI已拆解任务为子任务')
      // 拆解后自动展开
      setCollapsed(prev => { const s = new Set(prev); s.delete(taskId); return s })
      loadTasks()
    } catch (err) {
      message.error('拆解失败')
    } finally {
      setSplitting(null)
    }
  }

  const toggleCollapse = (taskId) => {
    setCollapsed(prev => {
      const s = new Set(prev)
      s.has(taskId) ? s.delete(taskId) : s.add(taskId)
      return s
    })
  }

  const renderTask = (task, isChild = false) => {
    const pri = priorityOptions.find(p => p.value === task.priority)
    const hasChildren = task.children?.length > 0
    const isCollapsed = collapsed.has(task.id)
    return (
      <List.Item
        key={task.id}
        style={{
          paddingLeft: isChild ? 32 : 0,
          background: isChild ? '#fafafa' : 'transparent',
          borderRadius: 6,
        }}
        actions={[
          !isChild && !task.is_completed && (
            <Tooltip title="AI 拆解子任务" key="split">
              <Button
                type="link"
                icon={<ThunderboltOutlined />}
                loading={splitting === task.id}
                onClick={() => handleSplit(task.id)}
                style={{ color: '#722ed1' }}
              >
                AI拆解
              </Button>
            </Tooltip>
          ),
          <Tooltip title="编辑" key="edit">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(task)} />
          </Tooltip>,
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(task.id)} key="del">
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={
            <Checkbox
              checked={task.is_completed}
              onChange={() => handleToggle(task.id)}
            />
          }
          title={
            <Space>
              {hasChildren && !isChild && (
                <Button
                  type="text"
                  size="small"
                  icon={isCollapsed ? <RightOutlined /> : <DownOutlined />}
                  onClick={() => toggleCollapse(task.id)}
                  style={{ padding: '0 4px', color: '#888' }}
                />
              )}
              <Text delete={task.is_completed} type={task.is_completed ? 'secondary' : undefined}>
                {task.title}
              </Text>
              <Tag color={task.is_completed ? 'green' : pri?.color}>
                {task.is_completed ? '已完成' : pri?.label}
              </Tag>
              {hasChildren && (
                <Badge
                  count={`${task.children.filter(c => c.is_completed).length}/${task.children.length}`}
                  style={{ backgroundColor: isCollapsed ? '#aaa' : '#722ed1', fontSize: 11 }}
                />
              )}
            </Space>
          }
          description={task.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
              {task.description}
            </Paragraph>
          )}
        />
      </List.Item>
    )
  }

  return (
    <div>
      {/* 操作栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建任务
        </Button>
        <Select
          value={filter}
          onChange={setFilter}
          style={{ width: 120 }}
          options={[
            { value: null, label: '全部' },
            { value: false, label: '进行中' },
            { value: true, label: '已完成' },
          ]}
        />
      </Space>

      {/* 任务列表 */}
      <Spin spinning={loading}>
        {tasks.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={tasks}
            renderItem={(task) => (
              <>
                {renderTask(task)}
                {!collapsed.has(task.id) && task.children?.map(child => renderTask(child, true))}
              </>
            )}
          />
        ) : (
          <Empty description={filter === true ? '暂无已完成任务' : filter === false ? '暂无进行中任务' : '暂无任务，点击"新建任务"开始'} />
        )}
      </Spin>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="输入任务标题，如：开发用户登录功能" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <TextArea rows={3} placeholder="可选，描述任务详情" maxLength={1000} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue={0}>
            <Select options={priorityOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Tasks
