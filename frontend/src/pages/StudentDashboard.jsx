import { useEffect, useState } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Award, BarChart2, BookOpen, History, Star, TrendingUp } from 'lucide-react';
import { getMyGrades } from '../api/grades';
import { getMyPredictionHistory } from '../api/predictions';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';

const NAV_CARDS = [
  {
    title: 'הזן ציונים',
    text: 'הוסף ועדכן ציונים עבור הקורסים שלך',
    icon: <BookOpen size={32} />,
    path: '/grades',
    color: 'primary',
  },
  {
    title: 'בקש תחזית',
    text: 'קבל תחזית לציון הסופי שלך בקורס',
    icon: <TrendingUp size={32} />,
    path: '/predict',
    color: 'success',
  },
  {
    title: 'קורסים מומלצים (Top-3)',
    text: 'גלה קורסים שמומלצים עבורך',
    icon: <Star size={32} />,
    path: '/recommendations',
    color: 'warning',
  },
  {
    title: 'היסטוריית תחזיות',
    text: 'צפה בכל התחזיות שביקשת בעבר',
    icon: <History size={32} />,
    path: '/predictions/history',
    color: 'info',
  },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [gradesRes, predictionsRes] = await Promise.allSettled([
          getMyGrades(),
          getMyPredictionHistory(),
        ]);

        if (gradesRes.status === 'fulfilled') {
          setGrades(gradesRes.value.data ?? []);
        }
        if (predictionsRes.status === 'fulfilled') {
          const list = predictionsRes.value.data ?? [];
          setPredictionCount(Array.isArray(list) ? list.length : 0);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const avg =
    grades.length > 0
      ? (
          grades.reduce((sum, g) => sum + (g.grade ?? g.score ?? 0), 0) /
          grades.length
        ).toFixed(1)
      : '—';

  const stats = [
    {
      title: 'מספר קורסים שהושלמו',
      value: loading ? <Spinner size="sm" animation="border" /> : grades.length,
      icon: <BookOpen size={22} />,
      color: 'primary',
    },
    {
      title: 'ממוצע ציונים',
      value: loading ? <Spinner size="sm" animation="border" /> : avg,
      icon: <Award size={22} />,
      color: 'success',
    },
    {
      title: 'מספר תחזיות שביצעתי',
      value: loading ? <Spinner size="sm" animation="border" /> : predictionCount,
      icon: <BarChart2 size={22} />,
      color: 'info',
    },
  ];

  return (
    <main className="container py-4">
      <h1 className="h4 fw-semibold mb-4">
        ברוך הבא, {user?.full_name ?? user?.username ?? ''}
      </h1>

      <Row xs={1} sm={3} className="g-3 mb-5">
        {stats.map((s) => (
          <Col key={s.title}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      <Row xs={1} sm={2} className="g-3">
        {NAV_CARDS.map((card) => (
          <Col key={card.path}>
            <Link to={card.path} className="text-decoration-none">
              <Card className={`h-100 shadow-sm border-0 dashboard-nav-card border-top border-3 border-${card.color}`}>
                <Card.Body className="d-flex flex-column align-items-center text-center py-4 px-3">
                  <div className={`mb-3 text-${card.color}`}>{card.icon}</div>
                  <Card.Title className="fw-semibold mb-2 fs-6">{card.title}</Card.Title>
                  <Card.Text className="text-muted small mb-0">{card.text}</Card.Text>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </main>
  );
}

