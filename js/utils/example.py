from flask import Flask, request, jsonify
from flask_cors import CORS  # 允许跨域请求
import logging
import os
from pred_cancelled_prob import predict_flight_cancellation, get_airport_distance

app = Flask(__name__)
CORS(app)  # 启用跨域支持

# 配置日志记录
logging.basicConfig(level=logging.DEBUG)

@app.route('/run-python', methods=['POST'])
def run_python():
    try:
        data = request.json
        logging.debug(f"Received data: {data}")
        user_input = data.get('input', '')
        output = f"{user_input.replace(',', ' >> ')}"
        return jsonify({'output': output})
    except Exception as e:
        logging.error(f"Error occurred: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/predict-cancellation', methods=['POST'])
def predict_cancellation():
    try:
        # Get flight data from request
        flight_data = request.json.get('flightData', {})
        logging.debug(f"Received flight data for prediction: {flight_data}")
        
        # Initialize DISTANCE with default value 1
        distance = get_airport_distance(flight_data.get('from', ''), flight_data.get('to', ''))
        
        # Prepare data for prediction with proper data from input form
        prediction_data = {
            "YEAR": int(flight_data.get('year', 2024)),
            "WEEK": int(flight_data.get('week', 1)),
            "MKT_AIRLINE": flight_data.get('airline', ''),
            "ORIGIN_IATA": flight_data.get('from', ''),
            "DEST_IATA": flight_data.get('to', ''),
            "DISTANCE": distance,
            "DEP_TIME": float(flight_data.get('depTime', 0))
        }
        
        # Log the actual prediction data for debugging
        logging.debug(f"Using prediction data: {prediction_data}")
        
        # Get model path - Fix the path to correctly point to the model
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.normpath(os.path.join(current_dir, "../../models/cancelled_prob/May2021_model.joblib"))
        
        # Log the path to help with debugging
        logging.debug(f"Looking for model at: {model_path}")
        
        # Make prediction
        result = predict_flight_cancellation(model_path, prediction_data)
        
        # Include the actual model input data in the response for debugging
        result['model_input'] = prediction_data
        
        # Add additional derived features for better debugging
        # Check if the flight is classified as a red-eye
        dep_time = float(prediction_data.get('DEP_TIME', 0))
        is_redeye = 0
        if 0 <= dep_time < 600:
            is_redeye = 1
        result['model_input']['IS_REDEYE'] = is_redeye
        result['model_input']['PRCP'] = 0.0  # Default value used
        result['model_input']['EXTREME_WEATHER'] = 0  # Default value used
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
