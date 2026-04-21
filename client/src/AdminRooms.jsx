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
  Col,
  Select,
  DatePicker,
  TimePicker,
  Descriptions,
  Divider,
  Timeline,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_MAP = {
  normal: { label: '正常开放', color: 'success', icon: <CheckCircleOutlined /> },
  maintenance: { label: '维护中', color: 'warning', icon: <WarningOutlined /> },
  suspended: { label: '暂停开放', color: 'error', icon: <CloseCircleOutlined /> }
};

function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusRoom, setStatusRoom] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusForm] = Form.useForm();
  
  const navigate = useNavigate();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/rooms');
      if (response.data.success) {
        const roomsWithStatus = await Promise.all(
          response.data.data.map(async (room) => {
            try {
              const statusResponse = await axios.get(`/api/admin/rooms/${room.id}/maintenance`);
              const maintenances = statusResponse.data?.data || [];
              
              const now = dayjs();
              const activeMaintenance = maintenances.find(m => {
                if (m.status === 'normal') return false;
                const start = dayjs(`${m.start_date} ${m.start_time}`);
                const end = dayjs(`${m.end_date} ${m.end_time}`);
                return now.isAfter(start) && now.isBefore(end);
              });
              
              const upcomingMaintenance = maintenances.find(m => {
                if (m.status === 'normal') return false;
                const start = dayjs(`${m.start_date} ${m.start_time}`);
                return now.isBefore(start);
              });
              
              return {
                ...room,
                currentStatus: activeMaintenance ? activeMaintenance.status : 'normal',
                activeMaintenance,
                upcomingMaintenance,
                maintenanceHistory: maintenances
              };
            } catch {
              return { ...room, currentStatus: 'normal', maintenanceHistory: [] };
            }
          })
        );
        setRooms(roomsWithStatus);
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
    fetchRooms();
  }, [fetchRooms]);

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
      capacity: record.capacity,
      open_time: record.open_time ? dayjs(record.open_time, 'HH:mm') : dayjs('08:00', 'HH:mm'),
      close_time: record.close_time ? dayjs(record.close_time, 'HH:mm') : dayjs('22:00', 'HH:mm')
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
      const submitData = {
        ...values,
        open_time: values.open_time ? values.open_time.format('HH:mm') : '08:00',
        close_time: values.close_time ? values.close_time.format('HH:mm') : '22:00'
      };
      
      if (editingRoom) {
        const response = await axios.put(`/api/admin/rooms/${editingRoom.id}`, submitData);
        if (response.data.success) {
          message.success('活动室更新成功');
          setModalVisible(false);
          fetchRooms();
        }
      } else {
        const response = await axios.post('/api/admin/rooms', submitData);
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

  const handleOpenStatusModal = async (record) => {
    setStatusRoom(record);
    setStatusModalVisible(true);
    statusForm.resetFields();
    statusForm.setFieldsValue({
      status: 'maintenance',
      start_time: dayjs('00:00', 'HH:mm'),
      end_time: dayjs('23:59', 'HH:mm')
    });
    
    setHistoryLoading(true);
    try {
      const response = await axios.get(`/api/admin/rooms/${record.id}/maintenance`);
      setMaintenanceHistory(response.data?.data || []);
    } catch (error) {
      console.error('获取维护历史失败:', error);
      message.error('获取维护历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStatusSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { status, date_range, start_time, end_time, reason } = values;
      
      const data = {
        status,
        reason
      };
      
      if (status !== 'normal' && date_range) {
        data.start_date = date_range[0].format('YYYY-MM-DD');
        data.end_date = date_range[1].format('YYYY-MM-DD');
        if (start_time) data.start_time = start_time.format('HH:mm');
        if (end_time) data.end_time = end_time.format('HH:mm');
      }
      
      const response = await axios.post(`/api/admin/rooms/${statusRoom.id}/maintenance`, data);
      
      if (response.data.success) {
        const { cancelled_count } = response.data.data || {};
        if (cancelled_count > 0) {
          message.success(`状态设置成功，已自动取消 ${cancelled_count} 个冲突预约`);
        } else {
          message.success(response.data.message || '状态设置成功');
        }
        setStatusModalVisible(false);
        fetchRooms();
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

  const renderStatusTag = (status, maintenance) => {
    const config = STATUS_MAP[status] || STATUS_MAP.normal;
    const tag = (
      <Tag icon={config.icon} color={config.color}>
        {config.label}
      </Tag>
    );
    
    if (maintenance && status !== 'normal') {
      return (
        <Tooltip title={`${maintenance.start_date} ${maintenance.start_time} 至 ${maintenance.end_date} ${maintenance.end_time}${maintenance.reason ? `\n原因: ${maintenance.reason}` : ''}`}>
          {tag}
        </Tooltip>
      );
    }
    return tag;
  };

  const columns = [
    {
      title: '活动室名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text) => (
        <Space>
          <HomeOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '当前状态',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      width: 150,
      render: (status, record) => (
        <Space direction="vertical" size="small">
          {renderStatusTag(status, record.activeMaintenance)}
          {record.upcomingMaintenance && (
            <Tag icon={<ClockCircleOutlined />} color="processing">
              即将{STATUS_MAP[record.upcomingMaintenance.status]?.label}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '开放时间',
      key: 'openTime',
      width: 150,
      render: (_, record) => (
        <Tag icon={<ClockCircleOutlined />} color="blue">
          {record.open_time || '08:00'} - {record.close_time || '22:00'}
        </Tag>
      ),
    },
    {
      title: '简介',
      dataIndex: 'description',
      key: 'description',
      width: 250,
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
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleOpenStatusModal(record)}
          >
            状态
          </Button>
          <Button
            type="link"
            size="small"
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
              size="small"
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
              管理系统中的所有活动室，包括新增、编辑、删除和状态管理
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
          scroll={{ x: 1300 }}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="open_time"
                label="开放开始时间"
                rules={[{ required: true, message: '请选择开放开始时间' }]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  minuteStep={30}
                  placeholder="请选择开放开始时间"
                  prefix={<ClockCircleOutlined style={{ color: '#999' }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="close_time"
                label="开放结束时间"
                rules={[{ required: true, message: '请选择开放结束时间' }]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  minuteStep={30}
                  placeholder="请选择开放结束时间"
                  prefix={<ClockCircleOutlined style={{ color: '#999' }} />}
                />
              </Form.Item>
            </Col>
          </Row>

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

      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>状态管理 - {statusRoom?.name}</span>
          </Space>
        }
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleStatusSubmit}
          style={{ marginTop: '24px' }}
        >
          <Card size="small" style={{ marginBottom: '16px' }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="当前状态">
                {statusRoom && renderStatusTag(statusRoom.currentStatus, statusRoom.activeMaintenance)}
              </Descriptions.Item>
              {statusRoom?.activeMaintenance && (
                <>
                  <Descriptions.Item label="维护时段">
                    {statusRoom.activeMaintenance.start_date} {statusRoom.activeMaintenance.start_time}
                    <br />
                    至 {statusRoom.activeMaintenance.end_date} {statusRoom.activeMaintenance.end_time}
                  </Descriptions.Item>
                  {statusRoom.activeMaintenance.reason && (
                    <Descriptions.Item label="原因" span={2}>
                      {statusRoom.activeMaintenance.reason}
                    </Descriptions.Item>
                  )}
                </>
              )}
            </Descriptions>
          </Card>

          <Divider orientation="left">设置新状态</Divider>

          <Form.Item
            name="status"
            label="选择状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select size="large">
              <Option value="normal">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  恢复正常开放
                </Space>
              </Option>
              <Option value="maintenance">
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  设置为维护中
                </Space>
              </Option>
              <Option value="suspended">
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  设置为暂停开放
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) => {
              const status = getFieldValue('status');
              if (status === 'normal') return null;
              
              return (
                <>
                  <Form.Item
                    name="date_range"
                    label="日期范围"
                    rules={[{ required: true, message: '请选择日期范围' }]}
                  >
                    <RangePicker
                      style={{ width: '100%' }}
                      size="large"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="start_time"
                        label="开始时间"
                        rules={[{ required: true, message: '请选择开始时间' }]}
                      >
                        <TimePicker
                          style={{ width: '100%' }}
                          size="large"
                          format="HH:mm"
                          minuteStep={30}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="end_time"
                        label="结束时间"
                        rules={[{ required: true, message: '请选择结束时间' }]}
                      >
                        <TimePicker
                          style={{ width: '100%' }}
                          size="large"
                          format="HH:mm"
                          minuteStep={30}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              );
            }}
          </Form.Item>

          <Form.Item
            name="reason"
            label="原因说明"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入原因说明（选填）"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Text type="warning" style={{ display: 'block', marginBottom: '16px' }}>
            <WarningOutlined /> 注意：设置为维护中或暂停开放后，该时段内已存在的预约将被自动取消。
          </Text>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setStatusModalVisible(false)}
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
                确认设置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {maintenanceHistory.length > 0 && (
          <>
            <Divider orientation="left">
              <Space>
                <HistoryOutlined />
                状态变更历史
              </Space>
            </Divider>
            <Timeline
              mode="left"
              items={maintenanceHistory.slice(0, 10).map((item, index) => ({
                color: item.status === 'normal' ? 'green' : (item.status === 'maintenance' ? 'gold' : 'red'),
                children: (
                  <div>
                    <Space>
                      {STATUS_MAP[item.status]?.icon}
                      <Text strong>{STATUS_MAP[item.status]?.label}</Text>
                    </Space>
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary" small>
                        {item.start_date} {item.start_time} 至 {item.end_date} {item.end_time}
                      </Text>
                    </div>
                    {item.reason && (
                      <div>
                        <Text type="secondary" small>原因: {item.reason}</Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary" small>
                        设置时间: {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                  </div>
                )
              }))}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminRooms;
