export default function StatCard({ label, value }) {
  return (
    <article className="card">
      <div className="card-body">
        <p className="text-muted mb-1">{label}</p>
        <strong className="fs-4">{value}</strong>
      </div>
    </article>
  );
}

