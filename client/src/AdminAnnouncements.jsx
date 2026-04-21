import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Row,
  Col,
  Select,
  Descriptions,
  Divider,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  NotificationOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_MAP = {
  pending: { label: '待发布', color: 'processing', icon: <ClockCircleOutlined /> },
  published: { label: '已发布', color: 'success', icon: <CheckCircleOutlined /> },
  cancelled: { label: '已取消', color: 'error', icon: <CloseCircleOutlined /> }
};

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const navigate = useNavigate();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/announcements', {
        params: { page_size: 100 }
      });
      if (response.data.success) {
        setAnnouncements(response.data.data.announcements || []);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取公告列表失败');
        console.error('获取公告列表失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleAddAnnouncement = () => {
    setEditingAnnouncement(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'pending'
    });
    setModalVisible(true);
  };

  const handleEditAnnouncement = (record) => {
    setEditingAnnouncement(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      status: record.status
    });
    setModalVisible(true);
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const response = await axios.delete(`/api/admin/announcements/${id}`);
      if (response.data.success) {
        message.success('公告删除成功');
        fetchAnnouncements();
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('删除公告失败');
        console.error('删除公告失败:', error);
      }
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingAnnouncement) {
        const response = await axios.put(`/api/admin/announcements/${editingAnnouncement.id}`, values);
        if (response.data.success) {
          message.success('公告更新成功');
          setModalVisible(false);
          fetchAnnouncements();
        }
      } else {
        const response = await axios.post('/api/admin/announcements', values);
        if (response.data.success) {
          message.success('公告创建成功');
          setModalVisible(false);
          fetchAnnouncements();
        }
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
        console.error('操作失败:', error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusTag = (status) => {
    const config = STATUS_MAP[status] || STATUS_MAP.pending;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.label}
      </Tag>
    );
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '-';
    return dayjs(datetime).format('YYYY-MM-DD HH:mm');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '公告标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => (
        <Space>
          <NotificationOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => renderStatusTag(status),
    },
    {
      title: '公告内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text type="secondary">
            {text || <Text type="secondary"><InfoCircleOutlined /> 暂无内容</Text>}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'published_at',
      key: 'published_at',
      width: 180,
      render: (time) => (
        <Text type="secondary">{formatDateTime(time)}</Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => (
        <Text type="secondary">{formatDateTime(time)}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAnnouncement(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个公告吗？"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={() => handleDeleteAnnouncement(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
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
              <NotificationOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              公告管理
            </Title>
            <Text type="secondary" style={{ marginTop: '4px', display: 'block' }}>
              管理系统中的公告，包括新增、编辑、删除和状态管理
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleAddAnnouncement}
            >
              新增公告
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="id"
          loading={loading}
          bordered
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            {editingAnnouncement ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingAnnouncement ? '编辑公告' : '新增公告'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '24px' }}
        >
          {editingAnnouncement && (
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="当前状态">
                  {renderStatusTag(editingAnnouncement.status)}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {formatDateTime(editingAnnouncement.created_at)}
                </Descriptions.Item>
                {editingAnnouncement.published_at && (
                  <Descriptions.Item label="发布时间" span={2}>
                    {formatDateTime(editingAnnouncement.published_at)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          <Divider orientation="left">公告信息</Divider>

          <Form.Item
            name="title"
            label="公告标题"
            rules={[
              { required: true, message: '请输入公告标题' },
              { max: 200, message: '标题不能超过200个字符' }
            ]}
          >
            <Input
              placeholder="请输入公告标题"
              prefix={<NotificationOutlined style={{ color: '#999' }} />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="公告内容"
            rules={[
              { required: true, message: '请输入公告内容' },
              { max: 2000, message: '内容不能超过2000个字符' }
            ]}
          >
            <TextArea
              rows={6}
              placeholder="请输入公告内容"
              prefix={<InfoCircleOutlined style={{ color: '#999' }} />}
              maxLength={2000}
              showCount
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="发布状态"
            rules={[{ required: true, message: '请选择发布状态' }]}
          >
            <Select size="large">
              <Option value="pending">
                <Space>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  待发布
                </Space>
              </Option>
              <Option value="published">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  已发布
                </Space>
              </Option>
              <Option value="cancelled">
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  已取消
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Text type="warning" style={{ display: 'block', marginBottom: '16px' }}>
            <InfoCircleOutlined /> 提示：设置为"已发布"后，公告将立即显示在首页供所有用户查看。
          </Text>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setModalVisible(false)}
                size="large"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
              >
                {editingAnnouncement ? '保存修改' : '创建公告'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminAnnouncements;
