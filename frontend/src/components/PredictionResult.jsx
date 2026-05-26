export default function PredictionResult({ prediction }) {
  if (!prediction) {
    return null;
  }

  return (
    <section className="alert alert-primary">
      Predicted grade: {prediction.predictedGrade ?? prediction.predicted_grade}
    </section>
  );
}

