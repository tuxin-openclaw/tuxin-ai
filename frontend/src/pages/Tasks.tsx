/**
 * 任务管理页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  List,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Checkbox,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Spin,
  Empty,
  Badge,
  Progress,
  Slider,
} from 'antd';
import {
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  EditOutlined,
  RightOutlined,
  DownOutlined,
  SubnodeOutlined,
} from '@ant-design/icons';
import { taskApi } from '../services/api';
import { STATUS_COMPLETED, STATUS_IN_PROGRESS, type Task } from '../constants';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface PriorityOption {
  value: number;
  label: string;
  color: string;
}

const priorityOptions: PriorityOption[] = [
  { value: 0, label: '普通', color: 'blue' },
  { value: 1, label: '重要', color: 'orange' },
  { value: 2, label: '紧急', color: 'red' },
];

interface FormValues {
  title: string;
  description?: string;
  priority: number;
  progress: number;
}

function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [status, setStatus] = useState<string | null>(() => searchParams.get('status'));
  const [splitting, setSplitting] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [parentTaskId, setParentTaskId] = useState<number | null>(null);
  const [form] = Form.useForm<FormValues>();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: { [key: string]: unknown } = { parent_only: true };
      if (status === STATUS_COMPLETED) {
        params.status = 'completed';
      } else if (status === STATUS_IN_PROGRESS) {
        params.status = 'ongoing';
      }
      const res = await taskApi.list(params);
      const tasksData = res.data.tasks;
      setTasks(tasksData);
    } catch {
      message.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSearchParams({}, { replace: true });
    }
    loadTasks();
  }, [loadTasks, searchParams, setSearchParams]);

  const handleCreate = () => {
    setEditingTask(null);
    setParentTaskId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleAddSubtask = (task: Task) => {
    setEditingTask(null);
    setParentTaskId(task.id);
    form.resetFields();
    form.setFieldsValue({ priority: task.priority });
    setModalVisible(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      progress: task.progress,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingTask) {
        await taskApi.update(editingTask.id, values);
        message.success('任务已更新');
      } else {
        const payload = parentTaskId ? { ...values, parent_id: parentTaskId } : values;
        await taskApi.create(payload);
        message.success(parentTaskId ? '子任务已创建' : '任务已创建');
        if (parentTaskId) {
          setExpandedTaskId(parentTaskId);
        }
      }
      setModalVisible(false);
      loadTasks();
    } catch (err) {
      if ((err as { errorFields?: unknown[] }).errorFields) return;
      message.error('操作失败');
    }
  };

  const handleToggle = async (taskId: number) => {
    try {
      await taskApi.toggle(taskId);
      loadTasks();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await taskApi.delete(taskId);
      message.success('任务已删除');
      loadTasks();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSplit = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    const hasChildren = task?.children && task.children.length > 0;
    Modal.confirm({
      title: 'AI 拆解任务',
      content: hasChildren
        ? `当前已有 ${task!.children!.length} 个子任务，AI 拆解会替换现有子任务，确定继续？`
        : `确定使用 AI 拆解「${task?.title}」？`,
      okText: '确定拆解',
      cancelText: '取消',
      onOk: async () => {
        setSplitting(taskId);
        try {
          await taskApi.split(taskId);
          message.success('AI 已拆解任务为子任务');
          setExpandedTaskId(taskId);
          loadTasks();
        } catch (err) {
          const error = err as { response?: { data?: { detail?: string } }; message?: string };
          const detail = error?.response?.data?.detail || error.message || '未知错误';
          message.error(`拆解失败: ${detail}`, 6);
          console.error('拆解失败', err);
        } finally {
          setSplitting(null);
        }
      },
    });
  };

  const toggleCollapse = (taskId: number) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const renderTask = (task: Task, isChild = false) => {
    const pri = priorityOptions.find((p) => p.value === task.priority);
    const hasChildren = task.children && task.children.length > 0;
    const isCollapsed = task.id !== expandedTaskId;
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
          !isChild && (
            <Tooltip title="添加子任务" key="addchild">
              <Button
                type="link"
                icon={<SubnodeOutlined />}
                onClick={() => handleAddSubtask(task)}
              />
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
          avatar={<Checkbox checked={task.is_completed} onChange={() => handleToggle(task.id)} />}
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
              {task.is_completed ? (
                <Tag color="green">已完成</Tag>
              ) : (
                <Tag color={pri?.color}>{pri?.label}</Tag>
              )}
              {hasChildren && (
                <Badge
                  count={`${task.children!.filter((c) => c.is_completed).length}/${task.children!.length}`}
                  style={{ backgroundColor: isCollapsed ? '#aaa' : '#722ed1', fontSize: 11 }}
                />
              )}
            </Space>
          }
          description={
            <div>
              {task.description && (
                <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
                  {task.description}
                </Paragraph>
              )}
              {task.progress > 0 && !task.is_completed && (
                <div style={{ marginTop: 8 }}>
                  <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      进度:
                    </Text>
                    <Progress
                      percent={task.progress}
                      size="small"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                      style={{ width: 120 }}
                    />
                  </Space>
                </div>
              )}
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建任务
        </Button>
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: 120 }}
          options={[
            { value: null, label: '全部' },
            { value: STATUS_IN_PROGRESS, label: '进行中' },
            { value: STATUS_COMPLETED, label: '已完成' },
          ]}
        />
      </Space>

      <Spin spinning={loading}>
        {tasks.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={tasks}
            renderItem={(task) => (
              <React.Fragment key={task.id}>
                {renderTask(task)}
                {expandedTaskId === task.id &&
                  task.children?.map((child) => renderTask(child, true))}
              </React.Fragment>
            )}
          />
        ) : (
          <Empty
            description={
              status === STATUS_COMPLETED
                ? '暂无已完成任务'
                : status === STATUS_IN_PROGRESS
                  ? '暂无进行中任务'
                  : '暂无任务，点击"新建任务"开始'
            }
          />
        )}
      </Spin>

      <Modal
        title={editingTask ? '编辑任务' : parentTaskId ? '添加子任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setParentTaskId(null);
        }}
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
          <Form.Item name="progress" label="任务进度">
            <Slider
              min={0}
              max={100}
              marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Tasks;
