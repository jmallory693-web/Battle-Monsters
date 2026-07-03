import './HelpTip.css';

interface HelpTipProps {
  label: string;
  text: string;
}

export function HelpTip({ label, text }: HelpTipProps) {
  return (
    <span className="help-tip" title={text} aria-label={`${label}: ${text}`}>
      <span className="help-tip__label">{label}</span>
      <span className="help-tip__icon" aria-hidden="true">?</span>
    </span>
  );
}
