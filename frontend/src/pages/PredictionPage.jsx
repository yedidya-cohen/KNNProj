import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { getCourses } from '../api/courses';
import { getMyGrades } from '../api/grades';
import { runPrediction } from '../api/predictions';
import PredictionResult from '../components/PredictionResult';

// Map backend error messages to typed keys
function classifyError(err) {
  const detail = (
    err.response?.data?.detail ??
    err.response?.data?.message ??
    ''
  ).toLowerCase();
  if (detail.includes('grade') || detail.includes('ציון')) return 'not_enough_grades';
  if (detail.includes('neighbor') || detail.includes('data') || detail.includes('נתונ'))
    return 'not_enough_neighbors';
  return 'generic';
}

export default function PredictionPage() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [myGrades, setMyGrades] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [coursesRes, gradesRes] = await Promise.all([getCourses(), getMyGrades()]);
        const allCourses = coursesRes.data ?? [];
        const grades = gradesRes.data ?? [];
        setCourses(allCourses);
        setMyGrades(grades);

        // Pre-select course when navigated from Recommendations
        const preselect = searchParams.get('course_id');
        if (preselect) {
          const completedSet = new Set(grades.map((g) => g.course_id));
          const isAvailable = allCourses
            .filter((c) => !completedSet.has(c.id))
            .some((c) => String(c.id) === preselect);
          if (isAvailable) setSelectedId(preselect);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completedIds = useMemo(
    () => new Set(myGrades.map((g) => g.course_id)),
    [myGrades],
  );

  const availableCourses = useMemo(
    () => courses.filter((c) => !completedIds.has(c.id)),
    [courses, completedIds],
  );

  function handleCourseChange(e) {
    setSelectedId(e.target.value);
    setResult(null);
    setPredictError(null);
  }

  async function handlePredict() {
    if (!selectedId) return;
    setPredicting(true);
    setPredictError(null);
    setResult(null);
    try {
      const { data } = await runPrediction({ course_id: Number(selectedId) });
      setResult(data);
    } catch (err) {
      setPredictError(classifyError(err));
    } finally {
      setPredicting(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  const courseLabel = (c) => {
    const code = c.code ?? c.course_code;
    return code ? `${c.name} (${code})` : c.name;
  };

  return (
    <main className="container py-4" style={{ maxWidth: '580px' }}>
      <h1 className="h4 fw-semibold mb-4">חיזוי ציון בקורס</h1>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form.Group className="mb-4" controlId="courseSelect">
            <Form.Label className="fw-medium mb-2">בחר קורס לחיזוי</Form.Label>
            {availableCourses.length === 0 ? (
              <p className="text-muted small mb-0">
                לא נמצאו קורסים זמינים לחיזוי. ייתכן שהשלמת את כל הקורסים.
              </p>
            ) : (
              <Form.Select value={selectedId} onChange={handleCourseChange}>
                <option value="">-- בחר קורס --</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {courseLabel(c)}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              onClick={handlePredict}
              disabled={!selectedId || predicting}
            >
              {predicting ? (
                <>
                  <Spinner as="span" size="sm" animation="border" className="me-2" />
                  מחשב…
                </>
              ) : (
                'חזה ציון'
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {predictError === 'not_enough_grades' && (
        <Alert variant="warning" className="mt-4">
          אין מספיק ציונים לחיזוי. הזן לפחות 3 ציונים תחילה —{' '}
          <Link to="/grades" className="alert-link">לדף הזנת ציונים</Link>
        </Alert>
      )}

      {predictError === 'not_enough_neighbors' && (
        <Alert variant="warning" className="mt-4">
          אין מספיק נתונים לחיזוי קורס זה
        </Alert>
      )}

      {predictError === 'generic' && (
        <Alert variant="danger" className="mt-4">
          שגיאה בחיזוי הציון. נסה שנית.
        </Alert>
      )}

      {result && <PredictionResult result={result} />}
    </main>
  );
}

