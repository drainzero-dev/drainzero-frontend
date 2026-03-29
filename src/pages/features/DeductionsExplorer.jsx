import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import {
  Layout, Typography, Card, Table, Tag, Input,
  Space, ConfigProvider, Select, Row, Col, Button
} from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined,
  CheckCircleFilled, CloseCircleFilled, MinusCircleFilled
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TaxInfoTooltip from '../../components/TaxInfoTooltip';
import { getExistingProfile } from '../../services/profileService';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const ALL_DEDUCTIONS = [
  { section: '80C',            name: 'PPF / EPF / ELSS / LIC / NSC / Home Loan Principal', limit: '₹1,50,000',                    category: 'Investment',    regime: 'Old Only' },
  { section: '80CCC',          name: 'Pension Fund Contribution (LIC/Annuity)',              limit: '₹1,50,000 (within 80C)',        category: 'Retirement',    regime: 'Old Only' },
  { section: '80CCD(1)',       name: 'Employee NPS Contribution',                            limit: '₹1,50,000 (within 80C)',        category: 'Retirement',    regime: 'Old Only' },
  { section: '80CCD(1B)',      name: 'Additional NPS Contribution (extra)',                  limit: '₹50,000',                       category: 'Retirement',    regime: 'Old Only' },
  { section: '80CCD(2)',       name: 'Employer NPS Contribution',                            limit: '10% of Basic',                  category: 'Salary',        regime: 'Both'     },
  { section: '80D',            name: 'Health Insurance Premium (Self + Family)',             limit: '₹25,000 / ₹50,000 (senior)',    category: 'Health',        regime: 'Old Only' },
  { section: '80D',            name: 'Parents Health Insurance',                             limit: '₹25,000 / ₹50,000 (senior)',    category: 'Health',        regime: 'Old Only' },
  { section: '80DD',           name: 'Disabled Dependent Medical Expenses',                  limit: '₹75,000 / ₹1,25,000 (severe)',  category: 'Health',        regime: 'Old Only' },
  { section: '80DDB',          name: 'Treatment of Specified Diseases',                      limit: '₹40,000 / ₹1,00,000 (senior)',  category: 'Health',        regime: 'Old Only' },
  { section: '80E',            name: 'Education Loan Interest',                              limit: 'Unlimited (8 years)',           category: 'Education',     regime: 'Old Only' },
  { section: '80EEB',          name: 'Electric Vehicle Loan Interest',                       limit: '₹1,50,000',                     category: 'Vehicle',       regime: 'Both'     },
  { section: '80G',            name: 'Donations to Approved Funds / Charities',              limit: '50% or 100% of donation',       category: 'Donation',      regime: 'Old Only' },
  { section: '80GG',           name: 'Rent Paid (no HRA in salary)',                         limit: '₹60,000/yr',                    category: 'Rent',          regime: 'Old Only' },
  { section: '80QQB',          name: 'Royalty from Books (Author)',                          limit: '₹3,00,000',                     category: 'Profession',    regime: 'Old Only' },
  { section: '80RRB',          name: 'Patent Royalty Income',                                limit: '₹3,00,000',                     category: 'Profession',    regime: 'Old Only' },
  { section: '80TTA',          name: 'Savings Account Interest',                             limit: '₹10,000',                       category: 'Interest',      regime: 'Old Only' },
  { section: '80TTB',          name: 'Interest Income (Senior Citizens)',                    limit: '₹50,000',                       category: 'Interest',      regime: 'Old Only' },
  { section: '80U',            name: 'Self with Disability',                                 limit: '₹75,000 / ₹1,25,000 (severe)',  category: 'Health',        regime: 'Old Only' },
  { section: '24(b)',          name: 'Home Loan Interest (Self-Occupied)',                   limit: '₹2,00,000',                     category: 'Property',      regime: 'Old Only' },
  { section: '24(b)',          name: 'Home Loan Interest (Let-Out)',                         limit: 'Unlimited (capped set-off)',    category: 'Property',      regime: 'Old Only' },
  { section: '10(13A)',        name: 'HRA Exemption',                                        limit: 'Least of 3 formulas',           category: 'Salary',        regime: 'Old Only' },
  { section: '16(ia)',         name: 'Standard Deduction (Salaried)',                        limit: '₹75,000 (New) / ₹50,000 (Old)', category: 'Salary',        regime: 'Both'     },
  { section: '16(iii)',        name: 'Professional Tax',                                     limit: 'Actual paid',                   category: 'Salary',        regime: 'Old Only' },
  { section: '10(10D)',        name: 'Life Insurance Maturity Proceeds',                     limit: 'Exempt (conditions)',           category: 'Insurance',     regime: 'Both'     },
  { section: '10(10)',         name: 'Gratuity Exemption',                                   limit: '₹20,00,000',                    category: 'Salary',        regime: 'Both'     },
  { section: '10(11)',         name: 'PPF Maturity & Interest',                              limit: 'Fully exempt',                  category: 'Investment',    regime: 'Both'     },
  { section: '10(16)',         name: 'Scholarship for Education',                            limit: 'Fully exempt',                  category: 'Education',     regime: 'Both'     },
  { section: '54',             name: 'LTCG on Property reinvested in house',                 limit: 'Actual investment',             category: 'Capital Gains', regime: 'Both'     },
  { section: '54EC',           name: 'LTCG reinvested in 54EC Bonds',                        limit: '₹50,00,000',                    category: 'Capital Gains', regime: 'Both'     },
  { section: '54F',            name: 'LTCG on any asset reinvested in house',                limit: 'Proportionate',                 category: 'Capital Gains', regime: 'Both'     },
  { section: '112A',           name: 'LTCG on Equity — First ₹1.25L',                        limit: '₹1,25,000 (tax-free)',          category: 'Capital Gains', regime: 'Both'     },
  { section: '56(2)',          name: 'Marriage Gift Exemption',                              limit: 'Unlimited',                     category: 'Gift',          regime: 'Both'     },
  { section: '47(viic)',       name: 'SGB Maturity Capital Gain',                            limit: 'Fully exempt (8-yr maturity)',  category: 'Investment',    regime: 'Both'     },
  { section: '10(12B)',        name: 'NPS Tier-1 Withdrawal (60%)',                          limit: '60% of corpus exempt',          category: 'Retirement',    regime: 'Both'     },
  { section: 'Finance Act 25', name: 'Perquisite Cap ₹4L (Both Regimes)',                    limit: '₹4,00,000',                     category: 'Salary',        regime: 'Both'     },
  { section: 'Budget 25',      name: 'Two Self-Occupied Homes Exempt',                       limit: 'Both treated as self-occ',      category: 'Property',      regime: 'Both'     },
  { section: '10(1)',          name: 'Agricultural Income',                                  limit: 'Fully exempt',                  category: 'Special',       regime: 'Both'     },
];

const DISPLAY_FIELDS = [
  { key: 'gross_salary',            label: 'Annual Salary' },
  { key: 'bonus',                   label: 'Bonus' },
  { key: 'other_income',            label: 'Other Income' },
  { key: 'section_80c',             label: '80C Investments' },
  { key: 'section_80d',             label: '80D Health (Self)' },
  { key: 'section_80d_parents',     label: '80D Parents' },
  { key: 'nps_personal',            label: 'NPS 80CCD(1B)' },
  { key: 'employer_nps',            label: 'Employer NPS 80CCD(2)' },
  { key: 'hra_deduction',           label: 'HRA Exemption' },
  { key: 'home_loan_interest',      label: 'Home Loan Interest' },
  { key: 'education_loan_interest', label: 'Education Loan Interest' },
  { key: 'donations_80g',           label: '80G Donations' },
  { key: 'professional_tax',        label: 'Professional Tax' },
];

const CATEGORIES = ['All', 'Investment', 'Retirement', 'Health', 'Salary', 'Property',
  'Capital Gains', 'Education', 'Profession', 'Interest', 'Insurance', 'Gift', 'Donation', 'Special'];

const INR = (v) => (v && Number(v) > 0 ? `₹${Number(v).toLocaleString('en-IN')}` : '—');

const FIELD_INFO_TOPICS = {
  section_80c: '80C',
  section_80d: '80D',
  section_80d_parents: '80D_PARENTS',
  nps_personal: '80CCD_1B',
  employer_nps: '80CCD_2',
  hra_deduction: 'HRA',
  donations_80g: '80G',
};

const SECTION_INFO_TOPICS = {
  '80C': '80C',
  '80D': '80D',
  '80CCD(1B)': '80CCD_1B',
  '80CCD(2)': '80CCD_2',
  '10(13A)': 'HRA',
  '80G': '80G',
};

const getMappedValue = (profile, item) => {
  if (!profile) return 0;
  if (item.section === '80C') return Number(profile.section_80c || 0);
  if (item.section === '80CCD(1B)') return Number(profile.nps_personal || 0);
  if (item.section === '80CCD(2)') return Number(profile.employer_nps || 0);
  if (item.section === '80D' && item.name.includes('Parents')) return Number(profile.section_80d_parents || 0);
  if (item.section === '80D') return Number(profile.section_80d || 0);
  if (item.section === '10(13A)') return Number(profile.hra_deduction || 0);
  if (item.section === '24(b)') return Number(profile.home_loan_interest || 0);
  if (item.section === '80E') return Number(profile.education_loan_interest || 0);
  if (item.section === '80G') return Number(profile.donations_80g || 0);
  if (item.section === '16(iii)') return Number(profile.professional_tax || 0);
  return 0;
};

const renderFieldLabel = (field) => {
  const topic = FIELD_INFO_TOPICS[field.key];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span>{field.label}</span>
      {topic ? <TaxInfoTooltip topic={topic} /> : null}
    </span>
  );
};

const renderSectionTag = (section) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <Tag style={{ borderRadius: 8, background: '#EEF3F9', color: '#5B92E5', border: 'none', fontWeight: 700, fontSize: 10 }}>
      {section}
    </Tag>
    {SECTION_INFO_TOPICS[section] ? <TaxInfoTooltip topic={SECTION_INFO_TOPICS[section]} /> : null}
  </span>
);

export default function DeductionsExplorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [regimeFilter, setRegime] = useState('All');

  const [savedProfile, setSavedProfile] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let active = true;
    let timer;

    const loadProfile = async () => {
      if (authLoading) return;

      if (!user?.id) {
        if (active) setLoadingData(false);
        return;
      }

      try {
        timer = setTimeout(() => {
          if (active) setLoadingData(false);
        }, 5000);

        const profile = await getExistingProfile(user.id);
        if (!active) return;
        setSavedProfile(profile || {});
      } catch (error) {
        console.error('Failed to load deductions profile:', error);
        if (active) setSavedProfile({});
      } finally {
        if (active) setLoadingData(false);
        if (timer) clearTimeout(timer);
      }
    };

    setLoadingData(true);
    loadProfile();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [user?.id, authLoading]);

  const filtered = useMemo(() => {
    return ALL_DEDUCTIONS.filter((d) => {
      const matchSearch =
        d.section.toLowerCase().includes(search.toLowerCase()) ||
        d.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || d.category === category;
      const matchReg = regimeFilter === 'All' || d.regime === regimeFilter;
      return matchSearch && matchCat && matchReg;
    });
  }, [search, category, regimeFilter]);

  const claimed = useMemo(
    () => ALL_DEDUCTIONS.filter((d) => getMappedValue(savedProfile, d) > 0).length,
    [savedProfile]
  );

  const missing = useMemo(
    () => ALL_DEDUCTIONS.filter((d) => {
      const value = getMappedValue(savedProfile, d);
      return value === 0 && ['80C', '80CCD(1B)', '80CCD(2)', '80D', '10(13A)', '24(b)', '80E', '80G', '16(iii)'].includes(d.section);
    }).length,
    [savedProfile]
  );

  const columns = [
    {
      title: 'Section',
      dataIndex: 'section',
      width: 120,
      render: (value) => renderSectionTag(value),
    },
    {
      title: 'Deduction',
      dataIndex: 'name',
      render: (value) => <Text style={{ color: '#1A1A2E', fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: 'Limit',
      dataIndex: 'limit',
      width: 150,
      render: (value) => <Text strong style={{ color: '#08457E' }}>{value}</Text>,
    },
    {
      title: 'Regime',
      dataIndex: 'regime',
      width: 120,
      render: (value) => (
        <Tag color={value === 'Both' ? 'blue' : 'red'} style={{ borderRadius: 999, fontWeight: 600 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: 'Status',
      width: 130,
      render: (_, row) => {
        const value = getMappedValue(savedProfile, row);

        if (value > 0) {
          return (
            <Tag icon={<CheckCircleFilled />} color="success" style={{ borderRadius: 999 }}>
              Claimed
            </Tag>
          );
        }

        if (['80C', '80CCD(1B)', '80CCD(2)', '80D', '10(13A)', '24(b)', '80E', '80G', '16(iii)'].includes(row.section)) {
          return (
            <Tag icon={<CloseCircleFilled />} color="error" style={{ borderRadius: 999 }}>
              Missing
            </Tag>
          );
        }

        return (
          <Tag icon={<MinusCircleFilled />} color="default" style={{ borderRadius: 999 }}>
            Check
          </Tag>
        );
      },
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#5B92E5', borderRadius: 16, fontFamily: "'Outfit', sans-serif" } }}>
      <Layout style={{ minHeight: '100vh', background: '#F2F3F4' }}>
        <Navbar />
        <div style={{ padding: '32px 24px' }}>
          <Content style={{ maxWidth: '1220px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dashboard', { state: location.state })}
              style={{ marginBottom: 24, borderRadius: 12, fontWeight: 600, color: '#08457E' }}
            >
              Back to Dashboard
            </Button>

            <div style={{ marginBottom: 28 }}>
              <Title level={2} style={{ color: '#08457E', fontWeight: 800, margin: 0 }}>
                Deductions Explorer
              </Title>
              <Paragraph style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>
                All 50+ tax sections with your claim status. Your saved income and deduction values are shown on the right.
              </Paragraph>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
              {[
                { label: 'Total Sections', value: ALL_DEDUCTIONS.length, color: '#5B92E5' },
                { label: 'Claimed by You', value: claimed, color: '#059669' },
                { label: 'Potentially Missing', value: missing, color: '#DC2626' },
                { label: 'Both Regimes', value: ALL_DEDUCTIONS.filter(d => d.regime === 'Both').length, color: '#08457E' },
              ].map((s, i) => (
                <Col xs={12} md={6} key={i}>
                  <Card style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row gutter={[24, 24]}>
              <Col xs={24} xl={15}>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search section or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 210, borderRadius: 12 }}
                  />
                  <Select value={category} onChange={setCategory} style={{ width: 148 }}>
                    {CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                  </Select>
                  <Select value={regimeFilter} onChange={setRegime} style={{ width: 140 }}>
                    <Select.Option value="All">All Regimes</Select.Option>
                    <Select.Option value="Old Only">Old Only</Select.Option>
                    <Select.Option value="Both">Both Regimes</Select.Option>
                  </Select>
                </Space>

                <Card style={{ borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <Table
                    columns={columns}
                    dataSource={filtered.map((d, i) => ({ ...d, key: `${d.section}-${i}` }))}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    size="small"
                    scroll={{ x: 560 }}
                  />
                </Card>
              </Col>

              <Col xs={24} xl={9}>
                <Card
                  style={{ borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'sticky', top: 80 }}
                  styles={{ body: { padding: '18px 20px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text strong style={{ color: '#08457E', fontSize: 15 }}>Income & Deductions</Text>
                    <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>Saved Values</Tag>
                  </div>

                  {loadingData ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF' }}>Loading saved values...</div>
                  ) : (
                    <>
                      <Row style={{ borderBottom: '2px solid #F0F0F0', paddingBottom: 6, marginBottom: 4 }}>
                        <Col span={14}>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Field</Text>
                        </Col>
                        <Col span={10} style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Saved</Text>
                        </Col>
                      </Row>

                      {DISPLAY_FIELDS.map((field) => {
                        const value = savedProfile?.[field.key] ?? 0;
                        return (
                          <Row
                            key={field.key}
                            align="middle"
                            style={{ padding: '8px 4px', borderBottom: '1px solid #F5F5F5' }}
                          >
                            <Col span={14}>
                              <Text style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500, lineHeight: 1.3 }}>
                                {renderFieldLabel(field)}
                              </Text>
                            </Col>
                            <Col span={10} style={{ textAlign: 'right' }}>
                              <Text style={{ fontSize: 12, fontWeight: 600, color: value > 0 ? '#08457E' : '#D1D5DB' }}>
                                {INR(value)}
                              </Text>
                            </Col>
                          </Row>
                        );
                      })}

                      {!loadingData && savedProfile && Object.keys(savedProfile).length > 0 && (
                        <div style={{ marginTop: 14, background: '#F0FDF4', borderRadius: 10, padding: '10px 14px' }}>
                          <Text style={{ fontSize: 12, color: '#059669' }}>
                            These values are read directly from your saved profile and are shown here for reference.
                          </Text>
                        </div>
                      )}

                      {!loadingData && (!savedProfile || Object.keys(savedProfile).length === 0) && (
                        <div style={{ marginTop: 14, background: '#FEF2F2', borderRadius: 10, padding: '10px 14px' }}>
                          <Text style={{ fontSize: 12, color: '#DC2626' }}>
                            No saved income profile was found for this account yet.
                          </Text>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          </Content>
        </div>

        <style>{`
          .ant-table-tbody > tr > td { color: #1A1A2E; }
        `}</style>
      </Layout>
    </ConfigProvider>
  );
}
