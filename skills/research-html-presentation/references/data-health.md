# 数据体检：新建竖版数据报告的默认辅助能力

## 边界和默认值

仅适用于显式 `profile: dataset-report` + `outputMode: scroll-report`。新脚手架默认 `dataHealth.enabled: true`，与研究助手、分析流程并列；`--no-data-health` 或 `enabled:false` 可关闭。旧项目不自动迁移，slide-deck 不增加入口。正式报告仍独立可读，不增加永久侧栏或质量 dashboard。

在数据来源／分析设计段落标题旁放一个简洁“查看数据体检”按钮；默认收起，通过 `DataHealth` 原生模态对话框显示四个页签。内容来自本次本地检查，不把示例国家、指标、年份、来源或分析结论写入模板。

## 最小契约与生成流程

1. 先保留原文件并在 Shared Evidence Core 登记 DatasetRecord、sourceHash、字段类型、唯一键、privacyReview。检查原始输入，不能只检查已经删掉问题记录的干净表。
2. 对 CSV/XLSX/嵌套 JSON，用当前项目的本地分析脚本生成对象数组。每个对象表示一个原始观察单元；列值保留原始类型、空值和重复，不能先填补、去重或筛除再假装原始数据完整。已有转换记录描述解析过程，必要时单独登记解析 transform；这里不建立第二套 finding、claim 或计算结果。
3. 创建项目私有 `data-health.config.json`，明确映射和允许公开的聚合，再运行 `node scripts/build-data-health.mjs .`（脚手架也提供 `data:health`）。将生成的 `data-health.json` 绑定 `DataHealth`。初始脚手架仅有 pending 占位；真实报告必须生成 ready 结果。
4. `validate_data_health.mjs` 会从本地原始输入重新计算并比对，检查 schema、来源 ID、分析 ID、哈希和章节链接；`verify_project.mjs --runtime` 自动执行组件交互验证。

配置形状（占位值需替换为本项目已有 ID 和路径）：

```json
{
  "datasetId": "existing-dataset-id",
  "sourceIds": ["existing-citation-id"],
  "rawPath": "data/raw/input.json",
  "rowsPath": "data/private/audit-rows.json",
  "rowsHash": "sha256:<local-file-sha256>",
  "transformIds": ["existing-parser-transform-id"],
  "privacy": {"publicAggregates": true, "minCellSize": 1},
  "keyFields": ["record_id"],
  "fields": [
    {"id": "record_id", "path": "record_id", "label": "记录键", "type": "string"},
    {"id": "period", "path": "period", "label": "观察年份", "type": "number"},
    {"id": "measure", "path": "measure", "label": "分析指标", "type": "number", "unit": "登记单位", "anomaly": "iqr"}
  ],
  "time": {"fieldId": "period", "periods": [2019, 2020, 2021]},
  "usage": [{"analysisId": "existing-analysis-id", "label": "正式分析步骤", "scope": "本步骤的筛选口径", "reason": "为什么使用或不使用该范围", "rowIndices": [0, 1], "sectionId": "existing-section-id"}],
  "limitations": ["本数据的采样或指标口径限制"]
}
```

`fields.path` 支持点分隔嵌套字段；类型只接受 number/string/boolean。数字字符串不自动当数值；如需转换，应在解析记录中解释。`minimum`、`maximum` 是显式范围约束；零不是缺失，负值没有通用禁止规则。元数据空白与分析指标缺失分别报告。唯一键未声明时重复检查显示未登记，缺失键不会被当作重复键。

`time` 可省略，此时显示字段覆盖，不臆造年份。可选 `groupFieldId` + `groups:[{id,label,value}]` 使用已批准分组标签；所有预期时段、分组需来自任务范围，不能把观察到的范围自动当作完整范围。时段覆盖检查记录存在性，数值完整性看字段页；时段外记录不自动排除。宽表对每个指标的年份有效覆盖，应在项目分析脚本按指标粒度登记，不能把一个缺值单元误报为“完整”。

`usage.rowIndices` 是本地审计行的零基索引，用实际分析选择生成，不是模型推测或示例数量。它只在私有配置里存在，浏览器仅收到使用数量、未选取数量、口径和原因。各步骤可重复用同一行，不能相加成总使用量。未登记时显示无法判断，不自动报告“全部使用”或“全部排除”。未选取不等于因质量删除；后者必须有实际处理记录才可说明。DatasetRecord.fieldUsage 可用于补充字段角色和排除原因。

## 异常规则与结果状态

默认不启用统计异常规则。只有字段可比较且项目明确选择 `anomaly: iqr`，才执行数值水平 IQR（线性插值，至少 8 有效值，1.5 倍阈值，浮点容差），输出检查数与标记数。不要把不同国家规模、单位、类别或时间趋势混在一起做 IQR；这类数据应先选择合适分组和变化口径，在项目分析脚本计算并保留方法。当前通用生成器不自动做年度变化率异常检测。规则未选择显示“未执行”，样本不足显示“未筛选”，标记为零才表示本规则未发现候选；这些状态不能混同。

异常不是错误，覆盖完整也不是准确性保证；不自动删除、填补、修订正式计算或宣称因果。此模块是派生检查摘要，不修改 finding、claim、正文、坐标、printState、笔记或 Authoring Patch。无需 API；模型表述不能成为体检数值来源。

## 隐私与 QA

原文件与审计行只留在本地 data/private 或 raw，禁止放入 src/public/dist/build、上传模型或浏览器存储。DatasetRecord 必须 privacyReview=cleared，配置 publicAggregates=true 表示聚合结果已经批准公开，不能用它绕过隐私复核。分组标签与字段名称同样需复核。minCellSize 按项目隐私要求设置；小于阈值的非零计数返回 null，页面写未公开，不能当作零。发布前还需检查组合统计造成的反推风险；此阈值不是匿名化保证。没有可公开聚合时关闭该能力。

组件只读取诊断摘要，通过来源 ID 从原 CitationRegistry 提供链接，不复制来源定义、原始行或数值详情；如需点到某条数值，用现有经审查的图表/分析数据，不另建权威数据表。

验证打开、四页签、方向键/Home/End、Tab 焦点限制、Escape 与焦点返回、320/390px 无页面横向溢出、表格局部滚动、来源和章节链接、无 localStorage 改动、无模型请求、打印隐藏。正常打印和 `?print=1` 均不打印模态内容，不改变正式报告确定性打印；如需质量附件，应另行生成经过审查的静态摘要。

## Readable priority summary

The overview begins with **先看这几项**: a small ordered list derived from the existing ready report, followed by expandable remaining reminders and links to the relevant tabs. Prioritize invalid/duplicate keys, actual anomaly candidates, declared period gaps, explicit partial-window limitations and missingness proportions. Explain the affected comparison/denominator or the next check without inventing an error cause. Keep unperformed, insufficient and privacy-withheld checks distinct; do not label an unregistered check as a pass. The summary is a view of registered diagnostics, not a new analysis or a reason to delete/impute records.
