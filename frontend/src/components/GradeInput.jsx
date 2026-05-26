export default function GradeInput({ label = 'Grade', value, onChange }) {
  return (
    <label className="form-label w-100">
      {label}
      <input
        className="form-control"
        max="100"
        min="0"
        onChange={onChange}
        type="number"
        value={value}
      />
    </label>
  );
}

