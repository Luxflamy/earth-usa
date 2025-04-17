from flask import Flask, request, jsonify
from flask_cors import CORS  # 允许跨域请求

app = Flask(__name__)
CORS(app)  # 启用跨域支持

@app.route('/run-python', methods=['POST'])
def run_python():
    data = request.json
    user_input = data.get('input', '')
    # 简单处理输入并返回结果
    output = f"{user_input.replace(',', ' >> ')}"
    return jsonify({'output': output})

if __name__ == '__main__':
    app.run(debug=True)
