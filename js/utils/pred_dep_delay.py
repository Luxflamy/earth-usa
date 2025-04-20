import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import joblib
from scipy import stats


# 定义ResNet风格的块
class ResidualBlock(nn.Module):
    def __init__(self, input_dim, hidden_dim=None):
        super(ResidualBlock, self).__init__()
        if hidden_dim is None:
            hidden_dim = input_dim

        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, input_dim)
        self.bn2 = nn.BatchNorm1d(input_dim)
        self.dropout = nn.Dropout(0.2)

    def forward(self, x):
        identity = x

        out = self.fc1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.dropout(out)

        out = self.fc2(out)
        out = self.bn2(out)

        out += identity  # Skip connection
        out = self.relu(out)

        return out


class BottleneckResidualBlock(nn.Module):
    def __init__(self, input_dim, bottleneck_dim):
        super(BottleneckResidualBlock, self).__init__()

        self.fc1 = nn.Linear(input_dim, bottleneck_dim)
        self.bn1 = nn.BatchNorm1d(bottleneck_dim)
        self.fc2 = nn.Linear(bottleneck_dim, bottleneck_dim)
        self.bn2 = nn.BatchNorm1d(bottleneck_dim)
        self.fc3 = nn.Linear(bottleneck_dim, input_dim)
        self.bn3 = nn.BatchNorm1d(input_dim)

        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)

    def forward(self, x):
        identity = x

        out = self.fc1(x)
        out = self.bn1(out)
        out = self.relu(out)

        out = self.fc2(out)
        out = self.bn2(out)
        out = self.relu(out)
        out = self.dropout(out)

        out = self.fc3(out)
        out = self.bn3(out)

        out += identity  # Skip connection
        out = self.relu(out)

        return out


# 定义FlightDelayClassifier
class FlightDelayClassifier(nn.Module):
    def __init__(self, input_dim, hidden_dim=256):
        super(FlightDelayClassifier, self).__init__()

        # Initial embedding layer
        self.embedding = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3)
        )

        # Residual blocks
        self.res_block1 = ResidualBlock(hidden_dim)
        self.res_block2 = ResidualBlock(hidden_dim)
        self.res_block3 = ResidualBlock(hidden_dim)

        # Bottleneck residual block for dimensionality reduction
        self.bottleneck = BottleneckResidualBlock(hidden_dim, hidden_dim // 2)

        # Final prediction layers
        self.prediction = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        x = self.embedding(x)
        x = self.res_block1(x)
        x = self.res_block2(x)
        x = self.res_block3(x)
        x = self.bottleneck(x)
        x = self.prediction(x)
        return x


# 定义FlightDelayRegressor
class FlightDelayRegressor(nn.Module):
    def __init__(self, input_dim, hidden_dim=256):
        super(FlightDelayRegressor, self).__init__()

        # Initial embedding layer
        self.embedding = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3)
        )

        # Residual blocks
        self.res_block1 = ResidualBlock(hidden_dim)
        self.res_block2 = ResidualBlock(hidden_dim)
        self.res_block3 = ResidualBlock(hidden_dim)

        # Bottleneck residual block
        self.bottleneck = BottleneckResidualBlock(hidden_dim, hidden_dim // 2)

        # Final prediction layers
        self.prediction = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        x = self.embedding(x)
        x = self.res_block1(x)
        x = self.res_block2(x)
        x = self.res_block3(x)
        x = self.bottleneck(x)
        x = self.prediction(x)
        return x


# 加载预处理管道和模型
def load_artifacts(year):
    base_path = '/Users/apple/Documents/STAT628/Module3/earth-usa/models/dep_delay_nn'
    
    preprocessor_path = f'{base_path}/year_2021/resnet_preprocessor_2021.joblib'
    classifier_path = f'{base_path}/year_{year}/models_{year}/resnet_classifier_{year}.pth'
    regressor_path = f'{base_path}/year_{year}/models_{year}/resnet_regressor_{year}.pth'
    
    # 加载预处理器
    preprocessor = joblib.load(preprocessor_path)

    # 从笔记本我们知道预处理后特征数量是139
    input_dim = 139

    # 加载分类器
    classifier_state_dict = torch.load(classifier_path)
    classifier = FlightDelayClassifier(input_dim=input_dim)
    classifier.load_state_dict(classifier_state_dict)

    # 加载回归器
    regressor_state_dict = torch.load(regressor_path)
    regressor = FlightDelayRegressor(input_dim=input_dim)
    regressor.load_state_dict(regressor_state_dict)

    return preprocessor, classifier, regressor


# 使用硬编码的方式获取每年的RMSE值
def get_rmse(year):
    """返回对应年份的RMSE值"""
    # 根据提供的数据创建硬编码的RMSE映射
    rmse_values = {
        2021: 28.70781707763672,
        2022: 38.48480987548828,
        2023: 37.411659240722656,
        2024: 49.193267822265625
    }

    # 如果年份不在字典中，返回一个默认值
    if year not in rmse_values:
        #print(f"警告: 未找到{year}年的RMSE值，使用默认值40.0")
        return 40.0

    return rmse_values[year]


def create_advanced_time_features(df):
    df['DEP_HOUR'] = df['SCH_DEP_TIME'] // 100
    df['DEP_MINUTE'] = df['SCH_DEP_TIME'] % 100
    df['TIME_MINS'] = df['DEP_HOUR'] * 60 + df['DEP_MINUTE']
    df['HOUR_SIN'] = np.sin(2 * np.pi * df['DEP_HOUR'] / 24)  # 周期编码
    df['HOUR_COS'] = np.cos(2 * np.pi * df['DEP_HOUR'] / 24)

    # 添加从笔记本中的更多高级时间特征
    df['NORMALIZED_TIME'] = df['TIME_MINS'] / (24 * 60)

    # 12小时周期 (AM/PM 模式)
    df['HALFDAY_SIN'] = np.sin(2 * np.pi * df['DEP_HOUR'] / 12)
    df['HALFDAY_COS'] = np.cos(2 * np.pi * df['DEP_HOUR'] / 12)

    # 6小时周期 (一天四个部分)
    df['QUARTER_DAY_SIN'] = np.sin(2 * np.pi * df['DEP_HOUR'] / 6)
    df['QUARTER_DAY_COS'] = np.cos(2 * np.pi * df['DEP_HOUR'] / 6)

    # 创建高峰时段指标
    df['IS_MORNING_PEAK'] = ((df['DEP_HOUR'] >= 7) & (df['DEP_HOUR'] <= 9)).astype(int)
    df['IS_EVENING_PEAK'] = ((df['DEP_HOUR'] >= 16) & (df['DEP_HOUR'] <= 19)).astype(int)

    # 添加 TIME_BLOCK 特征
    time_blocks = {
        0: 'Late Night (0-3)',
        1: 'Late Night (0-3)',
        2: 'Late Night (0-3)',
        3: 'Early Morning (3-6)',
        4: 'Early Morning (3-6)',
        5: 'Early Morning (3-6)',
        6: 'Morning (6-9)',
        7: 'Morning (6-9)',
        8: 'Morning (6-9)',
        9: 'Mid-Day (9-12)',
        10: 'Mid-Day (9-12)',
        11: 'Mid-Day (9-12)',
        12: 'Afternoon (12-15)',
        13: 'Afternoon (12-15)',
        14: 'Afternoon (12-15)',
        15: 'Evening (15-18)',
        16: 'Evening (15-18)',
        17: 'Evening (15-18)',
        18: 'Night (18-21)',
        19: 'Night (18-21)',
        20: 'Night (18-21)',
        21: 'Late Night (21-24)',
        22: 'Late Night (21-24)',
        23: 'Late Night (21-24)'
    }
    df['TIME_BLOCK'] = df['DEP_HOUR'].map(time_blocks)

    return df


# 机场特征
def create_airport_features(df):
    hubs = ['ATL', 'DFW', 'ORD', 'LAX', 'DEN', 'CLT', 'LAS', 'PHX', 'MCO', 'SEA']
    df['IS_MAJOR_HUB_ORIGIN'] = df['ORIGIN_IATA'].isin(hubs).astype(int)
    df['IS_HUB_TO_HUB'] = 0  # 默认值

    if 'DEST_IATA' in df.columns:
        df['IS_MAJOR_HUB_DEST'] = df['DEST_IATA'].isin(hubs).astype(int)
        df['IS_HUB_TO_HUB'] = (df['IS_MAJOR_HUB_ORIGIN'] & df['IS_MAJOR_HUB_DEST']).astype(int)

    # 区域指示器
    west_coast = ['LAX', 'SFO', 'SEA', 'PDX', 'SAN', 'LAS']
    east_coast = ['JFK', 'LGA', 'EWR', 'BOS', 'DCA', 'IAD', 'MIA', 'FLL', 'ATL', 'CLT']
    central = ['ORD', 'MDW', 'DFW', 'IAH', 'DEN', 'MSP', 'DTW', 'STL']

    df['IS_WEST_COAST_ORIGIN'] = df['ORIGIN_IATA'].isin(west_coast).astype(int)
    df['IS_EAST_COAST_ORIGIN'] = df['ORIGIN_IATA'].isin(east_coast).astype(int)
    df['IS_CENTRAL_ORIGIN'] = df['ORIGIN_IATA'].isin(central).astype(int)

    if 'DEST_IATA' in df.columns:
        df['IS_WEST_COAST_DEST'] = df['DEST_IATA'].isin(west_coast).astype(int)
        df['IS_EAST_COAST_DEST'] = df['DEST_IATA'].isin(east_coast).astype(int)
        df['IS_CENTRAL_DEST'] = df['DEST_IATA'].isin(central).astype(int)

        # 跨大陆航班指示器
        df['IS_TRANSCON'] = ((df['IS_WEST_COAST_ORIGIN'] & df['IS_EAST_COAST_DEST']) |
                             (df['IS_EAST_COAST_ORIGIN'] & df['IS_WEST_COAST_DEST'])).astype(int)

    # 创建距离分类特征
    if 'DISTANCE' in df.columns:
        df['DISTANCE_CAT'] = pd.cut(
            df['DISTANCE'],
            bins=[0, 500, 1000, 1500, 2000, float('inf')],
            labels=['Very Short', 'Short', 'Medium', 'Long', 'Very Long']
        )

        # 对距离进行标准化
        max_dist = 3000  # 基于经验设定最大距离
        df['NORMALIZED_DISTANCE'] = df['DISTANCE'] / max_dist

        # 创建对数距离特征
        df['LOG_DISTANCE'] = np.log1p(df['DISTANCE'])

    return df


# 添加天气特征函数
def create_weather_features(df):
    """
    创建高级天气特征

    Args:
        df: 包含天气信息的DataFrame

    Returns:
        添加了天气特征的DataFrame
    """
    # 创建一个副本以避免修改原始数据
    df = df.copy()

    # 检查是否有基本天气特征
    if 'PRCP' in df.columns:
        # 创建降水类别
        df['RAIN_SEVERITY'] = pd.cut(
            df['PRCP'],
            bins=[-0.01, 0.0, 0.1, 0.5, 1.0, float('inf')],
            labels=[0, 1, 2, 3, 4]
        ).astype(int)
    else:
        # 如果没有降水数据，创建默认值
        df['RAIN_SEVERITY'] = 0
        df['PRCP'] = 0.0

    # 确保极端天气标记存在
    if 'EXTREME_WEATHER' not in df.columns:
        df['EXTREME_WEATHER'] = 0

    # 组合天气特征
    df['WEATHER_SCORE'] = df['RAIN_SEVERITY'] + df['EXTREME_WEATHER'] * 3

    # 创建天气交互特征
    if 'IS_MAJOR_HUB_ORIGIN' in df.columns and 'WEATHER_SCORE' in df.columns:
        df['HUB_WEATHER_IMPACT'] = df['IS_MAJOR_HUB_ORIGIN'] * df['WEATHER_SCORE']

    # 创建时间-天气交互
    if 'IS_MORNING_PEAK' in df.columns and 'IS_EVENING_PEAK' in df.columns and 'WEATHER_SCORE' in df.columns:
        df['PEAK_WEATHER_IMPACT'] = (df['IS_MORNING_PEAK'] | df['IS_EVENING_PEAK']) * df['WEATHER_SCORE']

    return df


# 创建日特征函数 - 修正星期处理 (星期一到星期六为1-6，星期日为0)
def create_advanced_day_features(df):
    """
    创建高级日期特征，包括周期性编码

    Args:
        df: 包含DAY, MONTH, YEAR等数据的DataFrame

    Returns:
        添加了日期特征的DataFrame
    """
    # 创建一个副本以避免修改原始数据
    df = df.copy()

    # 添加 DAY_NAME 特征 - 修正映射，使用日期库的标准（周一-周六为1-6，周日为0）
    day_map = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
        0: 'Sunday'
    }

    # 根据日期信息添加星期几
    if all(col in df.columns for col in ['YEAR', 'MONTH', 'DAY']):
        try:
            # 创建日期对象
            df['DATE'] = pd.to_datetime(df[['YEAR', 'MONTH', 'DAY']])

            # 提取星期几 (Python 默认周一为0，周日为6)
            python_weekday = df['DATE'].dt.weekday  # 0-6 (周一-周日)

            # 转换为所需的格式 (周一-周六为1-6，周日为0)
            df['DAY_OF_WEEK'] = (python_weekday + 1) % 7  # 转换为周一=1,...,周六=6,周日=0

            # 添加星期几名称
            df['DAY_NAME'] = df['DAY_OF_WEEK'].map(day_map)

            # 创建周末指示器
            df['IS_WEEKEND'] = ((df['DAY_OF_WEEK'] == 6) | (df['DAY_OF_WEEK'] == 0)).astype(int)

            # 创建周期性编码
            df['DAY_SIN'] = np.sin(2 * np.pi * df['DAY_OF_WEEK'] / 7)
            df['DAY_COS'] = np.cos(2 * np.pi * df['DAY_OF_WEEK'] / 7)

            # 周末/工作日周期
            df['WEEKDAY_SIN'] = np.sin(np.pi * df['IS_WEEKEND'])
            df['WEEKDAY_COS'] = np.cos(np.pi * df['IS_WEEKEND'])

            # 工作周特征 (5天周期，用于工作日)
            workday_map = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: np.nan, 0: np.nan}  # 映射到0-4
            df['WORKWEEK_DAY'] = df['DAY_OF_WEEK'].map(workday_map)

            # 将周末填充为工作日的平均值
            work_day_mean = 2  # 默认为中间值
            df['WORKWEEK_DAY'] = df['WORKWEEK_DAY'].fillna(work_day_mean)

            # 工作周期
            df['WORKWEEK_SIN'] = np.sin(2 * np.pi * df['WORKWEEK_DAY'] / 5)
            df['WORKWEEK_COS'] = np.cos(2 * np.pi * df['WORKWEEK_DAY'] / 5)
        except Exception as e:
            #print(f"Error creating date features: {e}")
            # 如果无法创建日期，则添加默认值
            df['DAY_OF_WEEK'] = 1  # 默认周一
            df['DAY_NAME'] = 'Monday'  # 默认星期一
            df['IS_WEEKEND'] = 0
            df['DAY_SIN'] = np.sin(2 * np.pi * 1 / 7)  # 周一的sin值
            df['DAY_COS'] = np.cos(2 * np.pi * 1 / 7)  # 周一的cos值
            df['WEEKDAY_SIN'] = 0
            df['WEEKDAY_COS'] = 1
            df['WORKWEEK_SIN'] = np.sin(2 * np.pi * 0 / 5)  # 周一的工作周sin值
            df['WORKWEEK_COS'] = np.cos(2 * np.pi * 0 / 5)  # 周一的工作周cos值
    else:
        # 如果缺少日期列，使用默认值
        df['DAY_OF_WEEK'] = 1  # 默认周一
        df['DAY_NAME'] = 'Monday'  # 默认星期一
        df['IS_WEEKEND'] = 0
        df['DAY_SIN'] = np.sin(2 * np.pi * 1 / 7)  # 周一的sin值
        df['DAY_COS'] = np.cos(2 * np.pi * 1 / 7)  # 周一的cos值
        df['WEEKDAY_SIN'] = 0
        df['WEEKDAY_COS'] = 1
        df['WORKWEEK_SIN'] = np.sin(2 * np.pi * 0 / 5)  # 周一的工作周sin值
        df['WORKWEEK_COS'] = np.cos(2 * np.pi * 0 / 5)  # 周一的工作周cos值

    return df


# 红眼航班指示器
def create_redeye_indicator(df):
    """
    创建红眼航班指示器 (凌晨0-6点起飞或到达的航班)

    Args:
        df: 包含SCH_DEP_TIME和SCH_ARR_TIME的DataFrame

    Returns:
        添加了IS_REDEYE列的DataFrame
    """
    # 创建一个副本以避免修改原始数据
    df = df.copy()

    # 初始化IS_REDEYE为0 (非红眼航班)
    df['IS_REDEYE'] = 0

    # 根据起飞时间 (0-6 AM) 识别红眼航班
    if 'SCH_DEP_TIME' in df.columns:
        # 时间格式为HHMM (例如, 130 = 1:30 AM, 545 = 5:45 AM)
        redeye_departure = (df['SCH_DEP_TIME'] >= 0) & (df['SCH_DEP_TIME'] < 600)
        df.loc[redeye_departure, 'IS_REDEYE'] = 1

    # 根据到达时间 (0-6 AM) 识别红眼航班
    if 'SCH_ARR_TIME' in df.columns:
        redeye_arrival = (df['SCH_ARR_TIME'] >= 0) & (df['SCH_ARR_TIME'] < 600)
        df.loc[redeye_arrival, 'IS_REDEYE'] = 1

    return df


# 生成预测（包括置信区间）- 使用硬编码的RMSE值
def predict_delay(new_data, confidence=0.95):
    """
    对航班延误进行预测，包括基于每年RMSE的不确定性估计

    Args:
        new_data: 输入数据DataFrame
        year: 模型年份
        confidence: 置信区间水平 (默认0.95表示95%置信区间)

    Returns:
        tuple: (延误概率, 延误时间, 延误时间置信区间下界, 延误时间置信区间上界)
    """
    # 加载预处理和模型
    year = new_data['YEAR'][0]

    preprocessor, classifier, regressor = load_artifacts(year)

    # 确保输入数据包含所有必要特征
    required_features = [
        'SCH_DEP_TIME', 'ORIGIN_IATA', 'DEST_IATA', 'DISTANCE', 'PRCP',
        'MONTH', 'DAY', 'YEAR', 'MKT_AIRLINE', 'EXTREME_WEATHER'
    ]
    assert all(feat in new_data.columns for feat in required_features), "Missing required features"

    # 应用相同的特征工程
    processed_data = create_redeye_indicator(new_data)
    processed_data = create_advanced_time_features(processed_data)
    processed_data = create_advanced_day_features(processed_data)
    processed_data = create_airport_features(processed_data)
    processed_data = create_weather_features(processed_data)

    # 预处理数据
    X_processed = preprocessor.transform(processed_data)
    X_tensor = torch.FloatTensor(X_processed)

    # 设置模型为评估模式
    classifier.eval()
    regressor.eval()

    # 进行预测
    with torch.no_grad():
        delay_prob = classifier(X_tensor).numpy()  # 延误概率
        delay_time = regressor(X_tensor).numpy()  # 预测延误分钟数

    # 获取该年份的RMSE值
    rmse = get_rmse(year)
    #print(f"使用{year}年的RMSE值: {rmse}")

    # 计算Z值对应的置信区间
    z_value = stats.norm.ppf(1 - (1 - confidence) / 2)

    # 计算置信区间
    ci_lower = delay_time - z_value * rmse
    ci_upper = delay_time + z_value * rmse

    # 确保下界不为负
    ci_lower = np.maximum(ci_lower, 0)

    return delay_prob, delay_time, ci_lower, ci_upper


# # 示例使用
# if __name__ == "__main__":
#     # 示例输入数据（需要包含所有必要特征）
#     sample_data = pd.DataFrame({
#         'SCH_DEP_TIME': [1345],  # 计划起飞时间（HHMM）
#         'ORIGIN_IATA': ['JFK'],  # 起飞机场代码
#         'DEST_IATA': ['LAX'],  # 到达机场代码
#         'DISTANCE': [2475],  # 飞行距离（英里）
#         'PRCP': [0.1],  # 降水量
#         'MONTH': [5],  # 月份
#         'DAY': [15],  # 日期
#         'YEAR': [2024],  # 年份
#         'MKT_AIRLINE': ['AA'],  # 航空公司代码
#         'EXTREME_WEATHER': [0]  # 极端天气标志
#     })

#     # 进行预测，包括置信区间
#     probs, delays, ci_lower, ci_upper = predict_delay(sample_data)

#     # 打印结果
#     print(f"Delay Probability: {probs[0][0]:.2%}")
#     print(f"Predicted Delay: {delays[0][0]:.1f} minutes")
#     print(f"95% Confidence Interval: [{ci_lower[0][0]:.1f}, {ci_upper[0][0]:.1f}] minutes")