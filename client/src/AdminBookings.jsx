import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Typography,
  Tag,
  Row,
  Col,
  Descriptions,
  Divider,
  Alert
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HomeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getStatusTag = (status) => {
  const statusMap = {
    pending: { color: 'orange', text: '待处理' },
    approved: { color: 'green', text: '已通过' },
    rejected: { color: 'red', text: '已驳回' },
    active: { color: 'blue', text: '进行中' },
    cancelled: { color: 'default', text: '已取消' }
  };
  const info = statusMap[status] || { color: 'default', text: status };
  return <Tag color={info.color}>{info.text}</Tag>;
};

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [statusFilter, setStatusFilter] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchBookings = useCallback(async (page = 1, pageSize = 10, status = null) => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (status) {
        params.status = status;
      }

      const response = await axios.get('/api/admin/bookings', { params });
      if (response.data.success) {
        setBookings(response.data.data.bookings);
        setPagination({
          current: response.data.data.pagination.page,
          pageSize: response.data.data.pagination.page_size,
          total: response.data.data.pagination.total
        });
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取预约列表失败');
        console.error('获取预约列表失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchBookings(pagination.current, pagination.pageSize, statusFilter);
  }, [fetchBookings, pagination.current, pagination.pageSize, statusFilter]);

  const handleViewDetail = async (record) => {
    try {
      const response = await axios.get(`/api/admin/bookings/${record.id}`);
      if (response.data.success) {
        setSelectedBooking(response.data.data);
        rejectForm.resetFields();
        setDetailModalVisible(true);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取预约详情失败');
        console.error('获取预约详情失败:', error);
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;

    setSubmitting(true);
    try {
      const response = await axios.put(`/api/admin/bookings/${selectedBooking.id}/approve`);
      if (response.data.success) {
        message.success('预约已通过');
        setDetailModalVisible(false);
        fetchBookings(pagination.current, pagination.pageSize, statusFilter);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        message.error(error.response.data?.message || '操作失败');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('操作失败，请稍后重试');
        console.error('通过预约失败:', error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (values) => {
    if (!selectedBooking) return;

    setSubmitting(true);
    try {
      const response = await axios.put(`/api/admin/bookings/${selectedBooking.id}/reject`, {
        reject_reason: values.reject_reason
      });
      if (response.data.success) {
        message.success('预约已驳回');
        setDetailModalVisible(false);
        fetchBookings(pagination.current, pagination.pageSize, statusFilter);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        message.error(error.response.data?.message || '操作失败');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('操作失败，请稍后重试');
        console.error('驳回预约失败:', error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value || null);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '活动室名称',
      dataIndex: 'room_name',
      key: 'room_name',
      render: (text) => (
        <Space>
          <HomeOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '预约用户',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text, record) => (
        <div>
          <Space>
            <UserOutlined style={{ color: '#52c41a' }} />
            <Text>{text}</Text>
          </Space>
          {record.user_email && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {record.user_email}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '预约日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#722ed1' }} />
          <Text>{date}</Text>
        </Space>
      ),
    },
    {
      title: '预约时间段',
      key: 'time',
      width: 150,
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#13c2c2' }} />
          <Text>{record.start_time} - {record.end_time}</Text>
        </Space>
      ),
    },
    {
      title: '预约状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => (
        <Text type="secondary">{time ? new Date(time).toLocaleString('zh-CN') : '-'}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Title level={3} style={{ margin: 0 }}>
              <CalendarOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              预约管理
            </Title>
            <Text type="secondary" style={{ marginTop: '4px', display: 'block' }}>
              管理系统中的所有预约申请，进行审核操作
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Select
              style={{ width: 200 }}
              placeholder="按状态筛选"
              allowClear
              value={statusFilter}
              onChange={handleStatusChange}
              size="large"
            >
              <Option value="pending">待处理</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已驳回</Option>
              <Option value="active">进行中</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={bookings}
          rowKey="id"
          loading={loading}
          bordered
          onChange={handleTableChange}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>预约详情</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedBooking && (
          <div style={{ marginTop: '16px' }}>
            {selectedBooking.status === 'pending' && (
              <Alert
                message="待处理预约"
                description="该预约处于待处理状态，您可以选择通过或驳回此预约。"
                type="warning"
                showIcon
                style={{ marginBottom: '20px' }}
              />
            )}

            <Descriptions bordered column={2}>
              <Descriptions.Item label="预约编号">{selectedBooking.id}</Descriptions.Item>
              <Descriptions.Item label="预约状态">
                {getStatusTag(selectedBooking.status)}
              </Descriptions.Item>
              <Descriptions.Item label="活动室名称" span={2}>
                <Space>
                  <HomeOutlined />
                  <Text strong>{selectedBooking.room_name}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="预约人">
                <Space>
                  <UserOutlined />
                  <Text>{selectedBooking.user_name}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                <Space>
                  <PhoneOutlined />
                  <Text>{selectedBooking.user_phone}</Text>
                </Space>
              </Descriptions.Item>
              {selectedBooking.user_email && (
                <Descriptions.Item label="用户邮箱" span={2}>
                  {selectedBooking.user_email}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="预约日期">
                <Space>
                  <CalendarOutlined />
                  <Text>{selectedBooking.date}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="预约时间">
                <Space>
                  <ClockCircleOutlined />
                  <Text>{selectedBooking.start_time} - {selectedBooking.end_time}</Text>
                </Space>
              </Descriptions.Item>
              {selectedBooking.purpose && (
                <Descriptions.Item label="使用用途" span={2}>
                  {selectedBooking.purpose}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间" span={2}>
                {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
              {selectedBooking.reviewed_at && (
                <Descriptions.Item label="审核时间" span={2}>
                  {new Date(selectedBooking.reviewed_at).toLocaleString('zh-CN')}
                </Descriptions.Item>
              )}
              {selectedBooking.reject_reason && (
                <Descriptions.Item label="驳回原因" span={2}>
                  <Text type="danger">{selectedBooking.reject_reason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedBooking.status === 'pending' && (
              <>
                <Divider>审核操作</Divider>
                <Form
                  form={rejectForm}
                  layout="vertical"
                  onFinish={handleReject}
                >
                  <Form.Item
                    name="reject_reason"
                    label={
                      <Space>
                        <InfoCircleOutlined />
                        <span>驳回原因（选填）</span>
                      </Space>
                    }
                  >
                    <TextArea
                      rows={3}
                      placeholder="请输入驳回原因（选填）"
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button
                        onClick={() => setDetailModalVisible(false)}
                        size="large"
                      >
                        取消
                      </Button>
                      <Button
                        type="primary"
                        danger
                        icon={<CloseCircleOutlined />}
                        htmlType="submit"
                        loading={submitting}
                        size="large"
                      >
                        驳回
                      </Button>
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleApprove}
                        loading={submitting}
                        size="large"
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      >
                        通过
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminBookings;
