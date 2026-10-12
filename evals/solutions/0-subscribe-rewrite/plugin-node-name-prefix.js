/**
 * 统一节点名前缀
 *
 * 每次订阅更新时：
 * 1. 去掉每个节点名称开头的 Emoji / 国旗，以及紧随其后的空格和分隔符；
 * 2. 给节点名称统一加上一个前缀（默认「我的-」，可在插件配置中修改）。
 *
 * 跨客户端：GUI.for.Clash 的节点名字段是 name，GUI.for.SingBox 的是 tag，
 * 插件会自动识别并只修改当前客户端使用的字段。
 */

// 匹配名称开头的 Emoji 序列：国旗（区域指示符对）、Keycap、以及 Extended_Pictographic
// 及其变体选择符、肤色修饰符、标签字符和 ZWJ 连接序列（如家庭、彩虹旗、细分地区旗）。
const LEADING_EMOJI =
  /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:[\uFE0E\uFE0F])?(?:[\u{1F3FB}-\u{1F3FF}])?(?:[\u{E0020}-\u{E007F}]+)?(?:\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F])?(?:[\u{1F3FB}-\u{1F3FF}])?(?:[\u{E0020}-\u{E007F}]+)?)*)/u

// Emoji 之后可能残留的空白与常见分隔符。
const LEADING_SEPARATOR = /^[\s\-_|·•]+/

const DEFAULT_PREFIX = '我的-'

/** @type {EsmPlugin} */
export default (plugin) => {
  // 从插件配置读取开关，兼容字符串 / 数字 / 布尔值。
  const readSwitch = (key, fallback) => {
    const raw = plugin[key]
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw !== 0
    if (typeof raw === 'string') return !['', '0', 'false', 'off', 'no'].includes(raw.trim().toLowerCase())
    return fallback
  }

  // 从插件配置读取文本，缺失时回退到默认值。
  const readText = (key, fallback) => {
    const raw = plugin[key]
    if (typeof raw === 'string') return raw
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
    return fallback
  }

  const isSingBox = () => String(Plugins.APP_TITLE || '').includes('SingBox')

  // 选出当前客户端使用的节点名字段，首选字段缺失时回退到另一个。
  const nameFieldOf = (proxy) => {
    const preferred = isSingBox() ? 'tag' : 'name'
    if (typeof proxy[preferred] === 'string') return preferred
    const other = preferred === 'tag' ? 'name' : 'tag'
    if (typeof proxy[other] === 'string') return other
    return preferred
  }

  // 循环剥离开头的 Emoji，并可选地清理紧随其后的分隔符。
  const stripLeadingEmoji = (name, trimSeparator) => {
    let result = String(name).replace(/^\s+/, '')
    while (LEADING_EMOJI.test(result)) {
      result = result.replace(LEADING_EMOJI, '')
      if (trimSeparator) result = result.replace(LEADING_SEPARATOR, '')
    }
    return result.trim()
  }

  // 幂等地添加前缀，避免重复更新时叠加。
  const applyPrefix = (name, prefix) => {
    if (!prefix || name.startsWith(prefix)) return name
    return prefix + name
  }

  /**
   * 触发器：订阅更新时
   * @param {Recordable[]} proxies 订阅解析出的节点数组
   * @param {Recordable} subscription 订阅元数据
   * @returns {Promise<Recordable[]>}
   */
  const onSubscribe = async (proxies) => {
    if (!Array.isArray(proxies)) return proxies

    const stripEmoji = readSwitch('StripEmoji', true)
    const addPrefix = readSwitch('AddPrefix', true)
    const trimSeparator = readSwitch('TrimSeparators', true)
    const prefix = readText('Prefix', DEFAULT_PREFIX)
    if (!stripEmoji && !addPrefix) return proxies

    return proxies.map((proxy) => {
      if (!proxy || typeof proxy !== 'object') return proxy
      const field = nameFieldOf(proxy)
      const original = proxy[field]
      if (typeof original !== 'string') return proxy

      let next = original
      if (stripEmoji) next = stripLeadingEmoji(next, trimSeparator)
      if (addPrefix) next = applyPrefix(next, prefix)
      if (next === original) return proxy
      return { ...proxy, [field]: next }
    })
  }

  return { onSubscribe }
}
