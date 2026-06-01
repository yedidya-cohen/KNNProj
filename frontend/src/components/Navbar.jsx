import { Container, Nav, Navbar as BSNavbar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const homePath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <BSNavbar bg="primary" variant="dark" expand="lg">
      <Container>
        <BSNavbar.Brand as={Link} to={token ? homePath : '/login'}>מערכת חיזוי ציונים</BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="main-nav" />
        <BSNavbar.Collapse id="main-nav">
          {token && (
            <Nav className="me-auto">
              {user?.role === 'admin' ? (
                <>
                  <Nav.Link as={Link} to="/admin/dashboard">לוח בקרה</Nav.Link>
                  <Nav.Link as={Link} to="/admin/courses">קורסים</Nav.Link>
                  <Nav.Link as={Link} to="/admin/historical-data">נתונים היסטוריים</Nav.Link>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/dashboard">לוח בקרה</Nav.Link>
                  <Nav.Link as={Link} to="/grades">ציונים</Nav.Link>
                  <Nav.Link as={Link} to="/predict">חיזוי ציון</Nav.Link>
                  <Nav.Link as={Link} to="/recommendations">המלצות</Nav.Link>
                  <Nav.Link as={Link} to="/predictions/history">היסטוריה</Nav.Link>
                </>
              )}
            </Nav>
          )}
          {token && (
            <Nav>
              <Nav.Item className="nav-link text-white-50 pe-none">
                {user?.full_name ?? user?.email}
              </Nav.Item>
              <Nav.Link onClick={handleLogout} className="text-warning">
                התנתקות
              </Nav.Link>
            </Nav>
          )}
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}
