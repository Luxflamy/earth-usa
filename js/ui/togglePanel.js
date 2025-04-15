export function addToggleFunctionality(panel, onToggleCallback) {
    const toggleBtn = document.createElement('button');
    toggleBtn.classList.add('toggle-panel-btn');
    toggleBtn.textContent = '❮';
    document.body.appendChild(toggleBtn); // 将按钮添加到 body，而不是面板

    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        toggleBtn.textContent = panel.classList.contains('hidden') ? '❯' : '❮'; // 切换按钮箭头方向

        if (onToggleCallback) {
            onToggleCallback(); // 调用同步回调
        }
    });

    // 同步按钮位置
    const updateButtonPosition = () => {
        const panelRect = panel.getBoundingClientRect();
        toggleBtn.style.top = `${panelRect.top + panelRect.height / 2}px`; // 按钮垂直居中
    };

    // 初始位置更新
    updateButtonPosition();

    // 监听窗口大小变化，实时更新按钮位置
    window.addEventListener('resize', updateButtonPosition);
}
