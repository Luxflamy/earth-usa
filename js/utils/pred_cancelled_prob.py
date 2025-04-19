import joblib
import pandas as pd
import numpy as np
import os
import csv


def predict_flight_cancellation(model_path, flight_data):
    """
    Predicts flight cancellation probability using a trained Random Forest model.

    Parameters:
    model_path (str): Path to the saved model (.joblib file)
    flight_data (dict): Dictionary containing flight information with these keys:
        - YEAR: Flight year (int)
        - WEEK: Day of week (int, 0-6 or string like 'Mon', 'Tue', etc.)
        - MKT_AIRLINE: Marketing airline code (str, e.g., 'AA', 'DL', 'UA')
        - ORIGIN_IATA: Origin airport code (str, e.g., 'ATL', 'ORD')
        - DEST_IATA: Destination airport code (str, e.g., 'LAX', 'DFW')
        - DISTANCE: Flight distance in miles (float)
        - DEP_TIME: Departure time in HHMM format (float, e.g., 1430 for 2:30 PM)
        - ARR_TIME: Arrival time in HHMM format (float, e.g., 1630 for 4:30 PM)

    Returns:
    dict: Containing:
        - cancellation_probability: Probability of flight cancellation (float)
        - is_redeye: Whether the flight is classified as a red-eye (bool)
    """
    # Load the trained model
    try:
        model = joblib.load(model_path)
    except Exception as e:
        return {"error": f"Failed to load model: {str(e)}"}

    # Create DataFrame from input data
    flight_df = pd.DataFrame([flight_data])

    # Determine if flight is a red-eye (between midnight and 6 AM)
    flight_df['IS_REDEYE'] = 0

    if 'DEP_TIME' in flight_df.columns:
        dep_time = flight_df['DEP_TIME'].values[0]
        if 0 <= dep_time < 600:
            flight_df['IS_REDEYE'] = 1

    if 'ARR_TIME' in flight_df.columns:
        arr_time = flight_df['ARR_TIME'].values[0]
        if 0 <= arr_time < 600:
            flight_df['IS_REDEYE'] = 1

    # Ensure we have PRCP and EXTREME_WEATHER columns
    if 'PRCP' not in flight_df.columns:
        flight_df['PRCP'] = 0.0
    if 'EXTREME_WEATHER' not in flight_df.columns:
        flight_df['EXTREME_WEATHER'] = 0

    # Create a subset with only the features used in the model
    # Match the features used during training
    required_features = ['YEAR', 'WEEK', 'MKT_AIRLINE', 'ORIGIN_IATA', 'DEST_IATA',
                         'IS_REDEYE', 'EXTREME_WEATHER', 'DISTANCE', 'PRCP']

    # Check if all required features are present
    missing_features = [f for f in required_features if f not in flight_df.columns]
    if missing_features:
        return {"error": f"Missing required features: {', '.join(missing_features)}"}

    X = flight_df[required_features]

    # Make prediction
    try:
        # Get probability of cancellation (class 1)
        cancellation_prob = model.predict_proba(X)[0, 1]

        return {
            "cancellation_probability": float(cancellation_prob),
            "is_redeye": bool(flight_df['IS_REDEYE'].values[0])
        }
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}


def get_airport_distance(origin, destination):
    """
    Reads the distance between two airports from the CSV file.

    Parameters:
    origin (str): Origin airport IATA code.
    destination (str): Destination airport IATA code.

    Returns:
    float: Distance in miles, or 1 if not found.
    """
    csv_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../models/top30_airport_distances.csv"))
    try:
        with open(csv_path, mode='r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if (row['Origin'] == origin and row['Destination'] == destination) or \
                   (row['Origin'] == destination and row['Destination'] == origin):
                    return float(row['Distance']) if row['Distance'] else 1.0
    except Exception as e:
        return 1.0
    return 1.0


# # Example usage:
# if __name__ == "__main__":
#     # Example flight data
#     flight = {
#         "YEAR": 2024,
#         "WEEK": 1,  # Monday (can also accept 'Mon')
#         "MKT_AIRLINE": "DL",
#         "ORIGIN_IATA": "ATL",
#         "DEST_IATA": "LAX",
#         "DISTANCE": 1946.0,
#         "DEP_TIME": 1930,  # 7:30 PM
#     }

#     # Path to the saved model using relative path
#     current_dir = os.path.dirname(os.path.abspath(__file__))
#     # Navigate from js/utils to models/cancelled_prob
#     model_path = os.path.normpath(os.path.join(current_dir, "../../../models/cancelled_prob/May2021_model.joblib"))

#     # Make prediction
#     result = predict_flight_cancellation(model_path, flight)
#     print(result)