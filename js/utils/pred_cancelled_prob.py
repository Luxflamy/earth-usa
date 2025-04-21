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
        - WEEK: Day of week (int, 0=Sunday, 1=Monday, ..., 6=Saturday)
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
        - is_weekend: Whether the flight is on a weekend (bool)
        - is_morning_peak: Whether the flight is during morning peak hours (bool)
        - is_evening_peak: Whether the flight is during evening peak hours (bool)
    """
    # Load the trained model
    try:
        model = joblib.load(model_path)
    except Exception as e:
        return {"error": f"Failed to load model: {str(e)}"}

    # Create DataFrame from input data
    flight_df = pd.DataFrame([flight_data])

    # Convert string day of week to integer if needed
    if 'WEEK' in flight_df.columns and isinstance(flight_df['WEEK'].iloc[0], str):
        day_map = {
            'Sun': 0, 'Sunday': 0,
            'Mon': 1, 'Monday': 1,
            'Tue': 2, 'Tuesday': 2,
            'Wed': 3, 'Wednesday': 3,
            'Thu': 4, 'Thursday': 4,
            'Fri': 5, 'Friday': 5,
            'Sat': 6, 'Saturday': 6
        }
        flight_df['WEEK'] = flight_df['WEEK'].map(day_map)

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

    # Determine if flight is on a weekend (Sunday=0, Saturday=6)
    flight_df['IS_WEEKEND'] = 0
    if 'WEEK' in flight_df.columns:
        week_value = flight_df['WEEK'].values[0]
        if week_value == 0 or week_value == 6:  # Sunday or Saturday
            flight_df['IS_WEEKEND'] = 1

    # Determine if flight is during peak hours
    flight_df['IS_MORNING_PEAK'] = 0
    flight_df['IS_EVENING_PEAK'] = 0

    if 'DEP_TIME' in flight_df.columns:
        dep_time = flight_df['DEP_TIME'].values[0]
        # Morning peak: 7:00 AM to 10:00 AM (700-1000)
        if 700 <= dep_time < 1000:
            flight_df['IS_MORNING_PEAK'] = 1
        # Evening peak: 4:00 PM to 7:00 PM (1600-1900)
        elif 1600 <= dep_time < 1900:
            flight_df['IS_EVENING_PEAK'] = 1

    # Ensure we have PRCP and EXTREME_WEATHER columns
    if 'PRCP' not in flight_df.columns:
        flight_df['PRCP'] = 0.0
    if 'EXTREME_WEATHER' not in flight_df.columns:
        flight_df['EXTREME_WEATHER'] = 0

    if 'DEST_PRCP' not in flight_df.columns:
        flight_df['DEST_PRCP'] = 0.0
    if 'DEST_EXTREME_WEATHER' not in flight_df.columns:
        flight_df['DEST_EXTREME_WEATHER'] = 0

    # Create a subset with only the features used in the model
    # Match the features used during training (now including the new indicators)
    required_features = ['YEAR', 'WEEK', 'MKT_AIRLINE', 'ORIGIN_IATA', 'DEST_IATA',
                         'IS_REDEYE', 'IS_WEEKEND', 'IS_MORNING_PEAK', 'IS_EVENING_PEAK',
                         'EXTREME_WEATHER', 'DEST_EXTREME_WEATHER', 'DISTANCE', 'PRCP', 'DEST_PRCP']

    # Check if all required features are present
    missing_features = [f for f in required_features if f not in flight_df.columns]
    if missing_features:
        return {"error": f"Missing required features: {', '.join(missing_features)}"}

    X = flight_df[required_features]

    # Make prediction
    try:
        # Get probability of cancellation (class 1)
        # cancellation_prob = model.predict_proba(X)[0, 1]
        cancellation_prob = model.predict(X)[0]

        return {
            "cancellation_probability": float(cancellation_prob),
            "is_redeye": bool(flight_df['IS_REDEYE'].values[0]),
            "is_weekend": bool(flight_df['IS_WEEKEND'].values[0]),
            "is_morning_peak": bool(flight_df['IS_MORNING_PEAK'].values[0]),
            "is_evening_peak": bool(flight_df['IS_EVENING_PEAK'].values[0])
        }
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}


# # Example usage:
# if __name__ == "__main__":
#     # Example flight data with updated WEEK value (1 = Monday in new system)
#     flight = {
#         "YEAR": 2021,
#         "WEEK": 1,  # Monday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
#         "MKT_AIRLINE": "WN",
#         "ORIGIN_IATA": "ATL",
#         "DEST_IATA": "LAX",
#         "DISTANCE": 1946.0,
#         "DEP_TIME": 530,  # 5:30 AM
#     }

#     # Path to the saved model
#     model_path = "./cancelled_prob_rf_models/May2021_model.joblib"

#     # Make prediction
#     result = predict_flight_cancellation(model_path, flight)
#     print(result)

#     # Example of a weekend evening flight
#     weekend_flight = {
#         "YEAR": 2021,
#         "WEEK": 0,  # Sun
#         "MKT_AIRLINE": "DL",
#         "ORIGIN_IATA": "DFW",
#         "DEST_IATA": "LGA",
#         "DISTANCE": 1389.0,
#         "DEP_TIME": 1730,  # 5:30 PM (evening peak)
#     }

#     # Make prediction for weekend flight
#     weekend_result = predict_flight_cancellation(model_path, weekend_flight)
#     print("\nWeekend Evening Flight:")
#     print(weekend_result)

#     # Example of a weekday morning peak flight
#     morning_flight = {
#         "YEAR": 2021,
#         "WEEK": 3,  # Wednesday
#         "MKT_AIRLINE": "AA",
#         "ORIGIN_IATA": "ORD",
#         "DEST_IATA": "SFO",
#         "DISTANCE": 1846.0,
#         "DEP_TIME": 830,  # 8:30 AM (morning peak)
#     }

#     # Make prediction for morning peak flight
#     morning_result = predict_flight_cancellation(model_path, morning_flight)
#     print("\nWeekday Morning Peak Flight:")
#     print(morning_result)


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
