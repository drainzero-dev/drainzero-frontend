import React from 'react';
import TaxInfoTooltip from './TaxInfoTooltip';

export default function TaxFieldLabel({ text, topic, style = {}, suffix = null }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={style}>{text}</span>
      {suffix}
      {topic ? <TaxInfoTooltip topic={topic} /> : null}
    </span>
  );
}
