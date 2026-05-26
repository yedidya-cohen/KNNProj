from app.services.knn_service import KNNGradePredictor


def test_knn_predicts_grade() -> None:
    predictor = KNNGradePredictor(n_neighbors=1)
    predictor.fit([[80.0, 90.0, 95.0]], [88.0])

    prediction = predictor.predict([80.0, 90.0, 95.0])

    assert prediction.predicted_grade == 88.0
    assert prediction.neighbor_indices == [0]

