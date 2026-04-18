import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Avatar,
  Divider,
  Tabs,
  Spin,
  Dropdown
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  SaveOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

const { Title, Text } = Typography;

const generateDefaultAvatar = (email) => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867'
  ];
  const index = email ? email.charCodeAt(0) % colors.length : 0;
  const bgColor = colors[index];
  const initial = email ? email.charAt(0).toUpperCase() : 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${bgColor.slice(1)}&color=fff&size=128&bold=true`;
};

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    message.success('已退出登录');
    navigate('/home');
  };

  const fetchUserInfo = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      const response = await axios.get(`/api/users/${userId || userData.id}`);
      if (response.data.success) {
        setUser(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      } else {
        setUser(userData);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      const userData = JSON.parse(storedUser);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleAvatarSubmit = async (values) => {
    if (!user) return;
    
    setAvatarLoading(true);
    try {
      const response = await axios.put(`/api/users/${user.id}/avatar`, {
        avatar: values.avatar
      });

      if (response.data.success) {
        setUser(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        message.success('头像更新成功！');
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || '更新头像失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
      console.error('更新头像失败:', error);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    if (!user) return;
    
    setPasswordLoading(true);
    try {
      const response = await axios.put(`/api/users/${user.id}/password`, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });

      if (response.data.success) {
        message.success('密码修改成功！');
        passwordForm.resetFields();
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || '修改密码失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
      console.error('修改密码失败:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'avatar',
      label: (
        <Space>
          <UserOutlined />
          <span>修改头像</span>
        </Space>
      ),
      children: (
        <Form
          form={avatarForm}
          layout="vertical"
          onFinish={handleAvatarSubmit}
          size="large"
          className="avatar-form"
          initialValues={{ avatar: user?.avatar || '' }}
        >
          <div className="avatar-preview-section">
            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
              当前头像预览：
            </Text>
            <Avatar 
              size={120} 
              src={user?.avatar || generateDefaultAvatar(user?.email)}
              icon={<UserOutlined />}
              className="profile-avatar"
            />
            {!user?.avatar && (
              <Text type="secondary" style={{ marginTop: '12px', display: 'block' }}>
                （使用默认头像，可输入图片URL自定义）
              </Text>
            )}
          </div>

          <Form.Item
            name="avatar"
            label="头像图片URL"
            help="请输入有效的图片URL地址（如：https://example.com/avatar.jpg）"
          >
            <Input 
              placeholder="请输入头像图片URL（留空使用默认头像）" 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={avatarLoading}
                icon={<SaveOutlined />}
                size="large"
              >
                保存头像
              </Button>
              <Button 
                onClick={() => avatarForm.resetFields()}
                size="large"
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'password',
      label: (
        <Space>
          <LockOutlined />
          <span>修改密码</span>
        </Space>
      ),
      children: (
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          size="large"
          className="password-form"
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[
              { required: true, message: '请输入当前密码' }
            ]}
          >
            <Input.Password 
              placeholder="请输入当前密码" 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' }
            ]}
            validateTrigger="onBlur"
          >
            <Input.Password 
              placeholder="请输入新密码（至少6位）" 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
            validateTrigger="onBlur"
          >
            <Input.Password 
              placeholder="请再次输入新密码" 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={passwordLoading}
                icon={<SaveOutlined />}
                size="large"
              >
                修改密码
              </Button>
              <Button 
                onClick={() => passwordForm.resetFields()}
                size="large"
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )
    }
  ];

  if (loading) {
    return (
      <div className="profile-full-page">
        <div className="loading-container">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-full-page">
      <div className="top-nav-bar">
        <div className="nav-content">
          <div className="nav-brand">
            <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit', textDecoration: 'none' }}>
              <HomeOutlined className="nav-icon" />
              <span className="nav-title">社区活动室预约系统</span>
            </Link>
          </div>
          <div className="nav-actions">
            {!user ? (
              <>
                <Link to="/login">
                  <Button 
                    type="default" 
                    size="large"
                    icon={<UserOutlined />}
                    className="nav-login-button"
                  >
                    登录
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<UserOutlined />}
                    className="nav-register-button"
                  >
                    注册
                  </Button>
                </Link>
              </>
            ) : (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      icon: <SettingOutlined />,
                      label: (
                        <Link to={`/profile/${user.id}`}>
                          个人资料
                        </Link>
                      )
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
                }}
                placement="bottomRight"
                trigger={['hover']}
              >
                <div className="user-dropdown-trigger">
                  <Avatar 
                    size={40} 
                    src={user.avatar || generateDefaultAvatar(user.email)}
                    icon={<UserOutlined />}
                    className="user-avatar"
                  />
                  <span className="user-email">{user.email}</span>
                </div>
              </Dropdown>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content-wrapper">
        <div className="profile-container">
          <Card className="profile-card" bordered={false}>
            <div className="profile-header">
              <Space>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate('/home')}
                  className="back-button"
                >
                  返回首页
                </Button>
              </Space>
              <div className="profile-info">
                <Avatar 
                  size={80} 
                  src={user?.avatar || generateDefaultAvatar(user?.email)}
                  icon={<UserOutlined />}
                  className="profile-header-avatar"
                />
                <div className="profile-header-text">
                  <Title level={3} style={{ margin: 0 }}>个人资料</Title>
                  <Text type="secondary" style={{ marginTop: '4px', display: 'block' }}>
                    {user?.email}
                  </Text>
                </div>
              </div>
            </div>

            <Divider />

            <Tabs 
              defaultActiveKey="avatar" 
              items={tabItems}
              size="large"
              className="profile-tabs"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Profile;