import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Button,
  Spin,
  message,
  Space,
  Tag,
  Typography,
  Divider,
  Alert,
  Dropdown,
  Avatar
} from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  UserAddOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import Register from './Register';
import Login from './Login';
import Profile from './Profile';
import MyBookings from './MyBookings';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminConsole from './AdminConsole';
import AdminRooms from './AdminRooms';
import AdminBookings from './AdminBookings';

const { Title, Text } = Typography;

axios.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers.Authorization = `Bearer ${sessionId}`;
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
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
      }
    }
    return Promise.reject(error);
  }
);

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

function HomePage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [dateBookings, setDateBookings] = useState([]);
  const [user, setUser] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchUserInfo = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const response = await axios.get(`/api/users/${userData.id}`);
        if (response.data.success) {
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
        } else {
          setUser(userData);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchUserInfo();
  }, [fetchUserInfo]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error) {
      message.error('获取活动室列表失败');
      console.error('获取活动室列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateBookings = async (roomId, date) => {
    try {
      const response = await axios.get('/api/bookings', {
        params: {
          room_id: roomId,
          date: date
        }
      });
      if (response.data.success) {
        setDateBookings(response.data.data);
      }
    } catch (error) {
      console.error('获取当日预约失败:', error);
    }
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setBookingModalVisible(true);
    form.resetFields();
    setDateBookings([]);
  };

  const handleDateChange = async (date) => {
    if (date && selectedRoom) {
      const formattedDate = date.format('YYYY-MM-DD');
      await fetchDateBookings(selectedRoom.id, formattedDate);
    } else {
      setDateBookings([]);
    }
  };

  const checkTimeConflict = async (values) => {
    if (!values.date || !values.start_time || !values.end_time) {
      return { hasConflict: false };
    }

    setCheckingConflict(true);
    try {
      const response = await axios.get('/api/bookings/check-conflict', {
        params: {
          room_id: selectedRoom.id,
          date: values.date.format('YYYY-MM-DD'),
          start_time: values.start_time.format('HH:mm'),
          end_time: values.end_time.format('HH:mm')
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('检查时间冲突失败:', error);
      return { hasConflict: false };
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmitBooking = async (values) => {
    const conflictResult = await checkTimeConflict(values);
    
    if (conflictResult.hasConflict) {
      message.error('时间冲突，该时段已被预约，请选择其他时间');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/bookings', {
        room_id: selectedRoom.id,
        user_name: values.user_name,
        user_phone: values.user_phone,
        date: values.date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm'),
        purpose: values.purpose
      });

      if (response.data.success) {
        message.success('预约成功！');
        setBookingModalVisible(false);
        form.resetFields();
        setDateBookings([]);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        const code = error.response.data?.code;
        if (code === 'UNAUTHORIZED') {
          message.error('请先登录后再预约');
        } else if (code === 'SESSION_EXPIRED') {
          message.error('登录已过期，请重新登录');
        }
        setBookingModalVisible(false);
        navigate('/login');
      } else if (error.response?.status === 409) {
        message.error('时间冲突，该时段已被预约，请选择其他时间');
      } else {
        message.error(error.response?.data?.message || '预约失败，请稍后重试');
      }
      console.error('预约失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/users/logout');
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      setUser(null);
      message.success('已退出登录');
      navigate('/home');
    }
  };

  const getRoomIcon = (name) => {
    if (!name) return '🏠';
    if (name.includes('多功能')) return '🏛️';
    if (name.includes('图书')) return '📚';
    if (name.includes('健身')) return '💪';
    if (name.includes('棋牌')) return '🎲';
    if (name.includes('舞蹈')) return '💃';
    return '🏠';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="top-nav-bar">
        <div className="nav-content">
          <div className="nav-brand">
            <HomeOutlined className="nav-icon" />
            <span className="nav-title">社区活动室预约系统</span>
          </div>
          <div className="nav-actions">
            {!user ? (
              <>
                <Link to="/login">
                  <Button 
                    type="default" 
                    size="large"
                    icon={<LoginOutlined />}
                    className="nav-login-button"
                  >
                    登录
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<UserAddOutlined />}
                    className="nav-register-button"
                  >
                    注册
                  </Button>
                </Link>
              </>
            ) : (
              <Space size="middle">
                <Link to="/my-bookings">
                  <Button 
                    type="default" 
                    size="large"
                    icon={<CalendarOutlined />}
                    className="nav-bookings-button"
                  >
                    我的预约
                  </Button>
                </Link>
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
              </Space>
            )}
          </div>
        </div>
      </div>
      
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <Title level={1}>欢迎使用社区活动室预约系统</Title>
            <p>便捷预约，高效管理，让社区资源服务更多人</p>
          </div>
        </div>
      </div>

      <div className="content-area">
        <Row gutter={[16, 16]}>
          {rooms.map((room) => (
            <Col xs={24} sm={12} lg={8} key={room.id}>
              <Card
                className="room-card"
                hoverable
                onClick={() => handleRoomClick(room)}
                styles={{ body: { padding: '20px' } }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '48px' }}>{getRoomIcon(room.name)}</span>
                </div>
                <Title level={4} style={{ marginBottom: '8px' }}>{room.name}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                  {room.description}
                </Text>
                <Space>
                  <Tag icon={<TeamOutlined />} color="blue">
                    容纳 {room.capacity} 人
                  </Tag>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Modal
        title={
          <Space>
            <span style={{ fontSize: '24px' }}>{getRoomIcon(selectedRoom?.name)}</span>
            <span>{selectedRoom?.name} - 预约</span>
          </Space>
        }
        open={bookingModalVisible}
        onCancel={() => {
          setBookingModalVisible(false);
          form.resetFields();
          setDateBookings([]);
        }}
        footer={null}
        width={600}
        className="booking-modal"
      >
        {selectedRoom && (
          <>
            <Alert
              message={
                <Space>
                  <InfoCircleOutlined />
                  <span>活动室信息</span>
                </Space>
              }
              description={
                <div>
                  <p><strong>名称：</strong>{selectedRoom.name}</p>
                  <p><strong>描述：</strong>{selectedRoom.description}</p>
                  <p><strong>容纳人数：</strong>{selectedRoom.capacity} 人</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: '20px' }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitBooking}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="date"
                    label={
                      <Space>
                        <CalendarOutlined />
                        <span>选择日期</span>
                      </Space>
                    }
                    rules={[{ required: true, message: '请选择日期' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      disabledDate={disabledDate}
                      onChange={handleDateChange}
                      placeholder="请选择预约日期"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {dateBookings.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                    <ClockCircleOutlined /> 当日已预约时段：
                  </Text>
                  {dateBookings.map((booking, index) => (
                    <div key={index} className="time-slot booked">
                      <span>
                        {booking.start_time} - {booking.end_time}
                      </span>
                      <Tag color="red" style={{ marginLeft: '8px' }}>
                        已预约
                      </Tag>
                    </div>
                  ))}
                </div>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="start_time"
                    label={
                      <Space>
                        <ClockCircleOutlined />
                        <span>开始时间</span>
                      </Space>
                    }
                    rules={[{ required: true, message: '请选择开始时间' }]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      format="HH:mm"
                      minuteStep={30}
                      placeholder="请选择开始时间"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="end_time"
                    label={
                      <Space>
                        <ClockCircleOutlined />
                        <span>结束时间</span>
                      </Space>
                    }
                    rules={[{ required: true, message: '请选择结束时间' }]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      format="HH:mm"
                      minuteStep={30}
                      placeholder="请选择结束时间"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="user_name"
                    label={
                      <Space>
                        <UserOutlined />
                        <span>预约人姓名</span>
                      </Space>
                    }
                    rules={[{ required: true, message: '请输入预约人姓名' }]}
                  >
                    <Input placeholder="请输入姓名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="user_phone"
                    label={
                      <Space>
                        <PhoneOutlined />
                        <span>联系电话</span>
                      </Space>
                    }
                    rules={[
                      { required: true, message: '请输入联系电话' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                    ]}
                  >
                    <Input placeholder="请输入手机号码" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="purpose"
                label={
                  <Space>
                    <InfoCircleOutlined />
                    <span>使用用途</span>
                  </Space>
                }
              >
                <Input.TextArea
                  rows={3}
                  placeholder="请简要说明使用用途（选填）"
                  maxLength={200}
                  showCount
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => {
                      setBookingModalVisible(false);
                      form.resetFields();
                      setDateBookings([]);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting || checkingConflict}
                  >
                    确认预约
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />}>
        <Route path="dashboard" element={<AdminConsole />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route index element={<AdminConsole />} />
      </Route>
    </Routes>
  );
}

export default App;
