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
  UserOutlined,
  LockOutlined,
  MailOutlined,
  UserAddOutlined,
  HomeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    const { email, password } = values;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/users/login', {
        email,
        password
      });

      if (response.data.success) {
        setUserEmail(email);
        setLoginSuccess(true);
        message.success(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || '登录失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    navigate('/register');
  };

  const handleGoToHome = () => {
    navigate('/home');
  };

  if (loginSuccess) {
    return (
      <div className="login-full-page">
        <div className="login-content-wrapper">
          <Card className="success-card-full" bordered={false}>
            <Result
              status="success"
              title="登录成功！"
              subTitle={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text>欢迎回来，<Text strong>{userEmail}</Text></Text>
                  <Text type="secondary">您现在可以开始使用社区活动室预约系统了</Text>
                </Space>
              }
              extra={[
                <Button type="primary" size="large" onClick={handleGoToHome} key="home">
                  <HomeOutlined style={{ marginRight: '8px' }} />
                  进入系统
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="login-full-page">
      <div className="login-content-wrapper">
        <Card className="login-card-full" bordered={false}>
          <div className="login-title-section">
            <Title level={2} className="login-title">
              <UserOutlined style={{ marginRight: '12px' }} />
              用户登录
            </Title>
            <Text type="secondary" className="login-subtitle">
              登录账户，使用社区活动室预约系统
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            className="login-form"
          >
            <Form.Item
              name="email"
              label="邮箱地址"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              validateTrigger="onBlur"
            >
              <Input 
                placeholder="请输入您的邮箱地址" 
                prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' }
              ]}
            >
              <Input.Password 
                placeholder="请输入密码" 
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
                  className="login-button-full"
                >
                  登录
                </Button>
                <Button 
                  icon={<UserAddOutlined />} 
                  onClick={handleGoToRegister}
                  block
                  className="register-nav-button"
                >
                  没有账户？立即注册
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default Login;
