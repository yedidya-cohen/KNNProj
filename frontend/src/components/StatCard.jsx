import { Card } from 'react-bootstrap';

export default function StatCard({ title, value, icon, color = 'primary' }) {
  return (
    <Card
      className="border-0 shadow-sm h-100"
      style={{ borderTop: `3px solid var(--bs-${color})` }}
    >
      <Card.Body className="d-flex align-items-center gap-3 p-3">
        <div className={`rounded-3 p-3 bg-${color} bg-opacity-10 text-${color} flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-muted small mb-1">{title}</p>
          <p className="fs-4 fw-bold mb-0">{value}</p>
        </div>
      </Card.Body>
    </Card>
  );
}

