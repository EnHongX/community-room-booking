import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Statistic
} from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

function AdminConsole() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', minHeight: '360px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总预约数"
              value={0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活动室数量"
              value={0}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="注册用户"
              value={0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日预约"
              value={0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4} style={{ marginBottom: '16px' }}>
          欢迎使用管理后台
        </Title>
        <Text type="secondary">
          这是社区活动室预约系统的管理后台。您可以在这里管理活动室、预约和用户。
        </Text>
        <div style={{ marginTop: '24px' }}>
          <Space>
            <Button type="primary" icon={<CalendarOutlined />}>
              查看所有预约
            </Button>
            <Button 
              icon={<HomeOutlined />}
              onClick={() => navigate('/admin/rooms')}
            >
              管理活动室
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default AdminConsole;
