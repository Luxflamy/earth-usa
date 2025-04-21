import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from scipy import stats
import warnings

warnings.filterwarnings('ignore')

def predict_arrival_delay(model_dir, flight_data, year=2024, confidence=0.95):
    """
    Predicts flight arrival delay using trained Random Forest models.

    Parameters:
    model_dir (str): Directory where models are stored
    flight_data (dict or DataFrame): Dictionary or DataFrame containing flight information with these keys:
        - MKT_AIRLINE: Marketing airline code (str, e.g., 'AA', 'DL', 'UA')
        - ORIGIN_IATA: Origin airport code (str, e.g., 'ATL', 'ORD')
        - DEST_IATA: Destination airport code (str, e.g., 'LAX', 'DFW')
        - DISTANCE: Flight distance in miles (float)
        - SCH_DEP_TIME: Scheduled departure time in HHMM format (float, e.g., 1430 for 2:30 PM)
        - DEP_DELAY: Departure delay in minutes (float)
        - WEEK: Day of week (str, e.g., 'Mon', 'Tue') or (int, 0=Sunday, 1=Monday, etc.)
        - PRCP: Precipitation at origin (float)
        - DEST_PRCP: Precipitation at destination (float)
        - EXTREME_WEATHER: Extreme weather at origin (0 or 1)
        - DEST_EXTREME_WEATHER: Extreme weather at destination (0 or 1)
    year (int): Which year's model to use (default: 2024 - most recent)
    confidence (float): Confidence level for prediction intervals (default: 0.95 for 95% CI)

    Returns:
    dict: Containing:
        - delay_predicted: Binary prediction if flight will be delayed (0 or 1)
        - delay_probability: Probability of flight delay (float, 0-1)
        - delay_minutes: Predicted delay in minutes (float)
        - delay_lower_bound: Lower bound of prediction interval (float)
        - delay_upper_bound: Upper bound of prediction interval (float)
        - is_weekend: Whether the flight is on a weekend (bool)
        - is_late_night_arrival: Whether the arrival is late at night (bool)
        - is_morning_rush: Whether the arrival is during morning rush (bool)
        - is_evening_rush: Whether the arrival is during evening rush (bool)
    """
    # Convert single dictionary to DataFrame if needed
    if isinstance(flight_data, dict):
        df = pd.DataFrame([flight_data])
    else:
        df = flight_data.copy()

    # Get model paths
    year_model_dir = os.path.join(model_dir, f'year_{year}')
    class_model_path = os.path.join(year_model_dir, f"arr_delay_class_model_{year}.joblib")
    reg_model_path = os.path.join(year_model_dir, f"arr_delay_reg_model_{year}.joblib")

    # Check if models exist
    if not (os.path.exists(class_model_path) and os.path.exists(reg_model_path)):
        return {"error": f"Models for year {year} not found in {year_model_dir}"}

    # Load the models
    try:
        class_model = joblib.load(class_model_path)
        reg_model = joblib.load(reg_model_path)
    except Exception as e:
        return {"error": f"Failed to load models: {str(e)}"}

    # Create necessary features for prediction
    df = create_features_for_prediction(df)

    # Select the features that were used in training
    cat_features = ['DAY_NAME', 'ARR_TIME_BLOCK', 'MKT_AIRLINE',
                    'ORIGIN_IATA', 'DEST_IATA', 'FLIGHT_DISTANCE_CAT',
                    'IS_LATE_NIGHT_ARR', 'IS_WEEKEND', 'IS_MORNING_RUSH_ARR', 'IS_EVENING_RUSH_ARR',
                    'EXTREME_WEATHER', 'DEST_EXTREME_WEATHER']

    num_features = [
        'DISTANCE',
        'PRCP', 'DEST_PRCP',
        'DEP_DELAY'
    ]

    # Handle missing values and features
    for col in cat_features:
        if col not in df.columns:
            if col == 'EXTREME_WEATHER' or col == 'DEST_EXTREME_WEATHER':
                df[col] = 0
            else:
                df[col] = 'unknown'
        elif df[col].isnull().sum() > 0:
            df[col] = df[col].fillna('unknown')

    for col in num_features:
        if col not in df.columns:
            df[col] = 0
        elif df[col].isnull().sum() > 0:
            if df[col].notna().any():
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(0)

    # Create feature set for prediction
    X_pred = df[cat_features + num_features]

    # Make predictions
    try:
        # Classification prediction (delayed or not)
        delay_prob = class_model.predict_proba(X_pred)[:, 1]
        delay_predicted = class_model.predict(X_pred)

        # Regression prediction (delay minutes)
        delay_minutes = reg_model.predict(X_pred)

        # Calculate confidence intervals using RMSE-based method
        # Define RMSE values based on year (hardcoded values)
        rmse_values = {
            2021: 27.22,
            2022: 28.18,
            2023: 29.37,
            2024: 38.35
        }

        # Use default RMSE if year not in dictionary
        rmse = rmse_values.get(year, 40.0)

        # Calculate z-score for the desired confidence level
        z_score = stats.norm.ppf(1 - (1 - confidence) / 2)

        # Calculate margin of error
        margin_of_error = z_score * rmse

        # Calculate confidence interval bounds
        lower_bounds = delay_minutes - margin_of_error
        upper_bounds = delay_minutes + margin_of_error

        # Ensure lower bounds are not negative
        lower_bounds = np.maximum(lower_bounds, 0)

        # Create result dictionary for the first flight (or the only one if single dict was provided)
        result = {
            "delay_predicted": bool(delay_predicted[0]),
            "delay_probability": float(delay_prob[0]),
            "delay_minutes": float(delay_minutes[0]),
            "delay_lower_bound": float(lower_bounds[0]),
            "delay_upper_bound": float(upper_bounds[0]),
            "is_weekend": bool(df['IS_WEEKEND'].iloc[0]),
            "is_late_night_arrival": bool(df['IS_LATE_NIGHT_ARR'].iloc[0]),
            "is_morning_rush": bool(df['IS_MORNING_RUSH_ARR'].iloc[0]),
            "is_evening_rush": bool(df['IS_EVENING_RUSH_ARR'].iloc[0])
        }

        # If input was a DataFrame with multiple flights, return predictions for all
        if len(df) > 1 and isinstance(flight_data, pd.DataFrame):
            results = []
            for i in range(len(df)):
                flight_result = {
                    "delay_predicted": bool(delay_predicted[i]),
                    "delay_probability": float(delay_prob[i]),
                    "delay_minutes": float(delay_minutes[i]),
                    "delay_lower_bound": float(lower_bounds[i]),
                    "delay_upper_bound": float(upper_bounds[i]),
                    "is_weekend": bool(df['IS_WEEKEND'].iloc[i]),
                    "is_late_night_arrival": bool(df['IS_LATE_NIGHT_ARR'].iloc[i]),
                    "is_morning_rush": bool(df['IS_MORNING_RUSH_ARR'].iloc[i]),
                    "is_evening_rush": bool(df['IS_EVENING_RUSH_ARR'].iloc[i])
                }
                results.append(flight_result)
            return results

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Prediction failed: {str(e)}"}


def create_features_for_prediction(df):
    """
    Create the necessary features for arrival delay prediction

    Args:
        df: DataFrame with flight data

    Returns:
        DataFrame with added features
    """
    # Create late-night arrival indicator
    df = create_late_night_arrival_indicator(df)

    # Create arrival time block features
    df = create_arrival_time_block_features(df)

    # Create day features
    df = create_day_features(df)

    # Create flight distance categories if not present
    if 'FLIGHT_DISTANCE_CAT' not in df.columns and 'DISTANCE' in df.columns:
        # Handle potential NaN values in DISTANCE
        if df['DISTANCE'].isnull().any():
            # Only categorize non-NaN values
            valid_distance = ~df['DISTANCE'].isnull()
            df['FLIGHT_DISTANCE_CAT'] = pd.Series(dtype='object')  # Initialize as empty

            if valid_distance.any():
                df.loc[valid_distance, 'FLIGHT_DISTANCE_CAT'] = pd.cut(
                    df.loc[valid_distance, 'DISTANCE'],
                    bins=[0, 300, 600, 1000, 1500, float('inf')],
                    labels=['Very Short (<300 mi)', 'Short (300-600 mi)', 'Medium (600-1000 mi)',
                            'Long (1000-1500 mi)', 'Very Long (>1500 mi)']
                )
            # Fill remaining NaN values
            df['FLIGHT_DISTANCE_CAT'] = df['FLIGHT_DISTANCE_CAT'].fillna('Medium (600-1000 mi)')
        else:
            # If no NaN values, proceed normally
            df['FLIGHT_DISTANCE_CAT'] = pd.cut(
                df['DISTANCE'],
                bins=[0, 300, 600, 1000, 1500, float('inf')],
                labels=['Very Short (<300 mi)', 'Short (300-600 mi)', 'Medium (600-1000 mi)',
                        'Long (1000-1500 mi)', 'Very Long (>1500 mi)']
            )

    return df


def create_late_night_arrival_indicator(df):
    """
    Creates a binary indicator for late-night arrivals based on estimated arrival time
    """
    # Make a copy to avoid modifying the original
    df = df.copy()

    # Initialize IS_LATE_NIGHT_ARR to 0 (not a late-night arrival)
    df['IS_LATE_NIGHT_ARR'] = 0

    # 估计到达时间：基于出发时间、距离和平均速度
    if 'SCH_DEP_TIME' in df.columns and 'DISTANCE' in df.columns:
        # 确保 SCH_DEP_TIME 是数值型
        try:
            df['SCH_DEP_TIME'] = pd.to_numeric(df['SCH_DEP_TIME'], errors='coerce')
        except:
            pass

        # 对于有效的出发时间和距离，估算到达时间
        valid_input = ~df['SCH_DEP_TIME'].isna() & ~df['DISTANCE'].isna()
        if valid_input.any():
            # 计算大致飞行时间（假设平均飞行速度为500英里/小时）
            df.loc[valid_input, 'EST_FLIGHT_HOURS'] = df.loc[valid_input, 'DISTANCE'] / 500
            
            # 将出发时间转换为小时
            df.loc[valid_input, 'DEP_HOUR'] = df.loc[valid_input, 'SCH_DEP_TIME'] // 100
            df.loc[valid_input, 'DEP_MINUTE'] = df.loc[valid_input, 'SCH_DEP_TIME'] % 100
            df.loc[valid_input, 'DEP_DECIMAL_HOUR'] = df.loc[valid_input, 'DEP_HOUR'] + df.loc[valid_input, 'DEP_MINUTE'] / 60
            
            # 计算预估到达小时（24小时制）
            df.loc[valid_input, 'EST_ARR_DECIMAL_HOUR'] = (df.loc[valid_input, 'DEP_DECIMAL_HOUR'] + df.loc[valid_input, 'EST_FLIGHT_HOURS']) % 24
            
            # 识别late-night到达（22:00-06:00）
            late_night_arr = ((df.loc[valid_input, 'EST_ARR_DECIMAL_HOUR'] >= 22) | 
                             (df.loc[valid_input, 'EST_ARR_DECIMAL_HOUR'] < 6))
            df.loc[valid_input & late_night_arr, 'IS_LATE_NIGHT_ARR'] = 1
            
            # 添加到达时段
            df['ARR_TIME_OF_DAY'] = pd.Series(dtype='object')  # 初始化为空
            
            # 按估算到达时间分类
            df.loc[valid_input, 'ARR_TIME_OF_DAY'] = pd.cut(
                df.loc[valid_input, 'EST_ARR_DECIMAL_HOUR'],
                bins=[0, 6, 12, 18, 22, 24],
                labels=['Early Morning (0-6)', 'Morning (6-12)', 'Afternoon (12-18)',
                        'Evening (18-22)', 'Night (22-24)'],
                include_lowest=True
            )
        
        # 填充缺失值
        if 'ARR_TIME_OF_DAY' in df.columns:
            df['ARR_TIME_OF_DAY'] = df['ARR_TIME_OF_DAY'].fillna('Afternoon (12-18)')
    else:
        # 如果没有必要的输入数据，设置默认时间段
        df['ARR_TIME_OF_DAY'] = 'Afternoon (12-18)'

    return df


def create_arrival_time_block_features(df):
    """
    Creates time block features based on estimated arrival time
    """
    # Make a copy to avoid modifying the original
    df = df.copy()

    # 检查是否已经有了估计到达小时
    if 'EST_ARR_DECIMAL_HOUR' not in df.columns:
        # 添加默认值
        df['ARR_HOUR'] = 12  # 默认中午
        df['ARR_TIME_BLOCK'] = 'Mid-Day (9-12)'  # 默认时间段
        df['IS_MORNING_RUSH_ARR'] = 0
        df['IS_EVENING_RUSH_ARR'] = 0
        return df

    # 从估计到达时间提取小时
    df['ARR_HOUR'] = df['EST_ARR_DECIMAL_HOUR'].apply(lambda x: int(x) if not pd.isna(x) else 12)
    
    # 创建时间段（每段3小时）
    time_blocks = {
        0: 'Late Night (0-3)', 1: 'Late Night (0-3)', 2: 'Late Night (0-3)',
        3: 'Early Morning (3-6)', 4: 'Early Morning (3-6)', 5: 'Early Morning (3-6)',
        6: 'Morning (6-9)', 7: 'Morning (6-9)', 8: 'Morning (6-9)',
        9: 'Mid-Day (9-12)', 10: 'Mid-Day (9-12)', 11: 'Mid-Day (9-12)',
        12: 'Afternoon (12-15)', 13: 'Afternoon (12-15)', 14: 'Afternoon (12-15)',
        15: 'Evening (15-18)', 16: 'Evening (15-18)', 17: 'Evening (15-18)',
        18: 'Night (18-21)', 19: 'Night (18-21)', 20: 'Night (18-21)',
        21: 'Late Night (21-24)', 22: 'Late Night (21-24)', 23: 'Late Night (21-24)'
    }

    # 将小时映射到时间段
    df['ARR_TIME_BLOCK'] = df['ARR_HOUR'].map(time_blocks)

    # 处理超出0-23范围的小时
    invalid_hours = ~df['ARR_HOUR'].isin(range(24))
    if invalid_hours.any():
        df.loc[invalid_hours, 'ARR_TIME_BLOCK'] = 'Mid-Day (9-12)'  # 无效小时使用默认值

    # 创建高峰时段指标
    # 早高峰（8-10点到达）
    df['IS_MORNING_RUSH_ARR'] = ((df['ARR_HOUR'] >= 8) & (df['ARR_HOUR'] <= 10)).astype(int)

    # 晚高峰（17-19点到达）
    df['IS_EVENING_RUSH_ARR'] = ((df['ARR_HOUR'] >= 17) & (df['ARR_HOUR'] <= 19)).astype(int)

    return df


def create_day_features(df):
    """
    Creates day type features from text day names (Sun, Mon, etc.)
    """
    # Make a copy to avoid modifying the original
    df = df.copy()

    # Check if we have the WEEK column with text day names
    if 'WEEK' in df.columns:
        if isinstance(df['WEEK'].iloc[0], str):
            # Create a mapping from abbreviated day names to full day names
            day_name_map = {
                'Sun': 'Sunday',
                'Mon': 'Monday',
                'Tue': 'Tuesday',
                'Wed': 'Wednesday',
                'Thu': 'Thursday',
                'Fri': 'Friday',
                'Sat': 'Saturday'
            }

            # Map abbreviated names to full names
            df['DAY_NAME'] = df['WEEK'].map(day_name_map)

            # Handle any values not in the mapping
            if df['DAY_NAME'].isnull().any():
                df['DAY_NAME'] = df['DAY_NAME'].fillna('Monday')  # Default to Monday for unrecognized values

            # Create weekend indicator
            df['IS_WEEKEND'] = df['WEEK'].isin(['Sat', 'Sun']).astype(int)

        elif pd.api.types.is_numeric_dtype(df['WEEK']):
            # If WEEK is numeric, assume it follows 0=Sunday, 1=Monday, etc. format
            # Create IS_WEEKEND
            df['IS_WEEKEND'] = df['WEEK'].isin([0, 6]).astype(int)

            # Map day numbers to names for better interpretability
            day_names = {0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
                         4: 'Thursday', 5: 'Friday', 6: 'Saturday'}
            df['DAY_NAME'] = df['WEEK'].map(day_names)

            # Handle any values not in the mapping
            if df['DAY_NAME'].isnull().any():
                df['DAY_NAME'] = df['DAY_NAME'].fillna('Monday')
    else:
        # Default values
        df['DAY_NAME'] = 'Monday'
        df['IS_WEEKEND'] = 0

    return df

# # Example usage:
# if __name__ == "__main__":
#     # Example flight data
#     flight = {
#         "WEEK": "Thu",  # Day of week
#         "MKT_AIRLINE": "DL",
#         "ORIGIN_IATA": "ATL",
#         "DEST_IATA": "LAX",
#         "DISTANCE": 1950.0,
#         "SCH_DEP_TIME": 800,  # 8:00 AM
#         "DEP_DELAY": 15,  # 15 minutes departure delay
#         "PRCP": 0.0,  # No precipitation at origin
#         "DEST_PRCP": 0.0,  # No precipitation at destination
#         "EXTREME_WEATHER": 0,  # No extreme weather at origin
#         "DEST_EXTREME_WEATHER": 0  # No extreme weather at destination
#     }

#     # Path to the models directory
#     model_dir = "./arr_delay_rf_models/"

#     # Make prediction
#     result = predict_arrival_delay(model_dir, flight)

#     # Print results
#     if "error" not in result:
#         print("\nPrediction Results:")
#         print(f"Delay Probability: {result['delay_probability']:.2%}")
#         print(f"Predicted Delay: {result['delay_minutes']:.1f} minutes")
#         print(
#             f"95% Confidence Interval: [{result['delay_lower_bound']:.1f}, {result['delay_upper_bound']:.1f}] minutes")
#         print("\nFlight Characteristics:")
#         print(f"Weekend Flight: {'Yes' if result['is_weekend'] else 'No'}")
#         print(f"Late Night Arrival: {'Yes' if result['is_late_night_arrival'] else 'No'}")
#         print(f"Morning Rush Hour: {'Yes' if result['is_morning_rush'] else 'No'}")
#         print(f"Evening Rush Hour: {'Yes' if result['is_evening_rush'] else 'No'}")
#     else:
#         print(f"Error: {result['error']}")
