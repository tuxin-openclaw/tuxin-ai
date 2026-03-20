/**
 * 工作记录页面
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, List, Button, Input, Space, Modal, Form, DatePicker,
  Typography, Tag, Popconfirm, message, Spin, Empty, Tooltip, Divider, TreeSelect, Slider
} from 'antd'
import {
  PlusOutlined, ThunderboltOutlined, DeleteOutlined,
  EditOutlined, CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { recordApi } from '../services/api'
import { taskApi } from '../services/api'

const { Text, Paragraph, Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

function Records() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [page, setPage] = useState(1)
  const [summarizing, setSummarizing] = useState(null)
  const [form] = Form.useForm()
  const [tasks, setTasks] = useState([]) // 任务列表选项

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 10 }
      if (dateRange && dateRange[0]) params.start_date = dateRange[0].format('YYYY-MM-DD')
      if (dateRange && dateRange[1]) params.end_date = dateRange[1].format('YYYY-MM-DD')
      const res = await recordApi.list(params)
      setRecords(res.data.records)
      setTotal(res.data.total)
    } catch (err) {
      message.error('加载记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, dateRange])

  const loadTasks = useCallback(async () => {
    try {
      const res = await taskApi.list({ parent_only: false }) // 获取所有任务，包括子任务
      setTasks(res.data.tasks)
    } catch (err) {
      console.error('加载任务列表失败', err)
    }
  }, [])

  useEffect(() => {
    loadRecords()
    loadTasks()
  }, [loadRecords, loadTasks])

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ record_date: dayjs() })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      content: record.content,
      record_date: dayjs(record.record_date),
      task_id: record.task_id,
      task_progress: record.task_progress,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        content: values.content,
        record_date: values.record_date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        task_id: values.task_id,
        task_progress: values.task_progress,
      }
      if (editingRecord) {
        await recordApi.update(editingRecord.id, data)
        message.success('记录已更新')
      } else {
        await recordApi.create(data)
        message.success('记录已保存，AI已自动生成总结')
      }
      setModalVisible(false)
      loadRecords()
    } catch (err) {
      if (err.errorFields) return
      message.error('操作失败')
    }
  }

  const handleDelete = async (id) => {
    try {
      await recordApi.delete(id)
      message.success('记录已删除')
      loadRecords()
    } catch (err) {
      message.error('删除失败')
    }
  }

  const handleSummarize = async (id) => {
    setSummarizing(id)
    try {
      await recordApi.summarize(id)
      message.success('AI总结已重新生成')
      loadRecords()
    } catch (err) {
      message.error('生成总结失败')
    } finally {
      setSummarizing(null)
    }
  }

  // 任务选项格式化 - 直接使用原数据并添加 selectable 属性
  const formatTaskTree = (taskList) => {
    return taskList.map(task => {
      const hasChildren = task.children && task.children.length > 0
      return {
        ...task,
        selectable: !hasChildren, // 只有没有子任务的才能选择
        children: hasChildren ? formatTaskTree(task.children) : undefined
      }
    })
  }

  const taskTreeData = formatTaskTree(tasks)

  // TreeSelect 字段映射配置
  const fieldNames = {
    value: 'id',        // 值字段
    label: 'title',     // 显示文本字段
    children: 'children' // 子节点字段
  }

  return (
    <div>
      {/* 操作栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          记录工作
        </Button>
        <RangePicker
          value={dateRange}
          onChange={(dates) => { setDateRange(dates); setPage(1) }}
          placeholder={['开始日期', '结束日期']}
        />
      </Space>

      {/* 记录列表 */}
      <Spin spinning={loading}>
        {records.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={records}
            pagination={{
              current: page,
              pageSize: 10,
              total,
              onChange: setPage,
              showTotal: (t) => `共 ${t} 条记录`,
            }}
            renderItem={(record) => (
              <List.Item
                key={record.id}
                actions={[
                  <Tooltip title="重新生成AI总结" key="ai">
                    <Button
                      type="link"
                      icon={<ThunderboltOutlined />}
                      loading={summarizing === record.id}
                      onClick={() => handleSummarize(record.id)}
                      style={{ color: '#722ed1' }}
                    >
                      AI总结
                    </Button>
                  </Tooltip>,
                  <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} key="edit">
                    编辑
                  </Button>,
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} key="del">
                    <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <CalendarOutlined />
                      <Text strong>{record.record_date}</Text>
                      {record.task_id && record.task && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {record.task.title}
                        </Tag>
                      )}
                      {record.task_progress !== null && record.task_progress !== undefined && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>
                          进度: {record.task_progress}%
                        </Tag>
                      )}
                    </Space>
                  }
                />
                {/* 原始内容 */}
                <div style={{ marginBottom: 12 }}>
                  <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {record.content}
                  </Paragraph>
                </div>
                {/* AI总结 */}
                {record.summary && (
                  <Card
                    size="small"
                    style={{ background: '#f6f8fa', borderColor: '#e8e8e8' }}
                    title={<Text type="secondary" style={{ fontSize: 12 }}>🤖 AI 总结</Text>}
                  >
                    <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>
                      {record.summary}
                    </Paragraph>
                  </Card>
                )}
              </List.Item>
            )}
          />
        ) : (
          <Empty description={'暂无工作记录，点击"记录工作"开始'} />
        )}
      </Spin>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑工作记录' : '记录今日工作'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="record_date" label="日期" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="content"
            label="工作内容"
            rules={[{ required: true, message: '请输入今日工作内容' }]}
          >
            <TextArea
              rows={8}
              placeholder={`记录今天做了什么，例如：\n- 完成了用户登录功能开发\n- 修复了首页加载慢的问题\n- 参加了项目评审会议\n- 编写了接口文档`}
              maxLength={5000}
              showCount
            />
          </Form.Item>
          <Form.Item name="task_id" label="关联任务">
            <TreeSelect
              placeholder="选择关联的任务（可选）"
              allowClear
              treeData={taskTreeData}
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              style={{ width: '100%' }}
              fieldNames={fieldNames}
            />
          </Form.Item>
          <Form.Item
            name="task_progress"
            label="任务进度"
            dependencies={['task_id']}
          >
            {(form) => {
              const taskId = form.getFieldValue('task_id')
              if (!taskId) return null
              return (
                <Slider
                  min={0}
                  max={100}
                  marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
                  tooltip={{ formatter: (value) => `${value}%` }}
                />
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Records
