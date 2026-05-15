import type { Plugin } from 'vite'
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

// 匹配 @ant-design/icons-svg 的 asn 图标文件，兼容 npm/yarn/pnpm 各种嵌套路径
// 例如：
//   /project/node_modules/@ant-design/icons-svg/es/asn/HomeOutlined.js                                  (npm/yarn 扁平)
//   /project/node_modules/.pnpm/@ant-design+icons-svg@4.x/node_modules/@ant-design/icons-svg/es/asn/... (pnpm)
//   /project/node_modules/@ant-design/icons-vue/node_modules/@ant-design/icons-svg/es/asn/...           (嵌套)
const ICON_FILE_REGEX = /[\\/]@ant-design[\\/]icons-svg[\\/]es[\\/]asn[\\/]([^\\/]+)\.js$/

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

/**
 * 根据图标名 + 替换数据生成与 @ant-design/icons-svg 运行时兼容的模块代码
 * 同时被 Vite load 钩子和 esbuild onLoad 钩子复用
 */
function generateReplacementCode(iconName: string, replacement: IconReplacement): string {
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

  if (replacement.paths && theme === 'two-tone') {
    // TwoTone 图标格式
    const pathsCode = replacement.paths.map((p) => {
      const fill = p.fill ? `, "fill": ${p.fill === 'primary' ? 'primaryColor' : 'secondaryColor'}` : ''
      return `{ "tag": "path", "attrs": { "d": "${p.d}"${fill} } }`
    }).join(', ')

    return `
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

  if (replacement.d) {
    // 普通图标格式
    return `
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

  throw new Error(`[replace-antd-icons] Icon ${iconName} must have either 'd' or 'paths' property`)
}

/**
 * 创建 esbuild 插件，在 Vite 预打包阶段替换图标
 *
 * 这是 pnpm 兼容性的关键：pnpm 严格模式下 @ant-design/icons-svg 是 transitive 依赖，
 * 无法通过 optimizeDeps.exclude 将其挪到运行时（项目根 node_modules 找不到包），
 * 所以必须在 esbuild bundle 内部完成替换。
 */
function createEsbuildReplacePlugin(replacementMap: Map<string, IconReplacement>, log: boolean) {
  const replaced = new Set<string>()
  return {
    name: 'vite-plugin-ant-design-icons-svg-replace:esbuild',
    setup(build: any) {
      build.onLoad({ filter: ICON_FILE_REGEX }, (args: { path: string }) => {
        const normalized = normalizePath(args.path)
        const match = normalized.match(ICON_FILE_REGEX)
        if (!match)
          return null
        const iconName = match[1]
        const replacement = replacementMap.get(iconName)
        if (!replacement)
          return null

        if (log && !replaced.has(iconName)) {
          replaced.add(iconName)
          console.log(`[replace-antd-icons] (prebundle) replaced ${iconName}`)
        }
        return {
          contents: generateReplacementCode(iconName, replacement),
          loader: 'js',
        }
      })
    },
  }
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

  // 构建匹配映射：图标名 → 替换数据
  const replacementMap = new Map<string, IconReplacement>()
  for (const replacement of replacements) {
    replacementMap.set(replacement.name, replacement)
  }

  return {
    name: `vite-plugin-ant-design-icons-svg-replace:${i++}`,
    config(c: any) {
      if (!enable)
        return
      if (!c.server)
        c.server = {}
      if (!c.server.watch)
        c.server.watch = {}
      c.server.watch.disableGlobbing = false

      // 关键：通过 esbuild 插件在预打包阶段完成替换
      // 这样 npm/pnpm/yarn 全部都能命中，不再依赖 optimizeDeps.exclude
      // （pnpm 严格模式下 @ant-design/icons-svg 不在项目根 node_modules，exclude 反而会让 Vite 解析失败）
      const existingEsbuildPlugins = c.optimizeDeps?.esbuildOptions?.plugins ?? []
      return {
        optimizeDeps: {
          ...c.optimizeDeps,
          esbuildOptions: {
            ...(c.optimizeDeps?.esbuildOptions ?? {}),
            plugins: [
              ...existingEsbuildPlugins,
              createEsbuildReplacePlugin(replacementMap, log),
            ],
          },
        },
      }
    },
    /**
     * Fallback：当 Vite 主管线直接服务 @ant-design/icons-svg 文件时（例如用户在
     * optimizeDeps.exclude 中显式排除了它，或某些非预打包路径），仍能完成替换。
     */
    load(id: string) {
      const normalizedId = normalizePath(id)
      const match = normalizedId.match(ICON_FILE_REGEX)
      if (!match)
        return
      const iconName = match[1]
      const replacement = replacementMap.get(iconName)
      if (!replacement)
        return
      if (log)
        console.log(`[replace-antd-icons] (load) replaced ${iconName}`)
      return generateReplacementCode(iconName, replacement)
    },
  }
}

export default VitePluginVitePluginAntDesignIconsSvgReplace
