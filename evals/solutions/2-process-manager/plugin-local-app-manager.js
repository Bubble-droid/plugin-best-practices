/**
 * 本地小程序管理器
 *
 * 管理一个本地小程序（进程）：
 * - 安装时按配置的下载地址拉取程序压缩包，解压到 data/third/plugin-local-app-manager；
 * - 首次安装写入一份默认配置文件 menu-config.yaml（已存在则不覆盖）；
 * - 右键菜单可启动 / 停止程序，启动参数固定为 `-c <menu-config.yaml>`；
 * - 卸载时删除程序目录与临时下载目录，销毁时停止仍在运行的进程。
 *
 * 由于不同程序的发布地址、可执行文件名和配置内容并不相同，这些信息通过插件配置项提供：
 * - DownloadUrl      程序压缩包直链（.zip / .tar.gz）
 * - ExecutableName   压缩包内主程序的文件名，例如 local-app.exe 或 local-app
 * - ConfigContent    menu-config.yaml 的默认内容
 * - AutoStartOrStop  是否跟随 GUI 启动 / 停止
 */

const THIRD_DIR = 'data/third/plugin-local-app-manager'
const CACHE_DIR = 'data/.cache/plugin-local-app-manager'
const CONFIG_FILE = THIRD_DIR + '/menu-config.yaml'
const PID_FILE = THIRD_DIR + '/program.pid'

const DEFAULT_CONFIG = `# 本地小程序配置文件
# 安装时写入；文件已存在则不会覆盖，可放心修改
log:
  level: info
listen: 127.0.0.1:8080
`

/** @type {EsmPlugin} */
export default (plugin) => {
  const { env } = Plugins.useEnvStore()
  const isWindows = env.os === 'windows'

  /** 把配置项安全地读成字符串，缺省时回落到默认值 */
  const configValue = (key, fallback = '') => {
    const raw = plugin[key]
    if (typeof raw === 'string') return raw.trim() || fallback
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim() || fallback
    return fallback
  }

  const executableName = () => configValue('ExecutableName', isWindows ? 'local-app.exe' : 'local-app')

  /** 用于和 ProcessInfo 返回的进程名做匹配 */
  const processName = () =>
    executableName()
      .toLowerCase()
      .replace(/\.exe$/, '')

  const writePid = (pid) => Plugins.ignoredError(Plugins.WriteFile, PID_FILE, String(pid))

  /** 读取记录的 PID，并通过 ProcessInfo 确认它确实属于当前程序 */
  const isRunning = async () => {
    const pid = await Plugins.ignoredError(Plugins.ReadFile, PID_FILE)
    if (!pid || pid === '0') return false
    const name = await Plugins.ignoredError(Plugins.ProcessInfo, Number(pid))
    return Boolean(name && name.toLowerCase().includes(processName()))
  }

  /** 仅在配置文件不存在时写入默认内容，避免覆盖用户修改 */
  const ensureConfig = async () => {
    if (await Plugins.FileExists(CONFIG_FILE)) return
    await Plugins.MakeDir(THIRD_DIR)
    await Plugins.WriteFile(CONFIG_FILE, configValue('ConfigContent', DEFAULT_CONFIG))
  }

  /** 停止程序：优先杀掉记录的 PID，再把 PID 清空 */
  const stopProgram = async () => {
    const pid = await Plugins.ignoredError(Plugins.ReadFile, PID_FILE)
    if (pid && pid !== '0') {
      await Plugins.ignoredError(Plugins.KillProcess, Number(pid))
    }
    await writePid('0')
  }

  /** 在程序目录中查找可执行文件，找不到则返回空串 */
  const findExecutable = async () => {
    const name = executableName()
    const direct = `${THIRD_DIR}/${name}`
    if (await Plugins.FileExists(direct)) return direct

    // 有些压缩包会多套一层目录，做一次浅层广度优先搜索
    const pending = [THIRD_DIR]
    let depth = 0
    while (pending.length > 0 && depth < 4) {
      const size = pending.length
      for (let i = 0; i < size; i++) {
        const dir = pending.shift()
        const entries = (await Plugins.ignoredError(Plugins.ReadDir, dir)) || []
        for (const entry of entries) {
          const path = `${dir}/${entry.name}`
          if (!entry.isDir && entry.name.toLowerCase() === name.toLowerCase()) return path
          if (entry.isDir) pending.push(path)
        }
      }
      depth += 1
    }
    return ''
  }

  /** 启动程序，启动参数固定为 `-c <配置文件绝对路径>` */
  const startProgram = async () => {
    const binFile = await findExecutable()
    if (!binFile) throw `未找到可执行文件「${executableName()}」，请检查【可执行文件名】配置或重新安装程序`

    await ensureConfig()

    const executable = await Plugins.AbsolutePath(binFile)
    const configPath = await Plugins.AbsolutePath(CONFIG_FILE)
    const workingDirectory = await Plugins.AbsolutePath(THIRD_DIR)

    let output = ''
    const pid = await Plugins.ExecBackground(
      executable,
      ['-c', configPath],
      (out) => {
        output = (output + out).slice(-2000)
        console.log(`[${plugin.name}]`, out)
      },
      async (out) => {
        output = (output + out).slice(-2000)
        await writePid('0')
      },
      { WorkingDirectory: workingDirectory }
    )
    await writePid(pid)

    // 稍等片刻，确认进程没有立刻退出（例如配置写错）
    await Plugins.sleep(500)
    if (!(await isRunning())) {
      await writePid('0')
      throw `本地小程序启动失败${output ? `：\n${output}` : ''}`
    }
    return pid
  }

  /** 下载压缩包、解压到第三方目录，并补齐默认配置文件 */
  const installProgram = async () => {
    const url = configValue('DownloadUrl')
    if (!url) {
      Plugins.message.warn('尚未填写【程序压缩包下载地址】，已跳过下载；请在配置中填写后点击【重新安装程序】')
      return false
    }

    const isTarGz = /\.(tar\.gz|tgz)$/i.test(url)
    const archiveFile = `${CACHE_DIR}/package${isTarGz ? '.tar.gz' : '.zip'}`
    const message = Plugins.message.info('开始下载本地小程序压缩包...', 999999999)

    try {
      await Plugins.MakeDir(THIRD_DIR)
      await Plugins.MakeDir(CACHE_DIR)

      await Plugins.Download(url, archiveFile, {}, (progress, total) => {
        if (total > 0) Plugins.message.update(message.id, `下载本地小程序压缩包：${((progress / total) * 100).toFixed(2)}%`)
      })

      message.update('正在解压本地小程序压缩包...')
      if (isTarGz) {
        await Plugins.UnzipTarGZFile(archiveFile, THIRD_DIR)
      } else {
        await Plugins.UnzipZIPFile(archiveFile, THIRD_DIR)
      }

      const binFile = await findExecutable()
      if (!binFile) throw `解压完成，但未找到可执行文件「${executableName()}」，请检查【可执行文件名】配置`
      if (!isWindows) {
        await Plugins.ignoredError(Plugins.Exec, 'chmod', ['+x', await Plugins.AbsolutePath(binFile)])
      }

      await ensureConfig()
      message.update('本地小程序安装完成', 'success')
      return true
    } finally {
      await Plugins.ignoredError(Plugins.RemoveFile, archiveFile)
      await Plugins.sleep(1000)
      Plugins.message.destroy(message.id)
    }
  }

  /** 插件钩子 - 安装插件时下载并解压程序 */
  const onInstall = async () => {
    await installProgram()
    return 0
  }

  /** 插件钩子 - 卸载插件时清理程序与临时文件 */
  const onUninstall = async () => {
    if (await isRunning()) {
      throw '请先停止本地小程序后再卸载'
    }

    const confirmed = await Plugins.confirm('确定卸载本地小程序吗？', `将删除程序目录：${THIRD_DIR}\n以及临时下载目录：${CACHE_DIR}`)
    if (!confirmed) return 0

    await Plugins.ignoredError(Plugins.RemoveFile, THIRD_DIR)
    await Plugins.ignoredError(Plugins.RemoveFile, CACHE_DIR)
    return 0
  }

  /** 插件钩子 - 销毁插件时释放运行中的进程 */
  const onDispose = async () => {
    if (await isRunning()) {
      await stopProgram()
    }
    return 2
  }

  /** 插件钩子 - 点击运行按钮时 */
  const onRun = async () => {
    if (await isRunning()) {
      Plugins.message.info('本地小程序已在运行')
      return 1
    }
    await startProgram()
    Plugins.message.success('本地小程序启动成功')
    return 1
  }

  /** 插件钩子 - 启动 GUI 时 */
  const onStartup = async () => {
    if (plugin.AutoStartOrStop && !(await isRunning())) {
      await startProgram()
      return 1
    }
  }

  /** 插件钩子 - 关闭 GUI 时 */
  const onShutdown = async () => {
    if (plugin.AutoStartOrStop && (await isRunning())) {
      await stopProgram()
      return 2
    }
  }

  /** 插件菜单项 - 启动程序 */
  const Start = async () => {
    if (await isRunning()) {
      throw '本地小程序已在运行'
    }
    await startProgram()
    Plugins.message.success('本地小程序启动成功')
    return 1
  }

  /** 插件菜单项 - 停止程序 */
  const Stop = async () => {
    if (!(await isRunning())) {
      throw '本地小程序并未运行'
    }
    await stopProgram()
    Plugins.message.success('本地小程序已停止')
    return 2
  }

  /** 插件菜单项 - 重新下载并解压程序 */
  const Reinstall = async () => {
    if (await isRunning()) {
      await stopProgram()
      Plugins.message.warn('已停止运行中的本地小程序')
    }
    const installed = await installProgram()
    if (!installed) throw '请先填写【程序压缩包下载地址】'
    Plugins.message.success('本地小程序重新安装完成')
    return 0
  }

  /** 插件菜单项 - 打开配置文件 */
  const Config = async () => {
    await ensureConfig()
    Plugins.BrowserOpenURL(await Plugins.AbsolutePath(CONFIG_FILE))
  }

  /** 插件菜单项 - 打开程序目录 */
  const OpenDir = async () => {
    if (!(await Plugins.FileExists(CONFIG_FILE)) && !(await findExecutable())) {
      throw '程序尚未安装，请先配置下载地址并点击【重新安装程序】'
    }
    await Plugins.OpenDir(THIRD_DIR)
  }

  return {
    onInstall,
    onUninstall,
    onDispose,
    onRun,
    onStartup,
    onShutdown,
    Start,
    Stop,
    Reinstall,
    Config,
    OpenDir
  }
}
