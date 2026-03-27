const path = require('path')
const fs = require('fs')

exports.default = async function (context) {
  if (context.electronPlatformName === 'darwin') {
    const aria2Path = path.join(context.appOutDir, 'resources', 'aria2c')
    if (fs.existsSync(aria2Path)) {
      fs.chmodSync(aria2Path, 0o755)
      console.log('[afterPack] Set aria2c executable on macOS')
    }
  }
}
