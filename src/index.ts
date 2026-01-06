import type { Plugin, UserConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { normalizePath } from 'vite'

export interface IconReplacement {
  name: string // e.g., 'DownOutlined' or 'ProfileTwoTone'
  d?: string // SVG path data for regular icons
  paths?: Array<{ // SVG path data for TwoTone icons
    d: string
    fill?: 'primary' | 'secondary'
  }>
}

export interface VitePluginAntDesignIconsSvgReplaceOptions {
  /**
   * 是否启用
   * @default true
   */
  enable?: boolean
  /**
   * 是否打印日志
   * @default true
   */
  log?: boolean
  /**
   * 内联图标替换配置（优先级高）
   */
  replacements?: IconReplacement[]
  /**
   * JSON 配置文件路径（可选）
   */
  configPath?: string
}

/**
 * 将驼峰命名（camelCase / PascalCase）转换为短横线命名（kebab-case）
 * @param str 输入的驼峰字符串
 * @returns 转换后的小横杆（kebab-case）字符串，全小写
 */
function camelToKebab(str: string): string {
  // 处理空字符串
  if (!str)
    return str

  // 在大写字母前插入连字符（除了开头），然后转为小写
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // 普通驼峰：aA → a-A
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // 连续大写后接小写：HTMLButton → HTML-Button
    .toLowerCase()
}

const ICON_PACKAGE = '@ant-design/icons-svg'

/**
 * 加载和合并图标替换配置
 */
function loadReplacements(options: Pick<VitePluginAntDesignIconsSvgReplaceOptions, 'configPath' | 'replacements'>): IconReplacement[] {
  let result: IconReplacement[] = []

  // 1. 加载 JSON 配置（如果提供）
  if (options.configPath) {
    const absoluteConfigPath = path.resolve(process.cwd(), options.configPath)
    if (!fs.existsSync(absoluteConfigPath)) {
      throw new Error(`[replace-antd-icons] Config file not found: ${absoluteConfigPath}`)
    }
    try {
      const raw = fs.readFileSync(absoluteConfigPath, 'utf-8')
      const jsonReplacements = JSON.parse(raw)
      if (!Array.isArray(jsonReplacements)) {
        throw new TypeError('[replace-antd-icons] Config file must export an array.')
      }
      result = jsonReplacements
    }
    catch (e) {
      throw new Error(`[replace-antd-icons] Failed to parse JSON config: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 2. 合并内联配置（覆盖同名图标）
  if (options.replacements) {
    const mergedMap = new Map<string, IconReplacement>()
    for (const item of result) mergedMap.set(item.name, item)
    for (const item of options.replacements) mergedMap.set(item.name, item)
    result = Array.from(mergedMap.values())
  }

  return result
}

let i = 0

function VitePluginVitePluginAntDesignIconsSvgReplace(options: VitePluginAntDesignIconsSvgReplaceOptions = {}): Plugin {
  const {
    enable = true,
    log = true,
    replacements: inlineReplacements = [],
    configPath = '',
  } = options

  // 加载并合并图标替换配置
  const replacements = loadReplacements({ configPath, replacements: inlineReplacements })

  if (replacements.length === 0 && log) {
    console.warn('[replace-antd-icons] No icon replacements provided. Plugin will do nothing.')
  }

  // 构建匹配映射
  const replacementMap = new Map<string, IconReplacement>()
  const iconFileMap = new Map<string, string>()
  for (const replacement of replacements) {
    replacementMap.set(replacement.name, replacement)
    const filePath = normalizePath(`${ICON_PACKAGE}/es/asn/${replacement.name}.js`)
    iconFileMap.set(filePath, replacement.name)
  }

  return {
    name: `vite-plugin-ant-design-icons-svg-replace:${i++}`,
    apply: 'serve',
    config(c: any) {
      if (!enable)
        return
      if (!c.server)
        c.server = {}
      if (!c.server.watch)
        c.server.watch = {}
      c.server.watch.disableGlobbing = false

      const currentExclude = c.optimizeDeps?.exclude || []
      const alreadyExcluded = currentExclude.some(
        (item: string) => typeof item === 'string' && item === ICON_PACKAGE,
      )

      if (!alreadyExcluded) {
        return {
          optimizeDeps: {
            ...c.optimizeDeps,
            exclude: [...currentExclude, ICON_PACKAGE],
          },
        }
      }
      return {}
    },
    load(id: string) {
      const normalizedId = normalizePath(id)

      for (const [filePath, iconName] of iconFileMap.entries()) {
        if (normalizedId.includes(filePath)) {
          const replacement = replacementMap.get(iconName)!

          // 自动推断 theme 和 name
          let theme = 'outlined'
          let baseName = iconName
          if (iconName.endsWith('Filled')) {
            theme = 'filled'
            baseName = iconName.slice(0, -6)
          }
          else if (iconName.endsWith('TwoTone')) {
            theme = 'two-tone'
            baseName = iconName.slice(0, -7)
          }
          else if (iconName.endsWith('Outlined')) {
            baseName = iconName.slice(0, -8)
          }

          let code = ''
          if (replacement.paths && theme === 'two-tone') {
            // TwoTone 图标格式
            const pathsCode = replacement.paths.map((path) => {
              const fill = path.fill ? `, "fill": ${path.fill === 'primary' ? 'primaryColor' : 'secondaryColor'}` : ''
              return `{ "tag": "path", "attrs": { "d": "${path.d}"${fill} } }`
            }).join(', ')

            code = `
// Auto-replaced by replace-antd-icons plugin
var ${iconName} = {
  "icon": function render(primaryColor, secondaryColor) {
    return {
      "tag": "svg",
      "attrs": { "viewBox": "64 64 896 896", "focusable": "false" },
      "children": [${pathsCode}]
    };
  },
  "name": "${camelToKebab(baseName)}",
  "theme": "${theme.replace('-', '')}"
};
export default ${iconName};
`
          }
          else if (replacement.d) {
            // 普通图标格式
            code = `
// Auto-replaced by replace-antd-icons plugin
var ${iconName} = {
  "icon": {
    "tag": "svg",
    "attrs": { "viewBox": "64 64 896 896", "focusable": "false" },
    "children": [{ "tag": "path", "attrs": { "d": "${replacement.d}" } }]
  },
  "name": "${camelToKebab(baseName)}",
  "theme": "${theme}"
};
export default ${iconName};
`
          }
          else {
            throw new Error(`[replace-antd-icons] Icon ${iconName} must have either 'd' or 'paths' property`)
          }

          return code
        }
      }
    },
  }
}

export default VitePluginVitePluginAntDesignIconsSvgReplace
