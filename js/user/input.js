export function collectFlightData() {
    const fromInput = document.querySelector('#from');
    const toInput = document.querySelector('#to');
    const timeInput = document.querySelector('#time');
    const flightNumberInput = document.querySelector('#flight-number');
    const searchButton = document.querySelector('#search-btn');

    searchButton.addEventListener('click', () => {
        const flightData = {
            from: fromInput.value.trim().toUpperCase(),
            to: toInput.value.trim().toUpperCase(),
            time: timeInput.value,
            flightNumber: flightNumberInput.value.trim().toUpperCase(),
        };

        // 将数据传递给处理函数
        handleFlightData(flightData);
    });
}

function handleFlightData(flightData) {
    console.log('Collected Flight Data:', flightData);

    // 获取或创建右侧版面组件
    let displayPanel = document.querySelector('.display-panel');
    if (!displayPanel) {
        displayPanel = document.createElement('div');
        displayPanel.classList.add('display-panel');
        document.body.appendChild(displayPanel);

        // 强制触发重绘以确保动画生效
        void displayPanel.offsetWidth;
    }

    // 清空内容并添加新的航班信息卡片
    displayPanel.innerHTML = `
        <div class="flight-card">
            <h3>Flight Information</h3>
            <div class="flight-card-content">
                <p><strong>From:</strong> ${flightData.from}</p>
                <p><strong>To:</strong> ${flightData.to}</p>
                <p><strong>Time:</strong> ${flightData.time}</p>
                <p><strong>Flight Number:</strong> ${flightData.flightNumber}</p>
            </div>
        </div>
    `;

    // 添加显示动画
    displayPanel.classList.add('visible');
}
