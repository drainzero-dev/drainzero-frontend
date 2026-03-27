import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import {
  Layout, Typography, Card, Table, Tag, Input,
  Space, Button, ConfigProvider, Select, Row, Col,
  InputNumber, Divider, message
} from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined,
  CheckCircleFilled, CloseCircleFilled, MinusCircleFilled,
  SaveOutlined, EditOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getExistingProfile, saveIncomeProfile } from '../../services/profileService';

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
  { section: '80DD',           name: 'Disabled Dependent Medical Expenses',                 limit: '₹75,000 / ₹1,25,000 (severe)',  category: 'Health',        regime: 'Old Only' },
  { section: '80DDB',          name: 'Treatment of Specified Diseases',                     limit: '₹40,000 / ₹1,00,000 (senior)',  category: 'Health',        regime: 'Old Only' },
  { section: '80E',            name: 'Education Loan Interest',                             limit: 'Unlimited (8 years)',            category: 'Education',     regime: 'Old Only' },
  { section: '80EEB',          name: 'Electric Vehicle Loan Interest',                      limit: '₹1,50,000',                     category: 'Vehicle',       regime: 'Both'     },
  { section: '80G',            name: 'Donations to Approved Funds / Charities',             limit: '50% or 100% of donation',       category: 'Donation',      regime: 'Old Only' },
  { section: '80GG',           name: 'Rent Paid (no HRA in salary)',                        limit: '₹60,000/yr',                    category: 'Rent',          regime: 'Old Only' },
  { section: '80QQB',          name: 'Royalty from Books (Author)',                         limit: '₹3,00,000',                     category: 'Profession',    regime: 'Old Only' },
  { section: '80RRB',          name: 'Patent Royalty Income',                               limit: '₹3,00,000',                     category: 'Profession',    regime: 'Old Only' },
  { section: '80TTA',          name: 'Savings Account Interest',                            limit: '₹10,000',                       category: 'Interest',      regime: 'Old Only' },
  { section: '80TTB',          name: 'Interest Income (Senior Citizens)',                   limit: '₹50,000',                       category: 'Interest',      regime: 'Old Only' },
  { section: '80U',            name: 'Self with Disability',                                limit: '₹75,000 / ₹1,25,000 (severe)',  category: 'Health',        regime: 'Old Only' },
  { section: '24(b)',          name: 'Home Loan Interest (Self-Occupied)',                   limit: '₹2,00,000',                     category: 'Property',      regime: 'Old Only' },
  { section: '24(b)',          name: 'Home Loan Interest (Let-Out)',                         limit: 'Unlimited (capped set-off)',     category: 'Property',      regime: 'Old Only' },
  { section: '10(13A)',        name: 'HRA Exemption',                                        limit: 'Least of 3 formulas',           category: 'Salary',        regime: 'Old Only' },
  { section: '16(ia)',         name: 'Standard Deduction (Salaried)',                        limit: '₹75,000 (New) / ₹50,000 (Old)', category: 'Salary',        regime: 'Both'     },
  { section: '16(iii)',        name: 'Professional Tax',                                     limit: 'Actual paid',                   category: 'Salary',        regime: 'Old Only' },
  { section: '10(10D)',        name: 'Life Insurance Maturity Proceeds',                    limit: 'Exempt (conditions)',            category: 'Insurance',     regime: 'Both'     },
  { section: '10(10)',         name: 'Gratuity Exemption',                                   limit: '₹20,00,000',                    category: 'Salary',        regime: 'Both'     },
  { section: '10(11)',         name: 'PPF Maturity & Interest',                              limit: 'Fully exempt',                  category: 'Investment',    regime: 'Both'     },
  { section: '10(16)',         name: 'Scholarship for Education',                            limit: 'Fully exempt',                  category: 'Education',     regime: 'Both'     },
  { section: '54',             name: 'LTCG on Property reinvested in house',                limit: 'Actual investment',             category: 'Capital Gains', regime: 'Both'     },
  { section: '54EC',           name: 'LTCG reinvested in 54EC Bonds',                       limit: '₹50,00,000',                    category: 'Capital Gains', regime: 'Both'     },
  { section: '54F',            name: 'LTCG on any asset reinvested in house',               limit: 'Proportionate',                 category: 'Capital Gains', regime: 'Both'     },
  { section: '112A',           name: 'LTCG on Equity — First ₹1.25L',                      limit: '₹1,25,000 (tax-free)',          category: 'Capital Gains', regime: 'Both'     },
  { section: '56(2)',          name: 'Marriage Gift Exemption',                              limit: 'Unlimited',                     category: 'Gift',          regime: 'Both'     },
  { section: '47(viic)',       name: 'SGB Maturity Capital Gain',                            limit: 'Fully exempt (8-yr maturity)',  category: 'Investment',    regime: 'Both'     },
  { section: '10(12B)',        name: 'NPS Tier-1 Withdrawal (60%)',                          limit: '60% of corpus exempt',          category: 'Retirement',    regime: 'Both'     },
  { section: 'Finance Act 25', name: 'Perquisite Cap ₹4L (Both Regimes)',                   limit: '₹4,00,000',                     category: 'Salary',        regime: 'Both'     },
  { section: 'Budget 25',      name: 'Two Self-Occupied Homes Exempt',                      limit: 'Both treated as self-occ',      category: 'Property',      regime: 'Both'     },
  { section: '10(1)',          name: 'Agricultural Income',                                  limit: 'Fully exempt',                  category: 'Special',       regime: 'Both'     },
];

// Right-panel editable fields — saved DB value shown left, new input on right
const EDITABLE_FIELDS = [
  { key: 'gross_salary',            label: 'Annual Salary',         max: null,   placeholder: 'e.g. 1200000'  },
  { key: 'bonus',                   label: 'Bonus',                 max: null,   placeholder: 'e.g. 100000'   },
  { key: 'other_income',            label: 'Other Income',          max: null,   placeholder: 'e.g. 50000'    },
  { key: 'section_80c',             label: '80C Investments',       max: 150000, placeholder: 'Max ₹1,50,000' },
  { key: 'section_80d',             label: '80D Health (Self)',      max: 50000,  placeholder: 'Max ₹25,000'   },
  { key: 'section_80d_parents',     label: '80D Parents',           max: 50000,  placeholder: 'Max ₹50,000'   },
  { key: 'nps_personal',            label: 'NPS 80CCD(1B)',         max: 50000,  placeholder: 'Max ₹50,000'   },
  { key: 'hra_deduction',           label: 'HRA Exemption',         max: null,   placeholder: 'Rent-based'    },
  { key: 'home_loan_interest',      label: 'Home Loan Interest',    max: 200000, placeholder: 'Max ₹2,00,000' },
  { key: 'education_loan_interest', label: 'Education Loan Int.',   max: null,   placeholder: 'No limit'      },
  { key: 'donations_80g',           label: '80G Donations',         max: null,   placeholder: 'Amount donated' },
  { key: 'professional_tax',        label: 'Professional Tax',      max: 2500,   placeholder: 'e.g. 2500'     },
];

const CATEGORIES = ['All', 'Investment', 'Retirement', 'Health', 'Salary', 'Property',
  'Capital Gains', 'Education', 'Profession', 'Interest', 'Insurance', 'Gift', 'Donation', 'Special'];

const INR  = (v) => (v && Number(v) > 0) ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
const fmt  = v  => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
const parse = v => v ? v.replace(/,/g, '') : '0';

const DeductionsExplorer = () => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { user }        = useAuth();

  const [search,        setSearch]       = useState('');
  const [category,      setCategory]     = useState('All');
  const [regimeFilter,  setRegime]       = useState('All');
  const [savedProfile,  setSavedProfile] = useState(null);
  const [newValues,     setNewValues]    = useState({});
  const [saving,        setSaving]       = useState(false);
  const [loadingData,   setLoadingData]  = useState(true);
  const [editMode,      setEditMode]     = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoadingData(false); return; }
      try {
        const p = await getExistingProfile(user.id);
        if (p) {
          setSavedProfile(p);
          const init = {};
          EDITABLE_FIELDS.forEach(f => { init[f.key] = p[f.key] ?? 0; });
          setNewValues(init);
        }
      } catch (e) { console.error(e); }
      finally { setLoadingData(false); }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) { message.error('Please login to save.'); return; }
    setSaving(true);
    try {
      // Enforce deduction limits before saving
      const sanitized = { ...newValues };
      sanitized.section_80c        = Math.min(sanitized.section_80c        || 0, 150000);
      sanitized.section_80d        = Math.min(sanitized.section_80d        || 0, 50000);
      sanitized.section_80d_parents= Math.min(sanitized.section_80d_parents|| 0, 50000);
      sanitized.nps_personal       = Math.min(sanitized.nps_personal       || 0, 50000);
      sanitized.home_loan_interest = Math.min(sanitized.home_loan_interest  || 0, 200000);
      sanitized.professional_tax   = Math.min(sanitized.professional_tax    || 0, 2500);
      sanitized.updated_at = new Date().toISOString();

      await saveIncomeProfile(user.id, sanitized);
      setSavedProfile(prev => ({ ...prev, ...sanitized }));
      setNewValues(sanitized);
      message.success('Profile updated! All features will use these new values.');
      setEditMode(false);
    } catch (e) {
      message.error('Save failed: ' + e.message);
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (savedProfile) {
      const reset = {};
      EDITABLE_FIELDS.forEach(f => { reset[f.key] = savedProfile[f.key] ?? 0; });
      setNewValues(reset);
    }
    setEditMode(false);
  };

  // Status based on saved DB values
  const getStatus = (d) => {
    const p = savedProfile;
    if (!p) return 'Check';
    const regime = (p.preferred_regime || '').toLowerCase();
    if (d.regime === 'Old Only' && regime === 'new') return 'NA';
    if (d.section === '80C')       return (p.section_80c || 0) >= 150000 ? 'Claimed' : (p.section_80c || 0) > 0 ? 'Partial' : 'Missing';
    if (d.section === '80D' && d.name.includes('Parent')) return (p.section_80d_parents || 0) > 0 ? 'Claimed' : 'Check';
    if (d.section === '80D')       return (p.section_80d || 0) > 0 ? 'Claimed' : 'Missing';
    if (d.section === '80CCD(1B)') return (p.nps_personal || 0) >= 50000 ? 'Claimed' : (p.nps_personal || 0) > 0 ? 'Partial' : 'Missing';
    if (d.section === '10(13A)')   return (p.hra_deduction || 0) > 0 ? 'Claimed' : (p.gross_salary || 0) > 0 ? 'Missing' : 'Check';
    if (d.section === '16(ia)')    return 'Claimed';
    if (d.section === '24(b)' && d.name.includes('Self')) return (p.home_loan_interest || 0) > 0 ? 'Claimed' : 'Check';
    if (d.section === '80E')       return (p.education_loan_interest || 0) > 0 ? 'Claimed' : 'Check';
    if (d.section === '80G')       return (p.donations_80g || 0) > 0 ? 'Claimed' : 'Check';
    if (d.section === '16(iii)')   return (p.professional_tax || 0) > 0 ? 'Claimed' : 'Check';
    if (d.regime === 'Old Only')   return 'Check';
    return 'Check';
  };

  const S = {
    Claimed: { color: '#059669', bg: '#F0FDF4', icon: <CheckCircleFilled style={{ color: '#059669' }} />, label: 'Claimed' },
    Partial: { color: '#D97706', bg: '#FFF7ED', icon: <MinusCircleFilled style={{ color: '#D97706' }} />, label: 'Partial' },
    Missing: { color: '#DC2626', bg: '#FEF2F2', icon: <CloseCircleFilled style={{ color: '#DC2626' }} />, label: 'Missing' },
    NA:      { color: '#6B7280', bg: '#F2F3F4', icon: <MinusCircleFilled style={{ color: '#6B7280' }} />, label: 'N/A'     },
    Check:   { color: '#5B92E5', bg: '#EEF3F9', icon: <MinusCircleFilled style={{ color: '#08457E' }} />, label: 'Check'   },
  };

  const filtered = ALL_DEDUCTIONS.filter(d => {
    const ms = d.name.toLowerCase().includes(search.toLowerCase()) || d.section.toLowerCase().includes(search.toLowerCase());
    const mc = category === 'All' || d.category === category;
    const mr = regimeFilter === 'All' || d.regime === regimeFilter || d.regime === 'Both';
    return ms && mc && mr;
  });

  const claimed    = filtered.filter(d => getStatus(d) === 'Claimed').length;
  const missing    = filtered.filter(d => getStatus(d) === 'Missing').length;
  const hasChanges = EDITABLE_FIELDS.some(f => (newValues[f.key] ?? 0) !== (savedProfile?.[f.key] ?? 0));

  const columns = [
    { title: 'Section', dataIndex: 'section', key: 'section', width: 110,
      render: v => <Tag style={{ borderRadius: 8, background: '#EEF3F9', color: '#5B92E5', border: 'none', fontWeight: 700, fontSize: 10 }}>{v}</Tag> },
    { title: 'Deduction', dataIndex: 'name', key: 'name',
      render: v => <Text style={{ fontSize: 12, color: '#1A1A2E' }}>{v}</Text> },
    { title: 'Limit', dataIndex: 'limit', key: 'limit', width: 160,
      render: v => <Text strong style={{ color: '#08457E', fontSize: 11 }}>{v}</Text> },
    { title: 'Regime', dataIndex: 'regime', key: 'regime', width: 85,
      render: v => <Tag style={{ borderRadius: 20, fontSize: 10, background: v === 'Both' ? '#F0FDF4' : '#FEF2F2', color: v === 'Both' ? '#059669' : '#DC2626', border: 'none' }}>{v}</Tag> },
    { title: 'Status', key: 'status', width: 90,
      render: (_, row) => {
        const st = getStatus(row);
        const c = S[st];
        return <Tag style={{ borderRadius: 20, background: c.bg, color: c.color, border: 'none', fontSize: 10, whiteSpace: 'nowrap' }}>{c.icon} {c.label}</Tag>;
      }
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#5B92E5', borderRadius: 16, fontFamily: "'Outfit', sans-serif" } }}>
      <Layout style={{ minHeight: '100vh', background: '#F2F3F4' }}>
        <Navbar />
        <div style={{ padding: '32px 24px' }}>
          <Content style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>

            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard', { state: location.state })}
              style={{ marginBottom: 24, borderRadius: 12, fontWeight: 600, color: '#08457E' }}>
              Back to Dashboard
            </Button>

            <div style={{ marginBottom: 28 }}>
              <Title level={2} style={{ color: '#08457E', fontWeight: 800, margin: 0 }}>Deductions Explorer</Title>
              <Paragraph style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>
                All 50+ tax sections with your claim status. Edit your values on the right — changes apply across all features instantly.
              </Paragraph>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
              {[
                { label: 'Total Sections',      value: ALL_DEDUCTIONS.length, color: '#5B92E5' },
                { label: 'Claimed by You',       value: claimed,               color: '#059669' },
                { label: 'Potentially Missing',  value: missing,               color: '#DC2626' },
                { label: 'Both Regimes',         value: ALL_DEDUCTIONS.filter(d => d.regime === 'Both').length, color: '#08457E' },
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

              {/* ── LEFT: Table ── */}
              <Col xs={24} xl={15}>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input prefix={<SearchOutlined />} placeholder="Search section or name..." value={search}
                    onChange={e => setSearch(e.target.value)} style={{ width: 210, borderRadius: 12 }} />
                  <Select value={category} onChange={setCategory} style={{ width: 148 }}>
                    {CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                  </Select>
                  <Select value={regimeFilter} onChange={setRegime} style={{ width: 128 }}>
                    <Select.Option value="All">All Regimes</Select.Option>
                    <Select.Option value="Old Only">Old Only</Select.Option>
                    <Select.Option value="Both">Both Regimes</Select.Option>
                  </Select>
                </Space>

                <Card style={{ borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <Table columns={columns} dataSource={filtered.map((d, i) => ({ ...d, key: i }))}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    size="small" scroll={{ x: 560 }} />
                </Card>
              </Col>

              {/* ── RIGHT: Old vs New values ── */}
              <Col xs={24} xl={9}>
                <Card style={{ borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'sticky', top: 80 }}
                  styles={{ body: { padding: '18px 20px' } }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text strong style={{ color: '#08457E', fontSize: 15 }}>Income & Deductions</Text>
                    <Button size="small"
                      icon={editMode ? <ReloadOutlined /> : <EditOutlined />}
                      onClick={() => editMode ? handleCancel() : setEditMode(true)}
                      type={editMode ? 'default' : 'primary'} ghost={editMode}
                      style={{ borderRadius: 10, fontSize: 12, ...(editMode ? { color: '#EF4444', borderColor: '#EF4444' } : {}) }}>
                      {editMode ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>

                  {loadingData ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF' }}>Loading your profile...</div>
                  ) : (
                    <>
                      {/* Column labels */}
                      <Row style={{ borderBottom: '2px solid #F0F0F0', paddingBottom: 6, marginBottom: 4 }}>
                        <Col span={10}>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Field</Text>
                        </Col>
                        <Col span={6} style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Saved</Text>
                        </Col>
                        <Col span={8} style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, color: editMode ? '#5B92E5' : '#9CA3AF' }}>
                            {editMode ? 'New Value' : 'Current'}
                          </Text>
                        </Col>
                      </Row>

                      {/* Data rows */}
                      {EDITABLE_FIELDS.map(f => {
                        const oldVal = savedProfile?.[f.key] ?? 0;
                        const newVal = newValues[f.key] ?? 0;
                        const changed = editMode && newVal !== oldVal;

                        return (
                          <Row key={f.key} align="middle" style={{
                            padding: '8px 4px', borderBottom: '1px solid #F5F5F5',
                            borderRadius: 6, background: changed ? '#FFFBEB' : 'transparent',
                            transition: 'background 0.2s',
                          }}>
                            <Col span={10}>
                              <Text style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500, lineHeight: 1.3 }}>{f.label}</Text>
                            </Col>
                            {/* Saved (old) */}
                            <Col span={6} style={{ textAlign: 'right' }}>
                              <Text style={{ fontSize: 12, fontWeight: 600, color: oldVal > 0 ? '#059669' : '#D1D5DB' }}>{INR(oldVal)}</Text>
                            </Col>
                            {/* New input or display */}
                            <Col span={8} style={{ textAlign: 'right', paddingLeft: 4 }}>
                              {editMode ? (
                                <InputNumber
                                  size="small" value={newVal || undefined} placeholder="0"
                                  min={0} max={f.max ?? undefined}
                                  onChange={v => setNewValues(prev => ({ ...prev, [f.key]: v ?? 0 }))}
                                  formatter={fmt} parser={parse}
                                  style={{ width: '100%', fontSize: 12, borderRadius: 8, borderColor: changed ? '#5B92E5' : '#E5E7EB', background: changed ? '#EFF6FF' : '#FFFFFF' }}
                                />
                              ) : (
                                <Text style={{ fontSize: 12, fontWeight: 600, color: newVal > 0 ? '#08457E' : '#D1D5DB' }}>{INR(newVal)}</Text>
                              )}
                            </Col>
                          </Row>
                        );
                      })}

                      {/* Save area */}
                      {editMode && (
                        <>
                          <Divider style={{ margin: '14px 0 10px' }} />
                          {hasChanges && (
                            <div style={{ background: '#EEF3FA', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                              <Text style={{ fontSize: 12, color: '#08457E' }}>
                                Yellow rows have unsaved changes. Deduction limits are enforced on save.
                              </Text>
                            </div>
                          )}
                          <Button type="primary" block icon={<SaveOutlined />} loading={saving} onClick={handleSave} disabled={!hasChanges}
                            style={{ borderRadius: 12, height: 44, background: '#5B92E5', border: 'none', fontWeight: 600, fontSize: 14 }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      )}

                      {!editMode && savedProfile && (
                        <div style={{ marginTop: 14, background: '#F0FDF4', borderRadius: 10, padding: '10px 14px' }}>
                          <Text style={{ fontSize: 12, color: '#059669' }}>
                            Click Edit to update values. The Status column in the table refreshes automatically.
                          </Text>
                        </div>
                      )}

                      {!savedProfile && !loadingData && (
                        <div style={{ marginTop: 14, background: '#FEF2F2', borderRadius: 10, padding: '10px 14px' }}>
                          <Text style={{ fontSize: 12, color: '#DC2626' }}>
                            No profile found. Complete onboarding first to enable editing.
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
          .ant-input-number-input { background: #FFFFFF !important; color: #1A1A2E !important; }
          .ant-table-tbody > tr > td { color: #1A1A2E; }
        `}</style>
      </Layout>
    </ConfigProvider>
  );
};

export default DeductionsExplorer;
