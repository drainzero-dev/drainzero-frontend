import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const TOPIC_MAP = {
  '80C': {
    title: 'Section 80C',
    body: 'Old-regime deduction for eligible investments like PPF, EPF, ELSS, LIC, NSC, tuition fees, and home-loan principal. The combined cap with Sections 80CCC and 80CCD(1) is ₹1,50,000.'
  },
  '80D': {
    title: 'Section 80D',
    body: 'Old-regime deduction for health insurance and preventive health check-ups. Self/spouse/dependent children: ₹25,000, or ₹50,000 if any covered person is a senior citizen. Preventive health check-up up to ₹5,000 is included within the overall limit.'
  },
  '80D_PARENTS': {
    title: 'Section 80D for Parents',
    body: 'Separate deduction for parents' health insurance. ₹25,000, or ₹50,000 if either parent covered is a senior citizen. Preventive health check-up up to ₹5,000 is included within the overall limit.'
  },
  '80CCD_1B': {
    title: 'Section 80CCD(1B)',
    body: 'Additional deduction up to ₹50,000 for your own Tier-1 NPS contribution. This is over and above the usual 80C basket.'
  },
  '80CCD_2': {
    title: 'Section 80CCD(2)',
    body: 'Deduction for employer contribution to Tier-1 NPS. It is separate from your personal 80C / 80CCD(1B) limits. Broadly, it can be claimed up to 10% of salary in most cases, or 14% in government / eligible new-regime cases.'
  },
  'HRA': {
    title: 'HRA Exemption',
    body: 'Available only for salaried people receiving HRA, generally under the old regime. Exemption is the least of actual HRA received, rent paid minus 10% of salary, or 50% of salary for metro cities / 40% otherwise.'
  },
  '80G': {
    title: 'Section 80G',
    body: 'Deduction for eligible donations to approved funds and institutions. The exact deductible amount depends on the recipient and the applicable percentage / qualifying limit.'
  }
};

export default function TaxInfoTooltip({ topic, size = 14, style = {} }) {
  const info = TOPIC_MAP[topic];
  if (!info) return null;

  return (
    <Tooltip
      trigger={['hover', 'click']}
      placement="top"
      overlayStyle={{ maxWidth: 340 }}
      title={
        <div style={{ lineHeight: 1.45 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{info.title}</div>
          <div style={{ fontSize: 12 }}>{info.body}</div>
        </div>
      }
    >
      <InfoCircleOutlined
        style={{
          color: '#5B92E5',
          fontSize: size,
          cursor: 'pointer',
          verticalAlign: 'middle',
          ...style
        }}
      />
    </Tooltip>
  );
}
