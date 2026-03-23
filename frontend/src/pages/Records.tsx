/**
 * 工作记录页面
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Button,
  Input,
  Space,
  Modal,
  Form,
  DatePicker,
  Typography,
  Tag,
  Popconfirm,
  message,
  Spin,
  Empty,
  Tooltip,
  TreeSelect,
  Slider,
} from 'antd';
import {
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { recordApi, taskApi } from '../services/api';
import type { WorkRecord as Record, Task } from '../constants';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface FormValues {
  content: string;
  record_date: Dayjs;
  task_id?: number;
  task_progress?: number;
}

interface TreeTask extends Task {
  selectable?: boolean;
  children?: TreeTask[];
}

function Records() {
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [summarizing, setSummarizing] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: { [key: string]: unknown } = { page, page_size: 10 };
      if (dateRange && dateRange[0]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange && dateRange[1]) {
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await recordApi.list(params);
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch {
      message.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, dateRange]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await taskApi.list({ parent_only: false });
      setTasks(res.data.tasks);
    } catch (err) {
      console.error('加载任务列表失败', err);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadTasks();
  }, [loadRecords, loadTasks]);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ record_date: dayjs() });
    setModalVisible(true);
  };

  const handleEdit = (record: Record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      content: record.content,
      record_date: dayjs(record.record_date),
      task_id: record.task_id,
      task_progress: record.task_progress,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const values = await form.validateFields();
      const data = {
        content: values.content,
        record_date: values.record_date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        task_id: values.task_id,
        task_progress: values.task_progress,
      };
      if (editingRecord) {
        await recordApi.update(editingRecord.id, data);
        message.success('记录已更新');
      } else {
        await recordApi.create(data);
        message.success('记录已保存，AI已自动生成总结');
      }
      setModalVisible(false);
      loadRecords();
    } catch (err) {
      if ((err as { errorFields?: unknown[] }).errorFields) return;
      message.error('操作失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await recordApi.delete(id);
      message.success('记录已删除');
      loadRecords();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSummarize = async (id: number) => {
    setSummarizing(id);
    try {
      await recordApi.summarize(id);
      message.success('AI总结已重新生成');
      loadRecords();
    } catch {
      message.error('生成总结失败');
    } finally {
      setSummarizing(null);
    }
  };

  const formatTaskTree = (taskList: Task[], parentId: number | null = null): TreeTask[] => {
    return taskList
      .filter((task) => task.parent_id === parentId)
      .map((task) => {
        const children = formatTaskTree(taskList, task.id);
        return {
          ...task,
          selectable: children.length === 0,
          children: children.length > 0 ? children : undefined,
        };
      });
  };

  const taskTreeData = formatTaskTree(tasks);

  const fieldNames = {
    value: 'id',
    label: 'title',
    children: 'children',
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          记录工作
        </Button>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates as [Dayjs, Dayjs] | null);
            setPage(1);
          }}
          placeholder={['开始日期', '结束日期']}
        />
      </Space>

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
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    key="edit"
                  >
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定删除？"
                    onConfirm={() => handleDelete(record.id)}
                    key="del"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
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
                <div style={{ marginBottom: 12 }}>
                  <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {record.content}
                  </Paragraph>
                </div>
                {record.summary && (
                  <Card
                    size="small"
                    style={{ background: '#f6f8fa', borderColor: '#e8e8e8' }}
                    title={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        🤖 AI 总结
                      </Text>
                    }
                  >
                    <Paragraph
                      style={{
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        fontSize: 13,
                      }}
                    >
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

      <Modal
        title={editingRecord ? '编辑工作记录' : '记录今日工作'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
        confirmLoading={submitLoading}
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
              onChange={(taskId) => {
                if (taskId) {
                  const selectedTask = tasks.find((t) => t.id === taskId);
                  if (selectedTask && selectedTask.progress !== undefined) {
                    form.setFieldsValue({
                      task_progress: selectedTask.progress,
                    });
                  }
                }
              }}
            />
          </Form.Item>
          <Form.Item name="task_progress" label="任务进度">
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

export default Records;
