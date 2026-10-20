import {useState} from 'react';
import * as echarts from 'echarts';
import data from './demo-data.json';
import provenance from './provenance.json';
import {createEChartsAdapter} from './runtime/chart-adapters/echarts';
import {chartPaletteForVisualStyle} from './runtime/chart-adapters/academic-theme';
import {StructuredEvidenceChart} from './runtime/StructuredEvidenceChart';
import {ScientificDistributionChart,PairedObservationChart,UncertaintyTrendChart,CoefficientIntervalChart,RegressionDiagnosticChart,ScientificPanelGrid} from './runtime/dataset-charts/ScientificCharts';
import type {ChartEvidenceSpec,VisualEvidenceRecord} from './runtime/EvidenceVisualizationTypes';
import type {VisualStyle} from './runtime/visual-style';
import type {DistributionInput,TrendInput,CoefficientInput,RegressionInput} from './runtime/dataset-charts/scientific-options';
import './gallery.css';

const adapter=createEChartsAdapter(echarts);
const titles=['分布与不确定性','配对变化','趋势与区间带','拟合与残差','系数与参考线','主图与支撑图'];
const forms=['box-plot','slopegraph','line','scatter','dot-plot','small-multiples'] as const;
const captions=[
 '箱体是 Q1–Q3，横线是中位数，须为 1.5 IQR 内观测；点为全部有效观测。右侧区间线与蓝点为均值及 95% CI。',
 '按同一观测 ID 连接处理前后。30 个 ID 中 29 对完整，1 个处理后缺失；只连接完整对，不补值，不自动检验。',
 '各周为独立样本，阴影是均值的逐点 95% CI。第 5 周未采样（n=0），折线和区间同时断开。',
 '左图显示 72 个观测、OLS 拟合线与拟合均值的逐点 95% CI；右图显示观测值减拟合值的残差。区间不是预测区间。',
 '菱形是点估计，横线是 OLS 系数的 95% t 区间（n=96，df=91）；虚线为无效应参考值 0。预测变量和响应变量均按样本标准差标准化。',
 '用较大的分布图回答主要问题，右侧趋势与系数图补充证据。相同变量保持颜色与量纲；每张子图保留独立来源和方法。'
];
const copy=[
 ['原来只比较三个均值','现在能看见组内差异、离群点和估计区间','同样的均值可能来自不同分布。把原始点与摘要叠在一起，让样本量和不确定性直接进入画面。'],
 ['两个柱子掩盖个体变化','用连线保留同一个体的前后对应','每条细线对应同一 ID。先交代完整配对数和缺失数，再讨论变化方向；需要检验时另由分析流程给出。'],
 ['单条折线看不出估计精度','用区间带表达精度，缺失处保留断点','时间顺序由数据合同明确给定。这里的区间是逐点区间，不能据此宣称整条曲线都达到同样的覆盖概率。'],
 ['散点只能看出大致关系','把拟合结果和残差放在同一视野','拟合线、区间和残差全部来自同一次 OLS 分析。图形负责呈现，模型假设仍需结合具体研究判断。'],
 ['回归表需要逐行读数','点估计、区间和参考线一起比较','比较的是效应大小与区间位置。线性效应常用 0；比值类结果可显式改为对数轴和参考值 1。'],
 ['每张小图平均分配空间','按论证分配主图和支撑图的大小','组合图也要有阅读顺序。先读主要分布，再看时间变化和模型摘要；无需把所有内容都塞进等大的矩形卡片。']
];
function evidence(id:string,index:number):{spec:ChartEvidenceSpec;visual:VisualEvidenceRecord & {evidenceType:'A';defaultState:Record<string,unknown>;printState:Record<string,unknown>}}{
 const spec:ChartEvidenceSpec={chartType:forms[index],chartForm:forms[index],dataRef:{datasetId:'synthetic-20261020',transformIds:['demo-groups-summary','demo-pairs-complete','demo-trend-mean','demo-ols','demo-coefficient-ols']},analyticalQuestion:copy[index][1],visualThesis:copy[index][2],encodedFields:['see demo-data.json'],comparisonBaseline:'同一份确定性模拟数据',claimVisualFit:'以原始值及显式统计摘要展示对应关系',alternativeFormsConsidered:['evidence-table'],selectionRationale:copy[index][2],annotationTargets:[],highlightPolicy:'保留所有有效观测；不自动添加显著性',readingOrder:['图形','方法','边界'],encodings:{geometry:forms[index]},units:{response:'a.u.'},domainPolicy:'fixed',precision:{response:2},interactionSpec:{enabled:false,actions:[],runtimeHooks:[]},motionSpec:{durationMs:0,entrance:'none',update:'none'},defaultState:{},resetState:{},reducedMotionState:{},printState:{},staticRationale:'能力示例按完整静态状态比较；悬停提供精确值。',accessibleSummary:captions[index]};
 const visual={visualId:id,sourceRef:'demo-data.json',sourceHash:`sha256:${provenance.dataSha256}`,evidenceType:'A' as const,subtype:forms[index],classificationConfidence:1,claimLinks:[],evidenceStatus:'DERIVED' as const,representationStatus:'RECONSTRUCTED' as const,evidenceContribution:'仅演示图表能力，不支持真实研究结论',treatmentLevel:'L3' as const,treatmentRationale:'确定性模拟输入可追溯',mustPreserve:['单位','缺失','区间定义','配对 ID'],interactionPlan:['精确值悬停'],defaultState:{},printState:{},limitations:['模拟数据，不是研究发现'],chartSpec:spec};
 return {spec,visual};
}

function Before({i,style}:{i:number;style:VisualStyle}){
 const p=chartPaletteForVisualStyle(style);const {visual,spec}=evidence(`before-${i}`,i);
 const base:any={animation:false,grid:{left:20,right:18,top:40,bottom:28,containLabel:true},textStyle:{color:p.ink,fontFamily:'Microsoft YaHei',fontSize:16},xAxis:{type:'category',data:data.distribution.estimates.map(r=>r.label),axisLabel:{fontSize:15,color:p.ink}},yAxis:{type:'value',name:'响应值（a.u.）',nameTextStyle:{align:'left'},axisLabel:{color:p.muted},splitLine:{lineStyle:{color:p.grid,type:'dashed'}}},series:[{type:'bar',barWidth:34,itemStyle:{color:p.primary},data:data.distribution.estimates.map(r=>r.estimate)}]};
 if(i===1){const valid=data.paired.observations.filter(r=>r.after!==null);base.xAxis.data=['处理前','处理后'];base.series[0].data=[data.paired.observations.reduce((s,r)=>s+r.before,0)/30,valid.reduce((s,r)=>s+r.after!,0)/29];}
 if(i===2){base.xAxis.data=data.trend.points.map(r=>r.time);base.xAxis.axisLabel.fontSize=12;base.series=[{type:'line',connectNulls:false,symbolSize:5,data:data.trend.points.map(r=>r.estimate)}];}
 if(i===3){base.xAxis={type:'value',name:'输入强度',nameLocation:'middle',nameGap:26,axisLabel:{color:p.muted},splitLine:{show:false}};base.series=[{type:'scatter',symbolSize:6,data:data.regression.observations.map(r=>[r.x,r.y]),itemStyle:{color:p.primary}}];}
 if(i===4)return <table className="coefficient-table"><caption>OLS 回归摘要 · 演示数据</caption><thead><tr><th>项</th><th>估计值</th><th>95% CI</th></tr></thead><tbody>{data.coefficient.rows.map(r=><tr key={r.label}><th>{r.label}</th><td>{r.estimate.toFixed(2)}</td><td>{r.lower.toFixed(2)}–{r.upper.toFixed(2)}</td></tr>)}</tbody></table>;
 if(i===5)return <div className="old-panels">{['分布','趋势','模型'].map(t=><div key={t}><span>{t}</span><svg viewBox="0 0 120 90" aria-label="等尺寸小图布局示意"><path d="M10 10V75H110"/><path d="M16 62L40 45L62 51L86 25L103 30"/></svg></div>)}</div>;
 return <StructuredEvidenceChart visual={visual} adapter={adapter} defaultOption={base} printOption={base} caption="" accessibleSummary={`基础表达：${copy[i][0]}`} />;
}

function After({i,style,suffix=''}:{i:number;style:VisualStyle;suffix?:string}){
 const ev=evidence(`after-${i}${suffix}`,i);const common={...ev,adapter,visualStyle:style,caption:'',sourceLabel:''};
 if(i===0)return <ScientificDistributionChart {...common} input={data.distribution as DistributionInput}/>;
 if(i===1)return <PairedObservationChart {...common} input={{...data.paired,labels:['处理前','处理后'],domain:[25,88]}}/>;
 if(i===2)return <UncertaintyTrendChart {...common} input={data.trend as TrendInput}/>;
 if(i===3)return <RegressionDiagnosticChart {...common} input={data.regression as RegressionInput}/>;
 if(i===4)return <CoefficientIntervalChart {...common} input={data.coefficient as CoefficientInput}/>;
 return <ScientificPanelGrid hero={<div className="panel-label"><b>A · 主图</b><After i={0} style={style} suffix="-combo"/></div>} supports={[<div className="panel-label"><b>B · 时间</b><After i={2} style={style} suffix="-combo"/></div>,<div className="panel-label"><b>C · 模型</b><After i={4} style={style} suffix="-combo"/></div>]}/>;
}
export default function App(){
 const [style,setStyle]=useState<VisualStyle>('academic-light');
 document.documentElement.dataset.visualStyle=style;
 return <div className="gallery" data-visual-style={style} key={style}>
  <header className="topbar"><div className="brand"><img src={new URL("./zuel-logo.png",import.meta.url).href} alt="中南财经政法大学"/><span>科研绘图能力测试</span></div><div className="style-switch" role="group" aria-label="视觉风格"><button aria-pressed={style==='academic-light'} onClick={()=>setStyle('academic-light')}>学术浅色</button><button aria-pressed={style==='tech-engineering-dark'} onClick={()=>setStyle('tech-engineering-dark')}>深蓝科技</button><button onClick={()=>window.print()}>打印 / PDF</button></div></header>
  <main><section className="hero"><div className="eyebrow">RESEARCH FIGURES / SKILL UPDATE 2026.10</div><h1>让结果更容易比较，<br/><em>让证据保留细节。</em></h1><p>6 组基础表达与增强表达，同一份数据、两套视觉风格。<br/>从原始观测到区间、配对与模型诊断，直接查看这次更新的效果。</p><div className="demo-notice"><b>全部为模拟数据</b><span>固定 seed 20261020；仅测试绘图能力，不代表真实研究结论。</span></div></section>
  <nav className="case-nav" aria-label="图形案例">{titles.map((t,i)=><a href={`#case-${i+1}`} key={t}><span>0{i+1}</span>{t}</a>)}</nav>
  {titles.map((title,i)=><section className={`case case-${i+1}`} id={`case-${i+1}`} key={title}><div className="case-heading"><span className="number">0{i+1}</span><div><div className="eyebrow">{title}</div><h2>{copy[i][1]}</h2><p>{copy[i][2]}</p></div></div>
    <div className="comparison"><div className="before"><div className="figure-kicker">基础表达 <span>{i===5?'布局示意':'同一数据的简化表达'}</span></div><h3>{copy[i][0]}</h3><Before i={i} style={style}/><p className="boundary">{i===4?'表格适合核对精确值；图形适合快速比较效应与区间。':'基础图仍有适用场景；这里比较它承载统计信息的多少。'}</p></div><div className="after"><div className="figure-kicker">增强表达 <span>实际复用 skill 组件</span></div><After i={i} style={style}/><p className="method-note">{captions[i]}</p></div></div>
  </section>)}
  <footer><h2>这一版补的是可复用的绘图能力。</h2><p>缺失与零值分开处理 · 正负相关使用发散色标 · 数值／排名斜率图显式区分 · 多条注释分别保留 · 支持 SVG / PDF / PNG 静态导出</p><p className="muted">来源：本地确定性模拟数据与分析脚本。图中的统计推断仅适用于本示例的生成假设。</p></footer></main>
 </div>;
}
