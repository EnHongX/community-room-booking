import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
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
  Alert
} from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import Register from './Register';

const { Title, Text } = Typography;

function HomePage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [dateBookings, setDateBookings] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRooms();
  }, []);

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
      if (error.response?.status === 409) {
        message.error('时间冲突，该时段已被预约，请选择其他时间');
      } else {
        message.error('预约失败，请稍后重试');
      }
      console.error('预约失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
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
      <div className="page-header">
        <div className="header-content">
          <div>
            <Title level={2}>社区活动室预约系统</Title>
            <p>选择下方活动室进行预约，便捷高效地使用社区资源</p>
          </div>
          <Link to="/register">
            <Button 
              type="default" 
              size="large"
              icon={<UserAddOutlined />}
              className="register-nav-button"
            >
              用户注册
            </Button>
          </Link>
        </div>
      </div>

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
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
