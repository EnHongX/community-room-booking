import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  TeamOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

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

function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const checkAdminAuth = useCallback(async () => {
    const storedAdmin = localStorage.getItem('admin');
    const adminSessionId = localStorage.getItem('adminSessionId');
    
    if (!storedAdmin || !adminSessionId) {
      navigate('/admin/login');
      return;
    }
  }, [navigate]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/rooms');
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('获取活动室列表失败');
        console.error('获取活动室列表失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAuth();
    fetchRooms();
  }, [checkAdminAuth, fetchRooms]);

  const handleAddRoom = () => {
    setEditingRoom(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditRoom = (record) => {
    setEditingRoom(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      capacity: record.capacity
    });
    setModalVisible(true);
  };

  const handleDeleteRoom = async (id) => {
    try {
      const response = await axios.delete(`/api/admin/rooms/${id}`);
      if (response.data.success) {
        message.success('活动室删除成功');
        fetchRooms();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        message.error(error.response.data?.message || '删除失败');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminSessionId');
        navigate('/admin/login');
        message.error('登录已过期，请重新登录');
      } else {
        message.error('删除活动室失败');
        console.error('删除活动室失败:', error);
      }
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingRoom) {
        const response = await axios.put(`/api/admin/rooms/${editingRoom.id}`, values);
        if (response.data.success) {
          message.success('活动室更新成功');
          setModalVisible(false);
          fetchRooms();
        }
      } else {
        const response = await axios.post('/api/admin/rooms', values);
        if (response.data.success) {
          message.success('活动室创建成功');
          setModalVisible(false);
          fetchRooms();
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '活动室名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <HomeOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '简介',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Text type="secondary">
          {text || <Text type="secondary"><InfoCircleOutlined /> 暂无简介</Text>}
        </Text>
      ),
    },
    {
      title: '容纳人数',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 120,
      render: (capacity) => (
        <Tag icon={<TeamOutlined />} color="blue">
          {capacity} 人
        </Tag>
      ),
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
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditRoom(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个活动室吗？"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={() => handleDeleteRoom(record.id)}
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
              <HomeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              活动室管理
            </Title>
            <Text type="secondary" style={{ marginTop: '4px', display: 'block' }}>
              管理系统中的所有活动室，包括新增、编辑和删除操作
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleAddRoom}
            >
              新增活动室
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={rooms}
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
            {editingRoom ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingRoom ? '编辑活动室' : '新增活动室'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="name"
            label="活动室名称"
            rules={[
              { required: true, message: '请输入活动室名称' },
              { max: 50, message: '名称不能超过50个字符' }
            ]}
          >
            <Input
              placeholder="请输入活动室名称"
              prefix={<HomeOutlined style={{ color: '#999' }} />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动室简介"
            rules={[
              { max: 500, message: '简介不能超过500个字符' }
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入活动室简介（选填）"
              prefix={<InfoCircleOutlined style={{ color: '#999' }} />}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容纳人数"
            rules={[
              { required: true, message: '请输入容纳人数' },
              { type: 'number', min: 1, message: '容纳人数必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入容纳人数"
              min={1}
              max={1000}
              prefix={<TeamOutlined style={{ color: '#999' }} />}
              addonAfter="人"
            />
          </Form.Item>

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
                {editingRoom ? '保存修改' : '创建活动室'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminRooms;
