import React from 'react';
import { Layout, Typography, Card, Row, Col, Space, Button, Badge, Tag, ConfigProvider, Spin } from 'antd';
import { ArrowLeftOutlined, RocketOutlined, CheckCircleOutlined, SwapOutlined, CarOutlined, SafetyOutlined, HomeOutlined, StockOutlined, BulbOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import TaxAssistantChatbot from '../../components/TaxAssistantChatbot';
import useProfileData from '../../hooks/useProfileData';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const Recommendations = () => {
  const navigate  = useNavigate();
  const { formData, backendResult, dataLoading, category, subcategory } = useProfileData();

  if (dataLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F2F3F4' }}><Spin size="large" /></div>;
  }

  const salary   = formData?.annualSalary || 0;
  const slabRate = salary > 1500000 ? 0.30 : salary > 1000000 ? 0.20 : salary > 500000 ? 0.10 : 0.05;
  const fmt      = (n) => n > 0 ? `₹${Math.round(n).toLocaleString('en-IN')}` : 'Variable';

  const recommendations = [];

  const currentNPS = formData?.deductionNPS || 0;
  if (currentNPS < 50000) {
    recommendations.push({
      id: 1, title: 'Maximize NPS 80CCD(1B)',
      description: `Invest ₹${(50000 - currentNPS).toLocaleString('en-IN')} more in NPS Tier-1 for exclusive deduction beyond 80C limit.`,
      icon: <RocketOutlined />, iconColor: '#8B5CF6',
      savings: fmt((50000 - currentNPS) * slabRate), tag: 'Retirement'
    });
  }

  const d80C = formData?.deduction80C || 0;
  if (d80C < 150000) {
    recommendations.push({
      id: 2, title: 'Fill Section 80C Limit',
      description: `You have ₹${(150000 - d80C).toLocaleString('en-IN')} remaining in 80C. Invest in PPF, ELSS, or LIC premium.`,
      icon: <CheckCircleOutlined />, iconColor: '#059669',
      savings: fmt((150000 - d80C) * slabRate), tag: 'Investment'
    });
  }

  const d80D = formData?.deduction80D || 0;
  if (d80D < 25000) {
    recommendations.push({
      id: 3, title: 'Get Health Insurance (80D)',
      description: `Buy health insurance to claim up to ₹25,000 deduction for self and family.`,
      icon: <SafetyOutlined />, iconColor: '#EF4444',
      savings: fmt((25000 - d80D) * slabRate), tag: 'Health'
    });
  }

  const regime = formData?.regimePreference;
  if (backendResult?.recommendedRegime && regime !== backendResult.recommendedRegime) {
    const saving = backendResult.saving || 0;
    recommendations.push({
      id: 4, title: `Switch to ${backendResult.recommendedRegime === 'old' ? 'Old' : 'New'} Regime`,
      description: `Based on your income and deductions, the ${backendResult.recommendedRegime === 'old' ? 'Old' : 'New'} Regime saves you more tax this year.`,
      icon: <SwapOutlined />, iconColor: '#5B92E5',
      savings: fmt(saving), tag: 'Regime'
    });
  }

  if (salary > 700000) {
    recommendations.push({
      id: 5, title: 'Harvest LTCG Tax-Free',
      description: 'You can book up to ₹1.25L of equity LTCG every year completely tax-free. Sell and rebuy to reset cost basis.',
      icon: <StockOutlined />, iconColor: '#0891B2',
      savings: '₹0 tax on ₹1.25L gains', tag: 'Investments'
    });
  }

  if (category === 'Vehicle') {
    if (formData?.usageType !== 'Business' && formData?.employmentType === 'Self-Employed') {
      recommendations.push({
        id: 6, title: 'Claim Vehicle Depreciation',
        description: `Self-employed individuals can claim ${subcategory === 'Car' ? '15%' : '30%'} depreciation on ${subcategory} used for business.`,
        icon: <CarOutlined />, iconColor: '#D97706',
        savings: fmt((formData?.purchasePrice || 0) * (subcategory === 'Car' ? 0.15 : 0.30) * slabRate), tag: 'Vehicle'
      });
    }
    if (formData?.fuelType === 'Electric') {
      recommendations.push({
        id: 7, title: 'Claim EV Loan Interest (80EEB)',
        description: 'EV loan interest up to ₹1.5L is deductible under Section 80EEB exclusively for electric vehicles.',
        icon: <CarOutlined />, iconColor: '#10B981',
        savings: fmt(Math.min(formData?.loanInterestPaid || 150000, 150000) * slabRate), tag: 'EV Benefit'
      });
    }
  }

  if (formData?.employmentType === 'Salaried' && (!formData?.hraDeduction || formData?.hraDeduction === 0)) {
    recommendations.push({
      id: 8, title: 'Claim HRA Exemption',
      description: 'If you pay rent, you can claim HRA exemption. Submit rent receipts to your employer or claim directly in ITR.',
      icon: <HomeOutlined />, iconColor: '#7C3AED',
      savings: fmt(salary * 0.15 * slabRate), tag: 'Salary'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 9, title: 'Your Tax Planning Looks Optimized!',
      description: 'You are making good use of available deductions. Consider consulting a CA for advanced strategies like HUF or RNOR status.',
      icon: <BulbOutlined />, iconColor: '#10B981',
      savings: 'Ask AI Assistant', tag: 'Advanced'
    });
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#5B92E5', borderRadius: 20, fontFamily: "'Outfit', sans-serif" } }}>
      <Layout style={{ minHeight: '100vh', background: '#F2F3F4' }}>
        <Navbar />
        <div style={{ padding: '32px 24px' }}>
          <Content style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}
              style={{ marginBottom: 24, borderRadius: 12, fontWeight: 600, color: '#5B92E5' }}>
              Back to Dashboard
            </Button>
            <Title level={2} style={{ color: '#08457E', fontWeight: 800, marginBottom: 8 }}>Actionable Recommendations</Title>
            <Paragraph style={{ color: '#6B7280', fontSize: 16, marginBottom: 32 }}>
              Specific steps to reduce your tax burden — ranked by impact.
            </Paragraph>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {recommendations.map((rec, i) => (
                <Card key={rec.id} style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={16}>
                      <Space size={16} align="start">
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: rec.iconColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: rec.iconColor, fontSize: 20, flexShrink: 0 }}>
                          {rec.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <Text strong style={{ color: '#08457E', fontSize: 16 }}>{rec.title}</Text>
                            <Tag style={{ borderRadius: 20, fontSize: 11, background: rec.iconColor + '15', color: rec.iconColor, border: 'none' }}>{rec.tag}</Tag>
                            {i === 0 && <Tag color="red" style={{ borderRadius: 20, fontSize: 10 }}>Top Priority</Tag>}
                          </div>
                          <Paragraph style={{ color: '#6B7280', margin: 0, fontSize: 14, lineHeight: 1.6 }}>{rec.description}</Paragraph>
                        </div>
                      </Space>
                    </Col>
                    <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>POTENTIAL SAVING</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{rec.savings}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>per year</div>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>

            <div style={{ marginTop: 40 }}><TaxAssistantChatbot /></div>
          </Content>
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default Recommendations;
