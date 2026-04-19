import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Avatar,
  Dropdown,
  Space,
  message,
  Statistic
} from 'antd';
import {
  SafetyOutlined,
  HomeOutlined,
  CalendarOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

axios.interceptors.request.use(
  (config) => {
    const adminSessionId = localStorage.getItem('adminSessionId');
    if (adminSessionId) {
      config.headers.Authorization = `Bearer ${adminSessionId}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      if (code === 'UNAUTHORIZED' || code === 'SESSION_EXPIRED') {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
      }
    }
    return Promise.reject(error);
  }
);

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const checkAdminAuth = useCallback(async () => {
    const storedAdmin = localStorage.getItem('admin');
    const adminSessionId = localStorage.getItem('adminSessionId');
    
    if (!storedAdmin || !adminSessionId) {
      navigate('/admin/login');
      return;
    }

    try {
      const adminData = JSON.parse(storedAdmin);
      setAdmin(adminData);
    } catch (error) {
      console.error('解析管理员信息失败:', error);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/admin/logout');
    } catch (error) {
      console.error('管理员退出登录失败:', error);
    } finally {
      localStorage.removeItem('admin');
      localStorage.removeItem('adminSessionId');
      setAdmin(null);
      message.success('已退出登录');
      navigate('/admin/login');
    }
  };

  const handleGoToHome = () => {
    navigate('/home');
  };

  const userMenu = {
    items: [
      {
        key: 'home',
        icon: <HomeOutlined />,
        label: '返回前台',
        onClick: handleGoToHome
      },
      {
        type: 'divider'
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout
      }
    ]
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: '控制台'
    },
    {
      key: 'bookings',
      icon: <CalendarOutlined />,
      label: '预约管理'
    },
    {
      key: 'rooms',
      icon: <HomeOutlined />,
      label: '活动室管理'
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: '用户管理'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置'
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <SafetyOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
          {!collapsed && (
            <Text style={{ color: 'white', marginLeft: '12px', fontSize: '16px', fontWeight: '600' }}>
              管理后台
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Title level={4} style={{ margin: 0, color: '#333' }}>
              控制台
            </Title>
          </div>
          <Dropdown
            menu={userMenu}
            placement="bottomRight"
            trigger={['hover']}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              <Avatar 
                size={36} 
                icon={<UserOutlined />}
                style={{ backgroundColor: '#fa8c16' }}
              />
              <Text style={{ color: '#333', fontWeight: '500' }}>
                {admin?.email || '管理员'}
              </Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', background: '#f0f2f5' }}>
          <div style={{ padding: '24px', minHeight: '360px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总预约数"
                    value={0}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#667eea' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="活动室数量"
                    value={0}
                    prefix={<HomeOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="注册用户"
                    value={0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="今日预约"
                    value={0}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card style={{ marginTop: '24px' }}>
              <Title level={4} style={{ marginBottom: '16px' }}>
                欢迎使用管理后台
              </Title>
              <Text type="secondary">
                这是社区活动室预约系统的管理后台。您可以在这里管理活动室、预约和用户。
              </Text>
              <div style={{ marginTop: '24px' }}>
                <Space>
                  <Button type="primary" icon={<CalendarOutlined />}>
                    查看所有预约
                  </Button>
                  <Button icon={<HomeOutlined />}>
                    管理活动室
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminDashboard;
