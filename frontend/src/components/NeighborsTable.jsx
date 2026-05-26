export default function NeighborsTable({ neighbors = [] }) {
  return (
    <table className="table table-sm">
      <thead>
        <tr>
          <th>Record</th>
          <th>Distance</th>
          <th>Final Grade</th>
        </tr>
      </thead>
      <tbody>
        {neighbors.map((neighbor) => (
          <tr key={neighbor.historical_record_id}>
            <td>{neighbor.historical_record_id}</td>
            <td>{neighbor.distance}</td>
            <td>{neighbor.final_grade}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

