# 模板功能验证材料

本例验证工作范围、方法准备和后续安排的竖版呈现，不包含统计数据或研究结果。

{
  "summary": "本例验证工作范围、方法准备和后续安排的竖版呈现，不包含统计数据或研究结果。",
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
      "lead": "下面是用于验证模板的工作记录，不代表用户的研究成果。",
      "notes": "讲述时先交代范围，再结合示例补充必要说明；正文只显示重点。",
      "blocks": [
        {
          "id": "scope",
          "type": "overview",
          "items": [
            {
              "id": "materials",
              "title": "整理材料",
              "detail": "核对来源和适用范围"
            },
            {
              "id": "route",
              "title": "比较方案",
              "detail": "记录差异及采用条件"
            }
          ]
        },
        {
          "id": "boundary",
          "type": "text",
          "text": "当前完成的是材料整理和方法准备；正式执行尚未开始。"
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