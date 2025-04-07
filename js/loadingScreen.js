export function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex'; // 显示加载页面
    }
}

export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // 添加延迟以确保动画平滑结束
        setTimeout(() => {
            loadingScreen.style.opacity = '0'; // 渐隐动画
            setTimeout(() => {
                loadingScreen.style.display = 'none'; // 隐藏加载页面
            }, 500); // 与CSS动画时间一致
        }, 300); // 确保页面完全加载后再开始渐隐
    }
}
