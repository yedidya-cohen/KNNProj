import { useState } from 'react';
import { Badge, Button, Card, Collapse } from 'react-bootstrap';
import NeighborsTable from './NeighborsTable';

const CONFIDENCE_MAP = {
  high:   { bg: 'success', label: 'ביטחון גבוה', textDark: false },
  medium: { bg: 'warning', label: 'ביטחון בינוני', textDark: true },
  low:    { bg: 'danger',  label: 'ביטחון נמוך',  textDark: false },
};

function resolveConfidence(confidence) {
  if (typeof confidence === 'string') {
    return CONFIDENCE_MAP[confidence.toLowerCase()] ?? CONFIDENCE_MAP.medium;
  }
  if (typeof confidence === 'number') {
    if (confidence >= 0.7) return CONFIDENCE_MAP.high;
    if (confidence >= 0.4) return CONFIDENCE_MAP.medium;
    return CONFIDENCE_MAP.low;
  }
  return CONFIDENCE_MAP.medium;
}

function gradeColor(grade) {
  if (grade >= 85) return '#198754';
  if (grade >= 65) return '#fd7e14';
  return '#dc3545';
}

export default function PredictionResult({ result }) {
  const [showNeighbors, setShowNeighbors] = useState(false);

  const { predicted_grade, confidence, k_value, neighbors = [] } = result;
  const conf = resolveConfidence(confidence);
  const rounded = Math.round(predicted_grade);

  return (
    <Card className="border-0 shadow-sm mt-4">
      <Card.Body className="p-4">
        {/* Grade + confidence */}
        <div className="text-center mb-3">
          <div className="text-muted small mb-1">ציון חזוי</div>
          <div
            className="fw-bold"
            style={{ fontSize: '5.5rem', lineHeight: 1.05, color: gradeColor(rounded) }}
          >
            {rounded}
          </div>
          <Badge
            bg={conf.bg}
            className={`mt-2 px-3 py-2 fs-6${conf.textDark ? ' text-dark' : ''}`}
          >
            {conf.label}
          </Badge>
        </div>

        {/* Explanatory sentence */}
        <p className="text-center text-muted mb-0">
          התחזית מבוססת על{' '}
          <strong className="text-body">{k_value}</strong>{' '}
          סטודנטים דומים
        </p>

        {/* Neighbors accordion */}
        {neighbors.length > 0 && (
          <>
            <hr className="my-3" />
            <div className="d-flex align-items-center justify-content-between">
              <span className="fw-medium">הסבר התחזית</span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowNeighbors((v) => !v)}
                aria-expanded={showNeighbors}
              >
                {showNeighbors ? 'הסתר ▲' : 'הצג ▼'}
              </Button>
            </div>
            <Collapse in={showNeighbors}>
              <div className="mt-3">
                <NeighborsTable neighbors={neighbors} />
              </div>
            </Collapse>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

