import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  message,
  Typography,
  Space,
  Avatar,
  Dropdown,
  Spin,
  Modal,
  Descriptions,
  Divider,
  Empty,
  Tabs,
  Popconfirm
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';

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

const getStatusTag = (status) => {
  const statusMap = {
    pending: { color: 'orange', text: '待处理', icon: <ClockCircleOutlined /> },
    approved: { color: 'green', text: '已通过', icon: <CheckCircleOutlined /> },
    rejected: { color: 'red', text: '已驳回', icon: <CloseCircleOutlined /> },
    active: { color: 'blue', text: '进行中', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'default', text: '已取消', icon: <CloseCircleOutlined /> }
  };
  const info = statusMap[status] || { color: 'default', text: status, icon: <InfoCircleOutlined /> };
  return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
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

function MyBookings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
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
      const response = await axios.get(`/api/users/${userData.id}`);
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
    }
  }, [navigate]);

  const fetchBookings = useCallback(async () => {
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      
      const response = await axios.get('/api/bookings/my', { params });
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.warning('请先登录');
        navigate('/login');
      } else {
        message.error('获取预约列表失败');
        console.error('获取预约列表失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, activeTab]);

  useEffect(() => {
    fetchUserInfo();
    fetchBookings();
  }, [fetchUserInfo, fetchBookings]);

  const handleViewDetail = async (booking) => {
    try {
      const response = await axios.get(`/api/bookings/${booking.id}`);
      if (response.data.success) {
        setSelectedBooking(response.data.data);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取预约详情失败');
      console.error('获取预约详情失败:', error);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setCancelling(true);
    try {
      const response = await axios.put(`/api/bookings/${selectedBooking.id}/cancel`);
      if (response.data.success) {
        message.success('预约已取消');
        setDetailModalVisible(false);
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('取消预约失败');
      }
      console.error('取消预约失败:', error);
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
  };

  const tabItems = [
    {
      key: 'all',
      label: '全部预约',
    },
    {
      key: 'pending',
      label: '待处理',
    },
    {
      key: 'approved',
      label: '已通过',
    },
    {
      key: 'rejected',
      label: '已驳回',
    },
    {
      key: 'active',
      label: '进行中',
    },
    {
      key: 'cancelled',
      label: '已取消',
    },
  ];

  if (loading) {
    return (
      <div className="my-bookings-full-page">
        <div className="loading-container">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings-full-page">
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

      <div className="my-bookings-content-wrapper">
        <div className="my-bookings-container">
          <Card className="my-bookings-card" bordered={false}>
            <div className="my-bookings-header">
              <Title level={3} style={{ margin: 0 }}>
                <CalendarOutlined style={{ marginRight: '12px' }} />
                我的预约
              </Title>
            </div>

            <Divider />

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size="large"
            />

            <div className="bookings-list">
              {bookings.length === 0 ? (
                <Empty 
                  description={
                    activeTab === 'all' 
                      ? '暂无预约记录' 
                      : activeTab === 'pending' 
                        ? '暂无待处理的预约' 
                        : activeTab === 'approved' 
                          ? '暂无已通过的预约' 
                          : activeTab === 'rejected' 
                            ? '暂无已驳回的预约' 
                            : activeTab === 'active' 
                              ? '暂无进行中的预约' 
                              : '暂无已取消的预约'
                  }
                  style={{ marginTop: '60px' }}
                />
              ) : (
                <List
                  dataSource={bookings}
                  renderItem={(booking) => (
                    <List.Item
                      className="booking-list-item"
                      actions={[
                        <Button 
                          type="link" 
                          icon={<EyeOutlined />}
                          onClick={() => handleViewDetail(booking)}
                        >
                          查看详情
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div className="booking-room-icon">
                            <span style={{ fontSize: '32px' }}>{getRoomIcon(booking.room_name)}</span>
                          </div>
                        }
                        title={
                          <Space>
                            <Text strong style={{ fontSize: '16px' }}>{booking.room_name}</Text>
                            {getStatusTag(booking.status)}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small" style={{ marginTop: '8px' }}>
                            <Space>
                              <CalendarOutlined />
                              <Text>预约日期：{booking.date}</Text>
                            </Space>
                            <Space>
                              <ClockCircleOutlined />
                              <Text>预约时间：{booking.start_time} - {booking.end_time}</Text>
                            </Space>
                            <Space>
                              <InfoCircleOutlined />
                              <Text type="secondary">创建时间：{formatDateTime(booking.created_at)}</Text>
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        title={
          <Space>
            <span style={{ fontSize: '24px' }}>{getRoomIcon(selectedBooking?.room_name)}</span>
            <span>预约详情</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedBooking(null);
        }}
        footer={null}
        width={600}
        className="booking-detail-modal"
      >
        {selectedBooking && (
          <>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="活动室名称">
                <Text strong>{selectedBooking.room_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="预约状态">
                {getStatusTag(selectedBooking.status)}
              </Descriptions.Item>
              <Descriptions.Item label="预约日期">
                <Space>
                  <CalendarOutlined />
                  <span>{selectedBooking.date}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="预约时间段">
                <Space>
                  <ClockCircleOutlined />
                  <span>{selectedBooking.start_time} - {selectedBooking.end_time}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="预约人姓名">
                <Space>
                  <UserOutlined />
                  <span>{selectedBooking.user_name}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                <Space>
                  <PhoneOutlined />
                  <span>{selectedBooking.user_phone}</span>
                </Space>
              </Descriptions.Item>
              {selectedBooking.purpose && (
                <Descriptions.Item label="使用用途">
                  {selectedBooking.purpose}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {formatDateTime(selectedBooking.created_at)}
              </Descriptions.Item>
              {selectedBooking.reviewed_at && (
                <Descriptions.Item label="审核时间">
                  {formatDateTime(selectedBooking.reviewed_at)}
                </Descriptions.Item>
              )}
              {selectedBooking.reject_reason && (
                <Descriptions.Item label="驳回原因">
                  <Text type="danger">{selectedBooking.reject_reason}</Text>
                </Descriptions.Item>
              )}
              {selectedBooking.cancelled_at && (
                <Descriptions.Item label="取消时间">
                  {formatDateTime(selectedBooking.cancelled_at)}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setDetailModalVisible(false);
                    setSelectedBooking(null);
                  }}
                >
                  关闭
                </Button>
                {selectedBooking.status === 'active' && (
                  <Popconfirm
                    title="确认取消预约"
                    description="取消后将无法恢复，需要重新预约。确定要取消吗？"
                    onConfirm={handleCancelBooking}
                    okText="确认取消"
                    cancelText="再想想"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      loading={cancelling}
                    >
                      取消预约
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default MyBookings;
