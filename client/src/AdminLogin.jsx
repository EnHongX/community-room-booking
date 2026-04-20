import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Result
} from 'antd';
import {
  LockOutlined,
  MailOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

function AdminLogin() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    const { email, password } = values;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/admin/login', {
        email,
        password
      });

      if (response.data.success) {
        const { user, sessionId } = response.data.data;
        localStorage.setItem('admin', JSON.stringify(user));
        localStorage.setItem('adminSessionId', sessionId);
        setAdminEmail(email);
        setLoginSuccess(true);
        message.success(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || '登录失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
      console.error('管理员登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToAdminDashboard = () => {
    navigate('/admin/dashboard');
  };

  if (loginSuccess) {
    return (
      <div className="admin-login-full-page">
        <div className="admin-login-content-wrapper">
          <Card className="admin-success-card-full" bordered={false}>
            <Result
              status="success"
              title="管理员登录成功！"
              subTitle={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text>欢迎回来，<Text strong>{adminEmail}</Text></Text>
                  <Text type="secondary">您现在可以进入管理后台</Text>
                </Space>
              }
              extra={[
                <Button type="primary" size="large" onClick={handleGoToAdminDashboard} key="dashboard">
                  <HomeOutlined style={{ marginRight: '8px' }} />
                  进入管理后台
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-full-page">
      <div className="admin-login-content-wrapper">
        <Card className="admin-login-card-full" bordered={false}>
          <div className="admin-login-title-section">
            <Title level={2} className="admin-login-title">
              <SafetyOutlined style={{ marginRight: '12px', color: '#fa8c16' }} />
              管理员登录
            </Title>
            <Text type="secondary" className="admin-login-subtitle">
              请使用管理员账号登录管理后台
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            className="admin-login-form"
          >
            <Form.Item
              name="email"
              label="管理员邮箱"
              rules={[
                { required: true, message: '请输入管理员邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              validateTrigger="onBlur"
            >
              <Input 
                placeholder="请输入管理员邮箱" 
                prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="管理员密码"
              rules={[
                { required: true, message: '请输入管理员密码' }
              ]}
            >
              <Input.Password 
                placeholder="请输入管理员密码" 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  block
                  className="admin-login-button-full"
                >
                  登录
                </Button>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handleGoToLogin}
                  block
                  className="admin-back-login-button"
                >
                  返回用户登录
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default AdminLogin;
