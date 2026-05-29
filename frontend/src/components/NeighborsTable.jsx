import { Table } from 'react-bootstrap';

function withSimilarity(neighbors) {
  const distances = neighbors.map((n) => n.distance);
  const minD = Math.min(...distances);
  const maxD = Math.max(...distances);
  const range = maxD - minD;
  return neighbors.map((n) => ({
    ...n,
    // nearest → 100%, farthest → 35%, others linear between
    similarity: range === 0 ? 100 : Math.round(100 - ((n.distance - minD) / range) * 65),
  }));
}

function SimilarityBar({ pct }) {
  const color = pct >= 70 ? '#198754' : pct >= 45 ? '#fd7e14' : '#dc3545';
  return (
    <div className="d-flex align-items-center gap-2">
      <div
        style={{
          flex: 1,
          height: '6px',
          borderRadius: '3px',
          backgroundColor: '#e9ecef',
          minWidth: '60px',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: '3px',
            backgroundColor: color,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span className="text-muted small" style={{ minWidth: '34px' }}>
        {pct}%
      </span>
    </div>
  );
}

export default function NeighborsTable({ neighbors = [] }) {
  if (!neighbors.length) return null;

  const rows = withSimilarity(neighbors);

  return (
    <Table size="sm" hover className="align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th>מזהה</th>
          <th>ממוצע כללי</th>
          <th>ציון בקורס המבוקש</th>
          <th>מידת דמיון</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((n) => (
          <tr key={n.id}>
            <td className="text-muted small">סטודנט #{n.id}</td>
            <td>{typeof n.avg_grade === 'number' ? n.avg_grade.toFixed(1) : n.avg_grade}</td>
            <td className="fw-medium">{n.target_grade}</td>
            <td style={{ minWidth: '120px' }}>
              <SimilarityBar pct={n.similarity} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

