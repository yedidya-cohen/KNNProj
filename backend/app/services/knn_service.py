from dataclasses import dataclass

import numpy as np
from sklearn.neighbors import KNeighborsRegressor


@dataclass
class KNNPrediction:
    predicted_grade: float
    neighbor_indices: list[int]
    neighbor_distances: list[float]


class KNNGradePredictor:
    def __init__(self, n_neighbors: int = 5) -> None:
        self.n_neighbors = n_neighbors
        self.model = KNeighborsRegressor(n_neighbors=n_neighbors)

    def fit(self, features: list[list[float]], targets: list[float]) -> None:
        self.model.fit(np.array(features), np.array(targets))

    def predict(self, features: list[float]) -> KNNPrediction:
        sample = np.array([features])
        distances, indices = self.model.kneighbors(sample)
        predicted_grade = float(self.model.predict(sample)[0])

        return KNNPrediction(
            predicted_grade=predicted_grade,
            neighbor_indices=indices[0].tolist(),
            neighbor_distances=distances[0].tolist(),
        )

