# 模板功能验证材料

本例使用五条示例任务记录，展示少量CSV怎样支持进度与案例说明，不运行模型或完整数据分析。

{
  "summary": "本例使用五条示例任务记录，展示少量CSV怎样支持进度与案例说明，不运行模型或完整数据分析。",
  "overview": [
    {
      "id": "read",
      "title": "整理工作范围",
      "detail": "梳理任务与已完成事项"
    },
    {
      "id": "method",
      "title": "明确处理步骤",
      "detail": "区分方法准备与实际执行"
    }
  ],
  "sections": {
    "hero": {
      "blocks": []
    },
    "work": {
      "lead": "进度来自随项目保存的五条验证记录，范围只限这个示例。",
      "notes": "讲述时先交代范围，再结合示例补充必要说明；正文只显示重点。",
      "blocks": [
        {
          "id": "progress",
          "type": "progress",
          "title": "示例任务处理进度",
          "scope": "五条示例任务记录",
          "completed": 3,
          "total": 5,
          "unit": "条"
        },
        {
          "id": "cases",
          "type": "cases",
          "title": "查看两种记录状态",
          "cases": [
            {
              "id": "ready",
              "title": "材料已核对",
              "summary": "这条记录的来源和对象已经核对。",
              "evidence": "依据：示例CSV中的已完成标记。",
              "status": "completed"
            },
            {
              "id": "pending",
              "title": "方法已明确",
              "summary": "处理步骤已经写清，实际操作尚未开始。",
              "evidence": "依据：示例CSV中的方法准备标记。",
              "status": "method-ready"
            }
          ]
        }
      ]
    },
    "method": {
      "lead": "先说明操作步骤，再展示可选择的方案。",
      "status": "method-ready",
      "notes": "讲述时先交代范围，再结合示例补充必要说明；正文只显示重点。",
      "blocks": [
        {
          "id": "steps",
          "type": "process",
          "steps": [
            {
              "id": "inspect",
              "title": "核对材料",
              "detail": "确认每份材料的对象和用途"
            },
            {
              "id": "select",
              "title": "选择方案",
              "detail": "结合目标和现有条件比较"
            },
            {
              "id": "record",
              "title": "保存依据",
              "detail": "标明来源、状态和后续工作"
            }
          ]
        },
        {
          "id": "options",
          "type": "tabs",
          "title": "两种整理方式",
          "options": [
            {
              "id": "by-task",
              "label": "按任务整理",
              "blocks": [
                {
                  "id": "task",
                  "type": "text",
                  "text": "围绕同一任务归并不同来源，便于说明具体工作。"
                }
              ]
            },
            {
              "id": "by-source",
              "label": "按来源整理",
              "blocks": [
                {
                  "id": "source",
                  "type": "text",
                  "text": "先分别说明材料内容，再比较共同点与差异。"
                }
              ]
            }
          ]
        },
        {
          "id": "detail",
          "type": "details",
          "title": "查看核对事项",
          "blocks": [
            {
              "id": "checks",
              "type": "text",
              "text": "核对名称、时间、范围和原始依据；不把尚未开展的工作写成已完成。"
            }
          ]
        }
      ]
    }
  }
}