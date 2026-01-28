#!/bin/bash
# 完了音（キラキラ） - Claudeがタスク完了時に鳴らす
# WSL2環境でPowerShellを呼び出してビープ音を鳴らす

powershell.exe -NoProfile -NonInteractive "
[console]::beep(523, 80)
[console]::beep(659, 80)
[console]::beep(783, 80)
[console]::beep(1046, 120)
" 2>/dev/null

exit 0
