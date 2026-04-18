import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Row,
  Col,
  Result
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

function Register() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    const { email, password } = values;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/users/register', {
        email,
        password
      });

      if (response.data.success) {
        setRegisteredEmail(email);
        setRegisterSuccess(true);
        message.success(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || '注册失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
      console.error('注册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (registerSuccess) {
    return (
      <div className="register-container">
        <div className="register-header">
          <Title level={2}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '12px' }} />
            注册成功
          </Title>
        </div>
        <Card className="success-card">
          <Result
            status="success"
            title="恭喜您，注册成功！"
            subTitle={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text>您的账户邮箱：<Text strong>{registeredEmail}</Text></Text>
                <Text type="secondary">您现在可以开始使用社区活动室预约系统了</Text>
              </Space>
            }
            extra={[
              <Button type="primary" size="large" onClick={handleBackToHome} key="home">
                返回首页
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-header">
        <Title level={2}>
          <UserOutlined style={{ marginRight: '12px' }} />
          用户注册
        </Title>
        <p>创建账户，开始使用社区活动室预约系统</p>
      </div>

      <Row justify="center">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card className="register-card" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
            >
              <Form.Item
                name="email"
                label={
                  <Space>
                    <MailOutlined />
                    <span>邮箱地址</span>
                  </Space>
                }
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
                label={
                  <Space>
                    <LockOutlined />
                    <span>设置密码</span>
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少为6位' }
                ]}
                validateTrigger="onBlur"
              >
                <Input.Password 
                  placeholder="请设置密码（至少6位）" 
                  prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={
                  <Space>
                    <LockOutlined />
                    <span>确认密码</span>
                  </Space>
                }
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
                validateTrigger="onBlur"
              >
                <Input.Password 
                  placeholder="请再次输入密码" 
                  prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="large"
                    block
                    className="register-button"
                  >
                    立即注册
                  </Button>
                  <Button 
                    icon={<ArrowLeftOutlined />} 
                    onClick={handleBackToHome}
                    block
                  >
                    返回首页
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Register;
