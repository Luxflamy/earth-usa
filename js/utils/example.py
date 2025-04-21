from flask import Flask, request, jsonify
from flask_cors import CORS  # 允许跨域请求
import logging
import os
import pandas as pd
from pred_cancelled_prob import predict_flight_cancellation, get_airport_distance
from pred_dep_delay import predict_delay
from pred_arr_delay import predict_arrival_delay

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
        
        # 获取日期信息
        year = int(flight_data.get('year', 2024))
        month = 1  # 默认值，如果前端没有提供月份信息
        day = 1    # 默认值，如果前端没有提供日期信息
        
        # 从time字段提取月和日，如果有的话
        if flight_data.get('time'):
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(flight_data.get('time').replace('Z', '+00:00'))
                month = dt.month
                day = dt.day
            except Exception as e:
                logging.warning(f"无法从时间字符串解析月/日: {e}")
        
        # Prepare data for cancellation prediction
        prediction_data = {
            "YEAR": year,
            "WEEK": int(flight_data.get('week', 1)),
            "MKT_AIRLINE": airline_code,
            "ORIGIN_IATA": flight_data.get('from', ''),
            "DEST_IATA": flight_data.get('to', ''),
            "DISTANCE": distance,
            "DEP_TIME": float(flight_data.get('depTime', 0)),
            "EXTREME_WEATHER": extreme_weather,
            "PRCP": rainfall
        }
        
        # 日志记录输入数据
        logging.debug(f"预测输入数据: {prediction_data}")
        
        # 获取模型路径 - 根据输入年份选择对应模型
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 可用模型年份列表
        available_years = [2021, 2022, 2023, 2024]
        
        # 如果输入年份在可用模型列表中，直接使用对应年份的模型
        if year in available_years:
            model_year = year
        else:
            # 否则找到最接近的年份
            available_years.sort()
            model_year = min(available_years, key=lambda x: abs(x - year))
            logging.debug(f"No model for year {year}, using closest available model from {model_year}")
        
        model_path = os.path.normpath(os.path.join(current_dir, f"../../models/cancelled_prob/May{model_year}_model.joblib"))
        
        # 获取取消概率预测
        result = predict_flight_cancellation(model_path, prediction_data)
        
        # 将模型输入数据包含在响应中
        result['model_input'] = prediction_data
        
        # 检查航班是否为红眼航班
        dep_time = float(prediction_data.get('DEP_TIME', 0))
        is_redeye = 0
        if 0 <= dep_time < 600:
            is_redeye = 1
        result['model_input']['IS_REDEYE'] = is_redeye
        
        # 添加延误预测部分
        # 准备用于延误预测的数据
        delay_data = pd.DataFrame({
            'SCH_DEP_TIME': [dep_time],
            'ORIGIN_IATA': [prediction_data["ORIGIN_IATA"]],
            'DEST_IATA': [prediction_data["DEST_IATA"]],
            'DISTANCE': [distance],
            'PRCP': [rainfall],
            'MONTH': [month],
            'DAY': [day],
            'YEAR': [year],
            'MKT_AIRLINE': [airline_code],
            'EXTREME_WEATHER': [extreme_weather]
        })
        
        try:
            # 获取延误预测
            delay_probs, delay_times, ci_lower, ci_upper = predict_delay(delay_data)
            
            # 将延误预测添加到结果中
            result['delay_probability'] = float(delay_probs[0][0])
            result['predicted_delay_minutes'] = float(delay_times[0][0])
            result['delay_confidence_interval'] = {
                'lower': float(ci_lower[0][0]),
                'upper': float(ci_upper[0][0])
            }
            
            logging.debug(f"延误概率: {result['delay_probability']:.4f}")
            logging.debug(f"预测延误: {result['predicted_delay_minutes']:.1f} 分钟")
            logging.debug(f"延误置信区间: [{result['delay_confidence_interval']['lower']:.1f}, {result['delay_confidence_interval']['upper']:.1f}] 分钟")
            
            # 获取到达延迟预测
            try:
                # 准备到达延迟预测的输入数据
                arr_delay_input = {
                    'SCH_DEP_TIME': float(prediction_data.get('DEP_TIME', 0)),
                    'ORIGIN_IATA': prediction_data['ORIGIN_IATA'],
                    'DEST_IATA': prediction_data['DEST_IATA'],
                    'DISTANCE': distance,
                    'PRCP': rainfall,
                    'MONTH': month,
                    'DAY': day,
                    'YEAR': year,
                    'MKT_AIRLINE': airline_code,
                    'EXTREME_WEATHER': extreme_weather,
                    'WEEK': prediction_data['WEEK'],
                    'DEP_DELAY': float(delay_times[0][0])  # 使用预测的出发延迟作为输入
                }
                
                # 获取模型路径
                arr_delay_model_dir = os.path.normpath(os.path.join(current_dir, "../../models/arr_delay_rf_models"))
                
                # 调用到达延迟预测函数
                arr_delay_result = predict_arrival_delay(arr_delay_model_dir, arr_delay_input, year=model_year)
                
                # 将到达延迟预测添加到结果中
                if "error" not in arr_delay_result:
                    result['arrival_delay'] = {
                        'predicted': arr_delay_result['delay_predicted'],
                        'probability': float(arr_delay_result['delay_probability']),
                        'minutes': float(arr_delay_result['delay_minutes']),
                        'confidence_interval': {
                            'lower': float(arr_delay_result['delay_lower_bound']),
                            'upper': float(arr_delay_result['delay_upper_bound'])
                        },
                        'is_weekend': arr_delay_result['is_weekend'],
                        'is_late_night_arrival': arr_delay_result['is_late_night_arrival'],
                        'is_morning_rush': arr_delay_result['is_morning_rush'],
                        'is_evening_rush': arr_delay_result['is_evening_rush']
                    }
                    logging.debug(f"到达延迟概率: {result['arrival_delay']['probability']:.4f}")
                    logging.debug(f"预测到达延迟: {result['arrival_delay']['minutes']:.1f} 分钟")
                    logging.debug(f"到达延迟置信区间: [{result['arrival_delay']['confidence_interval']['lower']:.1f}, {result['arrival_delay']['confidence_interval']['upper']:.1f}] 分钟")
                else:
                    logging.warning(f"到达延迟预测错误: {arr_delay_result['error']}")
                    result['arrival_delay_error'] = arr_delay_result['error']
                
            except Exception as e:
                logging.error(f"到达延迟预测错误: {e}")
                result['arrival_delay_error'] = str(e)
            
        except Exception as e:
            logging.error(f"延误预测错误: {e}")
            result['delay_error'] = str(e)
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"预测错误: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

