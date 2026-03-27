import React, { useState, useEffect } from 'react';
import {
  ConfigProvider, Card, Typography, Form, Input, Select,
  Radio, Button, Alert, message, Row, Col, Avatar, Tag,
  InputNumber, Divider, Tabs
} from 'antd';
import {
  UserOutlined, SaveOutlined, ArrowLeftOutlined,
  EnvironmentOutlined, DollarOutlined, SafetyOutlined,
  CheckCircleFilled, SwapOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import Navbar from '../components/Navbar';

const { Title, Text, Paragraph } = Typography;

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh'
];

// ── Simple FY 2025-26 tax calculator (client-side for auto-suggest) ──
const calcNewRegimeTax = (income) => {
  if (income <= 400000)  return 0;
  if (income <= 800000)  return (income - 400000)  * 0.05;
  if (income <= 1200000) return 20000  + (income - 800000)  * 0.10;
  if (income <= 1600000) return 60000  + (income - 1200000) * 0.15;
  if (income <= 2000000) return 120000 + (income - 1600000) * 0.20;
  if (income <= 2400000) return 200000 + (income - 2000000) * 0.25;
  return                        300000 + (income - 2400000) * 0.30;
};

const calcOldRegimeTax = (income) => {
  if (income <= 250000)  return 0;
  if (income <= 500000)  return (income - 250000) * 0.05;
  if (income <= 1000000) return 12500  + (income - 500000)  * 0.20;
  return                        112500 + (income - 1000000) * 0.30;
};

const withCess = (tax) => tax + tax * 0.04;

const computeRegimes = (gross, bonus, other, c80, c80d, nps, hra, homeLoan) => {
  const totalIncome = (gross || 0) + (bonus || 0) + (other || 0);

  // Old regime deductions
  const stdOld = 50000;
  const d80c   = Math.min(c80  || 0, 150000);
  const d80d   = Math.min(c80d || 0, 25000);
  const dNPS   = Math.min(nps  || 0, 50000);
  const dHRA   = hra    || 0;
  const dHL    = Math.min(homeLoan || 0, 200000);
  const totalDeductions = stdOld + d80c + d80d + dNPS + dHRA + dHL;

  const oldTaxable = Math.max(totalIncome - totalDeductions, 0);
  let oldTax = calcOldRegimeTax(oldTaxable);
  if (oldTaxable <= 500000) oldTax = 0; // 87A rebate
  oldTax = withCess(oldTax);

  // New regime deductions
  const stdNew = 75000;
  const newTaxable = Math.max(totalIncome - stdNew, 0);
  let newTax = calcNewRegimeTax(newTaxable);
  if (newTaxable <= 1200000) newTax = 0; // 87A rebate 60K
  newTax = withCess(newTax);

  return {
    oldTax: Math.round(oldTax),
    newTax: Math.round(newTax),
    totalDeductions,
    totalIncome,
    oldTaxable: Math.round(oldTaxable),
    newTaxable:  Math.round(newTaxable),
  };
};

const fmt = v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const parse = v => v ? v.replace(/,/g, '') : '0';

const ProfilePage = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, userProfile, refreshProfile } = useAuth();

  const [personalForm] = Form.useForm();
  const [incomeForm]   = Form.useForm();
  const [saving,       setSaving]       = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [error,        setError]        = useState('');
  const [incomeError,  setIncomeError]  = useState('');
  const [regimeResult, setRegimeResult] = useState(null);

  // Where to go back — analysis form if came from there, else dashboard
  const backTo = location.state?.from || '/dashboard';

  const inputStyle = { borderRadius: 12, height: 48 };
  const labelStyle = { color: '#08457E', fontWeight: 600 };
  const cardStyle  = { borderRadius: 20, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: 24 };

  // Watch regime preference to show/hide auto-suggest panel
  const regimePref = Form.useWatch('regimePreference', incomeForm);

  useEffect(() => {
    const loadProfile = async () => {
      let profile = userProfile;
      if (!profile && user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        profile = data;
      }
      if (profile) {
        personalForm.setFieldsValue({
          name           : profile.name            || profile.full_name || '',
          age            : profile.age             || '',
          gender         : profile.gender          || '',
          marital_status : profile.marital_status  || '',
          employment_type: profile.employment_type || '',
          sector         : profile.sector          || '',
          profession     : profile.profession      || '',
          state          : profile.state           || '',
          city           : profile.city            || '',
        });
      }
      if (user) {
        const { data: inc } = await supabase.from('income_profile').select('*').eq('user_id', user.id).maybeSingle();
        if (inc) {
          incomeForm.setFieldsValue({
            annualSalary    : inc.gross_salary      || 0,
            bonus           : inc.bonus             || 0,
            otherIncome     : inc.other_income      || 0,
            deduction80C    : inc.section_80c       || 0,
            deduction80D    : inc.section_80d       || 0,
            deductionNPS    : inc.nps_personal      || 0,
            hraDeduction    : inc.hra_deduction     || inc.hra_received || 0,
            homeLoanInterest: inc.home_loan_interest || 0,
            professionalTax : inc.professional_tax  || 2500,
            regimePreference: inc.preferred_regime  || 'Auto Suggest',
          });

          // Compute auto-suggest on load if preference is Auto Suggest
          if ((inc.preferred_regime || 'Auto Suggest') === 'Auto Suggest') {
            const r = computeRegimes(inc.gross_salary, inc.bonus, inc.other_income,
              inc.section_80c, inc.section_80d, inc.nps_personal, inc.hra_deduction, inc.home_loan_interest);
            setRegimeResult(r);
          }
        }
      }
    };
    loadProfile();
  }, [user, userProfile]);

  // Recompute when regime or values change
  useEffect(() => {
    if (regimePref === 'Auto Suggest') {
      const v = incomeForm.getFieldsValue();
      const r = computeRegimes(v.annualSalary, v.bonus, v.otherIncome,
        v.deduction80C, v.deduction80D, v.deductionNPS, v.hraDeduction, v.homeLoanInterest);
      setRegimeResult(r);
    } else {
      setRegimeResult(null);
    }
  }, [regimePref]);

  // ── Save personal details ──
  const handleSavePersonal = async () => {
    try {
      setSaving(true);
      setError('');
      const values  = personalForm.getFieldsValue();
      const isMetro = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']
        .some(c => values.city?.toLowerCase().includes(c.toLowerCase()));

      const { error: err } = await supabase.from('users').upsert({
        id              : user.id,
        email           : user.email,
        name            : values.name,
        full_name       : values.name,
        age             : parseInt(values.age) || 0,
        gender          : values.gender,
        marital_status  : values.marital_status,
        employment_type : values.employment_type,
        sector          : values.sector,
        profession      : values.profession || '',
        state           : values.state,
        city            : values.city,
        is_metro        : isMetro,
        onboarding_done : true,
        onboarding_complete: true,
        updated_at      : new Date().toISOString(),
      }, { onConflict: 'id' });

      if (err) throw new Error(err.message);
      await refreshProfile();
      message.success('Personal details saved!');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // ── Save income & deductions ──
  const handleSaveIncome = async () => {
    try {
      setSavingIncome(true);
      setIncomeError('');
      const values = incomeForm.getFieldsValue();

      const base    = parseFloat(values.annualSalary) || 0;
      const bonus   = parseFloat(values.bonus)        || 0;
      const salary  = base + bonus;

      // Build payload — professional_tax column is now added via SQL migration
      const payload = {
        user_id          : user.id,
        gross_salary     : salary,
        basic_da         : salary * 0.40,
        hra_received     : salary * 0.20,
        bonus            : bonus,
        other_income     : parseFloat(values.otherIncome)      || 0,
        section_80c      : Math.min(parseFloat(values.deduction80C) || 0, 150000),
        section_80d      : Math.min(parseFloat(values.deduction80D) || 0, 25000),
        nps_personal     : Math.min(parseFloat(values.deductionNPS) || 0, 50000),
        hra_deduction    : parseFloat(values.hraDeduction)     || 0,
        home_loan_interest: Math.min(parseFloat(values.homeLoanInterest) || 0, 200000),
        professional_tax : parseFloat(values.professionalTax) || 0,
        preferred_regime : values.regimePreference || 'Auto Suggest',
        updated_at       : new Date().toISOString(),
      };

      const { error: err } = await supabase.from('income_profile').upsert(payload, { onConflict: 'user_id' });
      if (err) throw new Error(err.message);

      // Recompute auto-suggest
      if (values.regimePreference === 'Auto Suggest') {
        const r = computeRegimes(base, bonus, values.otherIncome,
          values.deduction80C, values.deduction80D, values.deductionNPS, values.hraDeduction, values.homeLoanInterest);
        setRegimeResult(r);
      }

      message.success('Income & deductions saved! All features are now updated.');
    } catch (err) { setIncomeError(err.message); }
    finally { setSavingIncome(false); }
  };

  // ── Auto-suggest regime panel ──
  const RegimeSuggestion = () => {
    if (!regimeResult) return null;
    const { oldTax, newTax, totalDeductions, totalIncome } = regimeResult;
    const suggested  = oldTax < newTax ? 'Old Regime' : 'New Regime';
    const savings    = Math.abs(oldTax - newTax);
    const explanation = oldTax < newTax
      ? `Old Regime is better because you have claimed higher deductions of ₹${totalDeductions.toLocaleString('en-IN')}, which reduces your taxable income significantly.`
      : `New Regime is better because your deductions are relatively low, so lower slab rates result in less tax compared to the Old Regime.`;

    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SwapOutlined style={{ color: '#5B92E5', fontSize: 18 }} />
          <Text strong style={{ color: '#08457E', fontSize: 15 }}>Auto-Suggest Result</Text>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <div style={{ background: '#F2F3F4', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>TOTAL INCOME</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#08457E' }}>₹{totalIncome.toLocaleString('en-IN')}</div>
            </div>
          </Col>
          <Col xs={12} sm={8}>
            <div style={{ background: oldTax < newTax ? '#F0FDF4' : '#F2F3F4', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: oldTax < newTax ? '2px solid #059669' : 'none' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>OLD REGIME TAX</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: oldTax < newTax ? '#059669' : '#6B7280' }}>₹{oldTax.toLocaleString('en-IN')}</div>
              {oldTax < newTax && <div style={{ fontSize: 10, color: '#059669', marginTop: 2, fontWeight: 600 }}>RECOMMENDED</div>}
            </div>
          </Col>
          <Col xs={12} sm={8}>
            <div style={{ background: newTax <= oldTax ? '#F0FDF4' : '#F2F3F4', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: newTax <= oldTax ? '2px solid #059669' : 'none' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>NEW REGIME TAX</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: newTax <= oldTax ? '#059669' : '#6B7280' }}>₹{newTax.toLocaleString('en-IN')}</div>
              {newTax <= oldTax && <div style={{ fontSize: 10, color: '#059669', marginTop: 2, fontWeight: 600 }}>RECOMMENDED</div>}
            </div>
          </Col>
        </Row>

        <div style={{ background: savings > 0 ? '#F0FDF4' : '#F2F3F4', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
          {savings > 0 ? (
            <Text style={{ color: '#059669', fontWeight: 600, fontSize: 14 }}>
              <CheckCircleFilled style={{ marginRight: 6 }} />
              You save ₹{savings.toLocaleString('en-IN')} by choosing {suggested}
            </Text>
          ) : (
            <Text style={{ color: '#6B7280', fontSize: 14 }}>Both regimes result in the same tax for your income profile.</Text>
          )}
        </div>

        <Text style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>{explanation}</Text>

        {totalDeductions > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>
            Total deductions claimed (Old Regime): ₹{totalDeductions.toLocaleString('en-IN')}
          </div>
        )}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'personal',
      label: <span><UserOutlined /> Personal Details</span>,
      children: (
        <Card style={cardStyle}>
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 12 }} />}
          <Form form={personalForm} layout="vertical" requiredMark={false}>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label={<Text style={labelStyle}>Full Name</Text>} rules={[{ required: true }]}>
                  <Input style={inputStyle} prefix={<UserOutlined style={{ color: '#6B7280' }} />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="age" label={<Text style={labelStyle}>Age</Text>} rules={[{ required: true }]}>
                  <Input style={inputStyle} type="number" min={18} max={100} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="gender" label={<Text style={labelStyle}>Gender</Text>} rules={[{ required: true }]}>
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="Male">Male</Radio.Button>
                    <Radio.Button value="Female">Female</Radio.Button>
                    <Radio.Button value="Other">Other</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="marital_status" label={<Text style={labelStyle}>Marital Status</Text>} rules={[{ required: true }]}>
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="Single">Single</Radio.Button>
                    <Radio.Button value="Married">Married</Radio.Button>
                    <Radio.Button value="Divorced">Divorced</Radio.Button>
                    <Radio.Button value="Widowed">Widowed</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="employment_type" label={<Text style={labelStyle}>Employment Type</Text>} rules={[{ required: true }]}>
                  <Select size="large">
                    {['Salaried','Self-Employed','Freelancer','Business Owner','Student','Retired','Government']
                      .map(v => <Select.Option key={v} value={v}>{v}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="sector" label={<Text style={labelStyle}>Sector</Text>} rules={[{ required: true }]}>
                  <Select size="large" placeholder="Select sector">
                    {['IT/Software','Banking/Finance','Government','Healthcare','Education','Manufacturing','Real Estate','Other']
                      .map(v => <Select.Option key={v} value={v}>{v}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="profession" label={<Text style={labelStyle}>Job Title (Optional)</Text>}>
                  <Input style={inputStyle} placeholder="e.g. Software Engineer" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="state" label={<Text style={labelStyle}>State</Text>} rules={[{ required: true }]}>
                  <Select size="large" showSearch placeholder="Select state">
                    {STATES.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="city" label={<Text style={labelStyle}>City</Text>} rules={[{ required: true }]}>
                  <Input style={inputStyle} prefix={<EnvironmentOutlined style={{ color: '#6B7280' }} />} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSavePersonal}
              style={{ height: 48, borderRadius: 12, background: '#08457E', border: 'none', fontWeight: 600, marginTop: 8 }}>
              Save Personal Details
            </Button>
          </Form>
        </Card>
      )
    },
    {
      key: 'income',
      label: <span><DollarOutlined /> Income & Deductions</span>,
      children: (
        <Card style={cardStyle}>
          <Alert
            message="These values are used across all features — Regime Comparison, Tax Leakage, Health Score, Recommendations. Update them here anytime."
            type="info" showIcon style={{ marginBottom: 24, borderRadius: 12 }}
          />
          {incomeError && <Alert message={incomeError} type="error" showIcon style={{ marginBottom: 24, borderRadius: 12 }} />}

          <Form form={incomeForm} layout="vertical" requiredMark={false}>

            <Title level={5} style={{ color: '#08457E', marginBottom: 16 }}>Annual Income</Title>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="annualSalary" label={<Text style={labelStyle}>Gross Annual Salary (₹) *</Text>}
                  rules={[{ required: true, message: 'Please enter salary' }, { validator: (_, v) => (v ?? 0) >= 0 ? Promise.resolve() : Promise.reject('Must be positive') }]}>
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} placeholder="e.g. 1200000" formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="bonus" label={<Text style={labelStyle}>Bonus (₹)</Text>}>
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} placeholder="e.g. 100000" formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="otherIncome" label={<Text style={labelStyle}>Other Income (₹)</Text>}>
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} placeholder="Rent, interest, freelance" formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                {/* Issue #7: Tax Regime with Auto Suggest explanation */}
                <Form.Item name="regimePreference" label={<Text style={labelStyle}>Tax Regime Preference</Text>}
                  extra="Auto Suggest compares both regimes and recommends the one with lower tax based on your deductions.">
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="Auto Suggest">Auto Suggest</Radio.Button>
                    <Radio.Button value="Old Regime">Old Regime</Radio.Button>
                    <Radio.Button value="New Regime">New Regime</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            {/* Auto-suggest live result — only when Auto Suggest is selected */}
            {regimePref === 'Auto Suggest' && <RegimeSuggestion />}

            <Divider style={{ margin: '28px 0 20px' }} />
            <Title level={5} style={{ color: '#08457E', marginBottom: 4 }}>Deductions (Old Regime)</Title>
            <Text style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 16 }}>
              Leave blank if you don't claim them. All limits are automatically enforced.
            </Text>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="deduction80C" label={<Text style={labelStyle}>80C Investments (₹)</Text>} extra="PPF, ELSS, LIC — Max ₹1,50,000">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} max={150000} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="deduction80D" label={<Text style={labelStyle}>80D Health Premium (₹)</Text>} extra="Self + family — Max ₹25,000">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} max={50000} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="deductionNPS" label={<Text style={labelStyle}>NPS 80CCD(1B) (₹)</Text>} extra="Extra beyond 80C — Max ₹50,000">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} max={50000} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="hraDeduction" label={<Text style={labelStyle}>HRA Exemption (₹)</Text>} extra="Only if you pay rent and receive HRA">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="homeLoanInterest" label={<Text style={labelStyle}>Home Loan Interest 24(b) (₹)</Text>} extra="Max ₹2,00,000 for self-occupied">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} max={200000} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="professionalTax" label={<Text style={labelStyle}>Professional Tax (₹)</Text>} extra="Usually ₹2,500 for salaried">
                  <InputNumber style={{ ...inputStyle, width: '100%' }} prefix="₹" min={0} max={2500} formatter={fmt} parser={parse} />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" icon={<SaveOutlined />} loading={savingIncome} onClick={handleSaveIncome}
              style={{ height: 48, borderRadius: 12, background: '#5B92E5', border: 'none', fontWeight: 600, marginTop: 8 }}>
              Save Income & Deductions
            </Button>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <ConfigProvider theme={{
      token: { colorPrimary: '#5B92E5', borderRadius: 12, fontFamily: "'Outfit', sans-serif" },
      components: {
        Input: { colorBgContainer: '#FFFFFF', colorBorder: '#E5E7EB', colorText: '#1A1A2E' },
        InputNumber: { colorBgContainer: '#FFFFFF', colorBorder: '#E5E7EB', colorText: '#1A1A2E' },
        Card: { paddingLG: 32, borderRadiusLG: 20 }
      }
    }}>
      <div style={{ minHeight: '100vh', background: '#F2F3F4' }}>
        <Navbar />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

          {/* ── Issue #5: Arrow back to analysis (not dashboard) ── */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backTo)}
            style={{ marginBottom: 24, borderRadius: 12, color: '#5B92E5', borderColor: '#B8C8E6' }}
          >
            {backTo === '/analysis' || backTo.includes('analysis') ? 'Back to Analysis' : 'Back'}
          </Button>

          {/* Avatar header */}
          <Card style={{ ...cardStyle, background: '#08457E' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar size={64} style={{ background: '#5B92E5', fontSize: 28 }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <Title level={4} style={{ color: '#FFFFFF', margin: 0 }}>
                  {userProfile?.name || userProfile?.full_name || user?.email}
                </Title>
                <Text style={{ color: '#CCF1FF', fontSize: 13 }}>{user?.email}</Text>
                <div style={{ marginTop: 8 }}>
                  {userProfile?.employment_type && <Tag color="blue">{userProfile.employment_type}</Tag>}
                  {userProfile?.sector         && <Tag color="cyan">{userProfile.sector}</Tag>}
                  {userProfile?.city           && <Tag color="geekblue">{userProfile.city}</Tag>}
                </div>
              </div>
            </div>
          </Card>

          <Tabs items={tabItems} defaultActiveKey="personal" size="large" style={{ background: 'transparent' }} />

        </div>
      </div>

      <style>{`
        input, .ant-input, .ant-input-number-input {
          background-color: #FFFFFF !important;
          color: #1A1A2E !important;
          border: 1px solid #E5E7EB !important;
          opacity: 1 !important;
          cursor: text !important;
        }
        input:focus, .ant-input:focus, .ant-input-number-focused {
          border-color: #1B3A6B !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default ProfilePage;
