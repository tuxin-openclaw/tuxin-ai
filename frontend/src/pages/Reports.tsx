/**
 * 周报月报页面
 */
import React, { useState } from 'react';
import { Card, Button, Radio, Typography, Spin, Empty, Space } from 'antd';
import { FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { reportApi } from '../services/api';
import type { Report } from '../constants';

const { Title, Text } = Typography;

type ReportType = 'weekly' | 'monthly' | 'yearly';

function Reports() {
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await reportApi.generate(reportType);
      setReport(res.data);
    } catch (err) {
      console.error('生成报告失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<ReportType, string> = {
    weekly: '周报',
    monthly: '月报',
    yearly: '年度总结',
  };

  const renderBold = (text: string): React.ReactNode => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <Text strong key={i}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              选择报告类型
            </Text>
            <Radio.Group
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="weekly">📅 周报</Radio.Button>
              <Radio.Button value="monthly">📆 月报</Radio.Button>
              <Radio.Button value="yearly">📊 年度总结</Radio.Button>
            </Radio.Group>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={generateReport}
            loading={loading}
            style={{ marginTop: 20 }}
          >
            AI 生成{typeLabels[reportType]}
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {report ? (
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>{typeLabels[report.report_type as ReportType]}</span>
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                  {report.period}
                </Text>
              </Space>
            }
          >
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              {report.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <Title level={4} key={i} style={{ marginTop: 16 }}>
                      {line.slice(3)}
                    </Title>
                  );
                }
                if (line.startsWith('- **')) {
                  const parts = line.slice(2);
                  return (
                    <div key={i} style={{ paddingLeft: 16, margin: '4px 0' }}>
                      • {renderBold(parts)}
                    </div>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <div key={i} style={{ paddingLeft: 16, margin: '4px 0' }}>
                      • {line.slice(2)}
                    </div>
                  );
                }
                if (['📊', '📅', '🎯', '💡', '🏷️'].some((icon) => line.startsWith(icon))) {
                  return (
                    <div key={i} style={{ margin: '8px 0', fontWeight: 500 }}>
                      {renderBold(line)}
                    </div>
                  );
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <div key={i}>{renderBold(line)}</div>;
              })}
            </div>
          </Card>
        ) : (
          <Card>
            <Empty
              description={
                <span>
                  选择报告类型，点击 <Text strong>AI 生成</Text> 按钮
                  <br />
                  系统将基于你的工作记录自动生成报告
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}

export default Reports;
