import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Statistic,
  Select,
  Spin,
  message,
  Tabs
} from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  TeamOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;

function AdminConsole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_rooms: 0,
    total_users: 0,
    today_bookings: 0
  });
  const [period, setPeriod] = useState('week');
  const [trendData, setTrendData] = useState({
    bookings_trend: [],
    users_trend: []
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取统计数据失败');
        console.error('获取统计数据失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchTrend = useCallback(async (selectedPeriod) => {
    setTrendLoading(true);
    try {
      const response = await axios.get('/api/admin/stats/trend', {
        params: { period: selectedPeriod }
      });
      if (response.data.success) {
        setTrendData({
          bookings_trend: response.data.data.bookings_trend,
          users_trend: response.data.data.users_trend
        });
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取趋势数据失败');
        console.error('获取趋势数据失败:', error);
      }
    } finally {
      setTrendLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStats();
    fetchTrend('week');
  }, [fetchStats, fetchTrend]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    fetchTrend(value);
  };

  const formatXAxisLabel = (date) => {
    if (period === 'week') {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${month}/${day}`;
    } else if (period === 'month') {
      const [year, month] = date.split('-');
      return `${year.slice(2)}/${month}`;
    } else if (period === 'year') {
      return date.slice(2);
    }
    return date;
  };

  const getTooltipLabel = (date) => {
    if (period === 'week') {
      return date;
    } else if (period === 'month') {
      const [year, month] = date.split('-');
      return `${year}年${month}月`;
    } else if (period === 'year') {
      return `${date}年`;
    }
    return date;
  };

  const combinedTrendData = trendData.bookings_trend.map((item, index) => ({
    date: item.date,
    bookings: item.bookings,
    users: trendData.users_trend[index]?.users || 0
  }));

  const tabItems = [
    {
      key: 'bookings',
      label: (
        <Space>
          <CalendarOutlined />
          <span>预约趋势</span>
        </Space>
      ),
      children: (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={combinedTrendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxisLabel}
              />
              <YAxis />
              <Tooltip
                labelFormatter={getTooltipLabel}
                formatter={(value, name) => [
                  value,
                  name === 'bookings' ? '预约数' : '新注册用户'
                ]}
              />
              <Legend
                formatter={(value) => value === 'bookings' ? '预约数' : '新注册用户'}
              />
              <Bar
                dataKey="bookings"
                fill="#667eea"
                name="bookings"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    {
      key: 'users',
      label: (
        <Space>
          <TeamOutlined />
          <span>用户增长</span>
        </Space>
      ),
      children: (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={combinedTrendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxisLabel}
              />
              <YAxis />
              <Tooltip
                labelFormatter={getTooltipLabel}
                formatter={(value, name) => [
                  value,
                  name === 'users' ? '新注册用户' : '预约数'
                ]}
              />
              <Legend
                formatter={(value) => value === 'users' ? '新注册用户' : '预约数'}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#52c41a"
                strokeWidth={2}
                dot={{ fill: '#52c41a', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', minHeight: '360px' }}>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总预约数"
                value={stats.total_bookings}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#667eea' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="活动室数量"
                value={stats.total_rooms}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="注册用户"
                value={stats.total_users}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="今日预约"
                value={stats.today_bookings}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Card
        style={{ marginTop: '24px' }}
        title={
          <Space>
            <LineChartOutlined style={{ color: '#667eea' }} />
            <span>趋势分析</span>
          </Space>
        }
        extra={
          <Select
            value={period}
            onChange={handlePeriodChange}
            style={{ width: 120 }}
          >
            <Option value="week">近7天</Option>
            <Option value="month">近12月</Option>
            <Option value="year">近5年</Option>
          </Select>
        }
      >
        <Spin spinning={trendLoading}>
          <Tabs defaultActiveKey="bookings" items={tabItems} />
        </Spin>
      </Card>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4} style={{ marginBottom: '16px' }}>
          欢迎使用管理后台
        </Title>
        <Text type="secondary">
          这是社区活动室预约系统的管理后台。您可以在这里管理活动室、预约和用户。
        </Text>
        <div style={{ marginTop: '24px' }}>
          <Space>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => navigate('/admin/bookings')}
            >
              查看所有预约
            </Button>
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate('/admin/rooms')}
            >
              管理活动室
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default AdminConsole;
