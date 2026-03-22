import React, { useState, useEffect } from 'react';
import {
  ConfigProvider, Card, Typography, Form, Input, Select,
  Radio, Button, Space, Alert, message, Row, Col, Avatar, Divider
} from 'antd';
import {
  UserOutlined, SaveOutlined, ArrowLeftOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import Navbar from '../../components/Navbar';

const { Title, Text } = Typography;

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh'
];

const ProfilePage = () => {
  const navigate  = useNavigate();
  const { user, userProfile, refreshProfile } = useAuth();
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (userProfile) {
      form.setFieldsValue({
        name           : userProfile.name            || '',
        age            : userProfile.age             || '',
        gender         : userProfile.gender          || '',
        marital_status : userProfile.marital_status  || '',
        employment_type: userProfile.employment_type || '',
        sector         : userProfile.sector          || '',
        profession     : userProfile.profession      || '',
        state          : userProfile.state           || '',
        city           : userProfile.city            || '',
      });
    }
  }, [userProfile]);

  const handleSave = async (values) => {
    try {
      setSaving(true);
      setError('');

      const isMetro = ['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad']
        .some(c => values.city?.toLowerCase().includes(c.toLowerCase()));

      const { error: err } = await supabase.from('users').upsert({
        id             : user.id,
        email          : user.email,
        name           : values.name,
        age            : parseInt(values.age),
        gender         : values.gender,
        marital_status : values.marital_status,
        employment_type: values.employment_type,
        sector         : values.sector,
        profession     : values.profession || '',
        state          : values.state,
        city           : values.city,
        is_metro       : isMetro,
        onboarding_done: true,
        updated_at     : new Date().toISOString(),
      }, { onConflict: 'id' });

      if (err) throw new Error(err.message);

      await refreshProfile();
      message.success('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { color: '#08457E', fontWeight: 600, fontSize: 13 };

  return (
    <ConfigProvider theme={{
      token: { colorPrimary: '#5B92E5', borderRadius: 12, fontFamily: "'Outfit', sans-serif" },
      components: {
        Input: { colorBgContainer: '#F8FAFC', colorBorder: '#E2E8F0', controlHeight: 44 },
        Select: { controlHeight: 44 },
      }
    }}>
      <div style={{ minHeight: '100vh', background: '#F2F3F4' }}>
        <Navbar />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
            style={{ marginBottom: 24, borderRadius: 10, color: '#08457E', borderColor: '#B8C8E6' }}>
            Back
          </Button>

          {/* Profile Header */}
          <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <Avatar size={72} style={{ background: '#EEF3FA', color: '#08457E', fontSize: 28, fontWeight: 700 }}>
                {userProfile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0, color: '#08457E' }}>{userProfile?.name || 'Your Profile'}</Title>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>{user?.email}</Text>
                {userProfile?.employment_type && (
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ color: '#5B92E5', fontSize: 13, fontWeight: 600 }}>
                      {userProfile.employment_type} · {userProfile.sector || ''}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Edit Form */}
          <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Title level={4} style={{ color: '#08457E', marginBottom: 24 }}>Edit Personal Information</Title>

            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 10 }} />}

            <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>

              <Divider orientation="left" style={{ color: '#6B7280', fontSize: 12 }}>PERSONAL DETAILS</Divider>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label={<Text style={labelStyle}>Full Name</Text>}
                    rules={[{ required: true, message: 'Please enter your name' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#9CA3AF' }} />} placeholder="Your full name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="age" label={<Text style={labelStyle}>Age</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Input type="number" min={18} max={100} placeholder="e.g. 28" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="gender" label={<Text style={labelStyle}>Gender</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Radio.Group buttonStyle="solid">
                      <Radio.Button value="Male">Male</Radio.Button>
                      <Radio.Button value="Female">Female</Radio.Button>
                      <Radio.Button value="Other">Other</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="marital_status" label={<Text style={labelStyle}>Marital Status</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Radio.Group buttonStyle="solid">
                      <Radio.Button value="Single">Single</Radio.Button>
                      <Radio.Button value="Married">Married</Radio.Button>
                      <Radio.Button value="Divorced">Divorced</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: '#6B7280', fontSize: 12 }}>EMPLOYMENT</Divider>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="employment_type" label={<Text style={labelStyle}>Employment Type</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Select placeholder="Select type">
                      {['Salaried','Self-Employed','Freelancer','Business Owner','Student','Retired'].map(t => (
                        <Select.Option key={t} value={t}>{t}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="sector" label={<Text style={labelStyle}>Sector / Industry</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Select placeholder="Select sector">
                      {['Government','IT/Software','Banking/Finance','Healthcare','Education','Manufacturing','Real Estate','Retail/Trade','Agriculture','Legal/CA','Media/Arts','Startup','Defence','Other'].map(s => (
                        <Select.Option key={s} value={s}>{s}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="profession" label={<Text style={labelStyle}>Job Title <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(Optional)</span></Text>}>
                <Input placeholder="e.g. Software Engineer, CA, Teacher" />
              </Form.Item>

              <Divider orientation="left" style={{ color: '#6B7280', fontSize: 12 }}>LOCATION</Divider>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="state" label={<Text style={labelStyle}>State</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Select showSearch placeholder="Select state">
                      {STATES.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="city" label={<Text style={labelStyle}>City</Text>}
                    rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<EnvironmentOutlined style={{ color: '#9CA3AF' }} />} placeholder="e.g. Hyderabad" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary" htmlType="submit" size="large"
                  icon={<SaveOutlined />} loading={saving}
                  style={{ height: 48, borderRadius: 12, background: '#08457E', border: 'none', fontWeight: 600, paddingLeft: 32, paddingRight: 32 }}
                >
                  Save Changes
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ProfilePage;
