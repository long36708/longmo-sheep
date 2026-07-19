# 🐑️ longmo-sheep

固执己见的 CLI 命令，用于更新 CHANGELOG.md 和发布包。

```bash
pnpm add -WD longmo-sheep
```

前提假设：
- Git 仓库
- Monorepo 单仓多包结构
- 使用 pnpm
- 使用 `vX.Y.Z` 格式的标签
- 所有标签已在本地拉取
- `CHANGELOG.md` 文件已存在（使用 `pnpm exec conventional-changelog -p angular -o CHANGELOG.md -r 0` 初始化）
- 根目录 `package.json` 必须包含 `version` 字段（用于计算版本升级建议）

功能说明：
- 选择新版本号
- 更新子包的版本和工作区依赖
- 更新根目录 `package.json` 的版本号
- 使用最新的变更记录更新 `CHANGELOG.md` 文件
- 将包发布到 npm
- 使用 `vX.Y.Z` 提交信息推送变更
- 创建并推送 `vX.Y.Z` 格式的 Git 标签

使用方式：

```json
{
  "scripts": {
    "release": "pnpm run link && pnpm run build && pnpm run test && sheep release -b main"
  }
}
```

## 命令选项

```bash
sheep release [options]
```

| 选项 | 说明 |
|------|------|
| `-b, --expected-branch <branch>` | 指定发布所需的分支名称，若当前分支不匹配则中止发布 |
| `--tag <tag>` | 指定发布到 npm 时的 dist-tag（如 `next`、`beta`） |
| `--dry-run` | 模拟运行，更新文件但不实际发布或推送 |
| `--force` | 强制发布，即使未检测到变更也会更新所有包 |
| `--debug` | 输出调试信息 |

## 注意事项

### 发布前检查

发布前会自动验证以下条件，若不满足则中止发布：

1. **Git 工作区必须干净** - 不能有未提交的更改
2. **分支匹配** - 若使用 `-b` 参数，当前分支必须与之匹配
3. **与远程同步** - 本地分支必须与远程保持同步，不能有落后的提交

### 版本选择规则

- 自动推荐 `patch`、`minor`、`major` 版本升级
- 若当前为预发布版本（如 `1.0.0-beta.1`），还会推荐 `prepatch`、`preminor`、`premajor`、`prerelease`
- 支持手动输入自定义版本号

### 部分发布与完整发布

发布行为取决于版本升级类型：

- **部分发布**：仅更新并发布自上次发布以来**有变更的包**
  - 对于 `0.x` 版本：仅 `patch`/`prepatch`/`prerelease` 升级触发部分发布
  - 对于 `1.x+` 版本：`minor`/`preminor`/`patch`/`prepatch`/`prerelease` 升级触发部分发布
- **完整发布**：更新并发布**所有包**（无论是否有变更）
  - 任何版本的 `major` 升级
  - 使用 `--force` 参数时

> **提示**：若部分发布时未检测到任何包有变更，发布会中止并提示 "No package has changed since last release."，此时可使用 `--force` 强制发布所有包。

### CHANGELOG 生成

- 基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 自动过滤 `chore(deps)` 类型的提交（除非是破坏性变更）
- 新内容会插入到 CHANGELOG.md 最旧条目之前
- 发布前会提示用户确认 CHANGELOG 内容

### 发布流程

1. 验证 Git 状态
2. 发现工作区包并检测变更
3. 选择新版本号
4. 更新包版本和 lockfile
5. 生成 CHANGELOG 并确认
6. 发布到 npm（`pnpm publish -r`）
7. 创建提交（`vX.Y.Z`）并推送
8. 创建并推送 Git 标签

推荐搭配的 GitHub Action：[Akryum/release-tag](https://github.com/Akryum/release-tag) :ok_hand:

<p align="center">
  <a href="https://guillaume-chau.info/sponsors/" target="_blank">
    <img src='https://akryum.netlify.app/sponsors.svg'/>
  </a>
</p>
