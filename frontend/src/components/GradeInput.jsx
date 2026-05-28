import { Form } from 'react-bootstrap';

export default function GradeInput({ value, onChange, disabled, error }) {
  return (
    <div>
      <Form.Control
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={onChange}
        disabled={disabled}
        isInvalid={!!error}
        placeholder="0–100"
        style={{ width: '90px' }}
      />
      {error && (
        <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
          {error}
        </Form.Control.Feedback>
      )}
    </div>
  );
}

