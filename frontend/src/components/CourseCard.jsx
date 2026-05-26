export default function CourseCard({ course }) {
  return (
    <article className="card">
      <div className="card-body">
        <h2 className="h5">{course?.name ?? 'Course'}</h2>
        <p className="mb-0 text-muted">{course?.code ?? 'COURSE-101'}</p>
      </div>
    </article>
  );
}

