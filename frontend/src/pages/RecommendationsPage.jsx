import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { getTopRecommendations } from '../api/predictions';

const RANK_META = {
  1: { bg: '#EAB308', text: '#fff', size: 52, cardClass: 'rec-card-gold', borderColor: '#EAB308', borderWidth: 4 },
  2: { bg: '#6B7280', text: '#fff', size: 44, cardClass: '',              borderColor: '#9CA3AF', borderWidth: 3 },
  3: { bg: '#A16207', text: '#fff', size: 44, cardClass: '',              borderColor: '#B45309', borderWidth: 3 },
};

const CONFIDENCE_MAP = {
  high:   { bg: 'success', label: 'ביטחון גבוה',    textDark: false },
  medium: { bg: 'warning', label: 'ביטחון בינוני',  textDark: true  },
  low:    { bg: 'danger',  label: 'ביטחון נמוך',    textDark: false },
};

function resolveConf(confidence) {
  if (typeof confidence === 'string') return CONFIDENCE_MAP[confidence.toLowerCase()] ?? CONFIDENCE_MAP.medium;
  if (typeof confidence === 'number') {
    if (confidence >= 0.7) return CONFIDENCE_MAP.high;
    if (confidence >= 0.4) return CONFIDENCE_MAP.medium;
    return CONFIDENCE_MAP.low;
  }
  return CONFIDENCE_MAP.medium;
}

function gradeColor(g) {
  if (g >= 85) return '#198754';
  if (g >= 65) return '#fd7e14';
  return '#dc3545';
}

function RecCard({ rec, rank }) {
  const navigate = useNavigate();
  const meta = RANK_META[rank] ?? RANK_META[3];
  const conf = resolveConf(rec.confidence);
  const rounded = Math.round(rec.predicted_grade);
  const code = rec.course.code ?? rec.course.course_code;

  return (
    <Card
      className={`h-100 border-0 shadow-sm text-center ${meta.cardClass}`}
      style={{ borderTop: `${meta.borderWidth}px solid ${meta.borderColor}` }}
    >
      <Card.Body className="d-flex flex-column align-items-center p-4">
        {/* Rank medal */}
        <div
          className="rounded-circle d-flex align-items-center justify-content-center fw-bold mb-3 flex-shrink-0"
          style={{
            width: meta.size,
            height: meta.size,
            backgroundColor: meta.bg,
            color: meta.text,
            fontSize: rank === 1 ? '1.2rem' : '1rem',
          }}
        >
          {rank}
        </div>

        {/* Course info */}
        <Card.Title className="fw-semibold fs-6 lh-sm mb-1">{rec.course.name}</Card.Title>
        {code && <div className="text-muted small mb-3">{code}</div>}
        {!code && <div className="mb-3" />}

        {/* Predicted grade */}
        <div
          className="fw-bold"
          style={{
            fontSize: rank === 1 ? '4.5rem' : '3.5rem',
            lineHeight: 1.05,
            color: gradeColor(rounded),
          }}
        >
          {rounded}
        </div>

        {/* Confidence badge */}
        <Badge
          bg={conf.bg}
          className={`my-3 px-3 py-2${conf.textDark ? ' text-dark' : ''}`}
        >
          {conf.label}
        </Badge>

        {/* CTA — pushed to bottom */}
        <div className="mt-auto w-100">
          <Button
            variant={rank === 1 ? 'primary' : 'outline-primary'}
            size="sm"
            className="w-100"
            onClick={() => navigate(`/predict?course_id=${rec.course.id}`)}
          >
            בקש תחזית מלאה
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insufficientGrades, setInsufficientGrades] = useState(false);
  const [genericError, setGenericError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getTopRecommendations();
        const list = Array.isArray(data) ? data.slice(0, 3) : [];
        if (list.length === 0) {
          setInsufficientGrades(true);
        } else {
          setRecs(list);
        }
      } catch (err) {
        const detail = (
          err.response?.data?.detail ??
          err.response?.data?.message ??
          ''
        ).toLowerCase();
        if (detail.includes('grade') || detail.includes('ציון') || err.response?.status === 400) {
          setInsufficientGrades(true);
        } else {
          setGenericError(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" className="mb-3" />
        <div className="text-muted">מחשב המלצות...</div>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <h1 className="h4 fw-semibold mb-1">קורסים מומלצים עבורך</h1>
      <p className="text-muted mb-4 small">3 הקורסים שבהם צפוי הציון הגבוה ביותר</p>

      {genericError && (
        <Alert variant="danger">שגיאה בטעינת ההמלצות. נסה לרענן את הדף.</Alert>
      )}

      {insufficientGrades && (
        <div className="text-center py-5">
          <BarChart2 size={52} className="text-muted mb-3" />
          <h2 className="h5 fw-semibold mb-2">אין מספיק ציונים לחישוב המלצות</h2>
          <p className="text-muted mb-4">הזן לפחות 3 ציונים כדי לקבל המלצות מותאמות אישית</p>
          <Button variant="primary" onClick={() => navigate('/grades')}>
            לדף הזנת ציונים
          </Button>
        </div>
      )}

      {recs.length > 0 && (
        <Row xs={1} md={3} className="g-4">
          {recs.map((rec, i) => (
            <Col key={rec.course.id}>
              <RecCard rec={rec} rank={i + 1} />
            </Col>
          ))}
        </Row>
      )}
    </main>
  );
}

