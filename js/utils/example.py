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
        # logging.debug(f"Received flight data for prediction: {flight_data}") # 调试接收到的航班数据
        
        # 首先尝试使用前端传递的距离值，如果为0或不存在，则通过函数计算
        distance = flight_data.get('distance', 0)
        if distance == 0:
            # 如果前端传递的距离为0，则通过函数计算
            distance = get_airport_distance(flight_data.get('from', ''), flight_data.get('to', ''))
            logging.debug(f"Distance calculated from function: {distance}")
        else:
            logging.debug(f"Using distance provided by frontend: {distance}")
        
        # 调试和处理航空公司代码
        airline_code = flight_data.get('airline', '')
        # 如果航空公司代码为空但是航班号不为空，从航班号中提取航空公司代码
        if not airline_code and flight_data.get('flightNumber', ''):
            airline_code = flight_data.get('flightNumber', '')[:2]  # 通常航空公司代码是航班号的前两个字符
        # 如果还是空，使用默认值
        if not airline_code:
            airline_code = "DL"  # 使用Delta航空作为默认值
        
        # 获取前端传来的极端天气值
        extreme_weather = int(flight_data.get('extremeWeather', 0))
        
        # 获取前端传来的降雨量值
        rainfall = float(flight_data.get('rainfall', 0.0))
        
        # Prepare data for prediction with proper data from input form
        prediction_data = {
            "YEAR": int(flight_data.get('year', 2024)),
            "WEEK": int(flight_data.get('week', 1)),
            "MKT_AIRLINE": airline_code,
            "ORIGIN_IATA": flight_data.get('from', ''),
            "DEST_IATA": flight_data.get('to', ''),
            "DISTANCE": distance,
            "DEP_TIME": float(flight_data.get('depTime', 0)),
            "EXTREME_WEATHER": extreme_weather,  # 极端天气参数
            "PRCP": rainfall                     # 降雨量参数
        }
        
        logging.debug(f"Time: {float(flight_data.get('depTime', 0))}")
        # 添加极端天气和降雨量的调试信息
        logging.debug(f"Extreme Weather: {extreme_weather}")
        logging.debug(f"Rainfall: {rainfall} mm")
        
        # Get model path - 根据输入年份选择对应模型
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 获取用户输入的年份
        input_year = prediction_data["YEAR"]
        
        # 可用模型年份列表
        available_years = [2021, 2022, 2023, 2024]
        
        # 如果输入年份在可用模型列表中，直接使用对应年份的模型
        if input_year in available_years:
            model_year = input_year
        else:
            # 否则找到最接近的年份
            available_years.sort()  # 确保年份有序
            model_year = min(available_years, key=lambda x: abs(x - input_year))
            logging.debug(f"No model for year {input_year}, using closest available model from {model_year}")
        
        model_path = os.path.normpath(os.path.join(current_dir, f"../../models/cancelled_prob/May{model_year}_model.joblib"))
        
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
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
