import { chartPaletteForVisualStyle } from "../chart-adapters/academic-theme";
import type { VisualStyle } from "../visual-style";
import { finite, intervalDefinition, intervalGeometry, intervalLabel, jitterForId, sampleSize, uniqueIds } from "./scientific-models";
import type { BoxSummary, EstimateRow, FigureProfile, FitPoint, IntervalDefinition, Observation, PairedObservation, RegressionObservation, TrendPoint } from "./scientific-models";

export type ScientificAppearance = { visualStyle?: VisualStyle; profile?: FigureProfile };
type Appearance = ReturnType<typeof appearance>;
export function appearance({ visualStyle = "academic-light", profile = "slide" }: ScientificAppearance = {}) {
  const p = chartPaletteForVisualStyle(visualStyle);
  const fontSize = profile === "slide" ? 18 : 13;
  return { p, fontSize, base: {
    animation: false, backgroundColor: "transparent", color: [...p.categorical],
    textStyle: { color: p.ink, fontSize, fontFamily: '"Microsoft YaHei", sans-serif' },
    grid: { left: 18, right: 26, top: 48, bottom: 20, containLabel: true },
    tooltip: { trigger: "item", confine: true },
  }, valueAxis: { type: "value", scale: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: p.muted, fontSize }, nameTextStyle: { color: p.ink, fontSize, align: "left" }, splitLine: { lineStyle: { color: p.grid, type: "dashed" } } },
    categoryAxis: { type: "category", axisTick: { show: false }, axisLine: { lineStyle: { color: p.grid } }, axisLabel: { color: p.ink, fontSize }, nameTextStyle: { color: p.ink, fontSize } } };
}
const esc = (v: string) => v.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
function intervalSeries(rows: number[][], a: Appearance, horizontal: boolean, name: string) {
  return { name, type: "custom", z: 6, clip: true,
    renderItem: (_params: unknown, api: any) => {
      const category = api.value(0), low = api.value(1), high = api.value(2), estimate = api.value(3);
      const lo = api.coord(horizontal ? [low, category] : [category, low]);
      const hi = api.coord(horizontal ? [high, category] : [category, high]);
      const mid = api.coord(horizontal ? [estimate, category] : [category, estimate]);
      return { type: "group", children: [
        { type: "line", shape: { x1: lo[0], y1: lo[1], x2: hi[0], y2: hi[1] }, style: { stroke: a.p.ink, lineWidth: 2 } },
        ...[lo, hi].map(pt => ({ type: "line", shape: horizontal ? { x1: pt[0], y1: pt[1]-5, x2: pt[0], y2: pt[1]+5 } : { x1: pt[0]-5, y1: pt[1], x2: pt[0]+5, y2: pt[1] }, style: { stroke: a.p.ink, lineWidth: 2 } })),
        ...(horizontal ? [] : [{ type: "circle", shape: { cx: mid[0], cy: mid[1], r: 6 }, style: { fill: a.p.primary, stroke: a.p.ink, lineWidth: 1 } }]),
      ] };
    }, encode: horizontal ? { x: [1,2,3], y: 0 } : { x: 0, y: [1,2,3] }, data: rows };
}

export type DistributionInput = { observations: Observation[]; summaries: BoxSummary[]; estimates?: EstimateRow[]; interval?: IntervalDefinition; yLabel: string; domain?: [number, number] } & ScientificAppearance;
export function distributionOption(input: DistributionInput) {
  const a = appearance(input), groups = input.summaries.map(r => r.group);
  uniqueIds(input.observations);
  if (new Set(groups).size !== groups.length || !groups.length) throw new Error("Box groups must be nonempty and unique");
  input.observations.forEach(r => { if (!groups.includes(r.group)) throw new Error("Observation group not in summaries"); if (r.value !== null) finite(r.value, "observation"); });
  input.summaries.forEach(r => {
    sampleSize(r.n);
    const ordered = [r.low,r.q1,r.median,r.q3,r.high]; ordered.forEach(v => finite(v,"box summary"));
    if (ordered.some((v,i) => i > 0 && v < ordered[i-1])) throw new Error("Box summary must be ordered");
    if (input.observations.filter(o => o.group === r.group && o.value !== null).length !== r.n) throw new Error("Box n must match available independent observations");
  });
  if (input.estimates?.length) {
    if (!input.interval) throw new Error("Estimates require interval definition"); intervalDefinition(input.interval);
    input.estimates.forEach(r => { intervalGeometry(r.estimate,r.lower,r.upper); sampleSize(r.n); const box = input.summaries.find(s => s.group === r.label); if (!box || r.n !== box.n) throw new Error("Estimate group/n must match observations"); });
  }
  return { ...a.base, xAxis: { ...a.valueAxis, min: -1, max: groups.length, interval: 1, axisLabel: { color: a.p.ink, fontSize: a.fontSize, formatter: (v: number) => groups[v] ? `${groups[v]}\nn = ${input.summaries[v].n}` : "" }, splitLine: { show: false } },
    yAxis: { ...a.valueAxis, name: input.yLabel, min: input.domain?.[0], max: input.domain?.[1] },
    series: [
      { name: "箱线摘要", type: "boxplot", boxWidth: [28,50], itemStyle: { color: a.p.surface, borderColor: a.p.secondary, borderWidth: 2 }, data: input.summaries.map((r,i) => [i,r.low,r.q1,r.median,r.q3,r.high]), encode: { x: 0, y: [1,2,3,4,5] }, tooltip: { formatter: (p: any) => `${esc(groups[p.dataIndex])}<br/>中位数 ${input.summaries[p.dataIndex].median.toFixed(2)}<br/>箱体 Q1–Q3；须 = 1.5 IQR 内观测` } },
      { name: "原始观测", type: "scatter", z: 4, symbolSize: 7, data: input.observations.filter(r => r.value !== null).map(r => ({ name: r.id, value: [groups.indexOf(r.group)+jitterForId(r.id),r.value], itemStyle: { color: a.p.categorical[groups.indexOf(r.group)%a.p.categorical.length], opacity: .6 } })), tooltip: { formatter: (p: any) => `${esc(p.name)}：${p.value[1].toFixed(2)} ${esc(input.yLabel)}` } },
      ...(input.estimates?.length ? [intervalSeries(input.estimates.map(r => [groups.indexOf(r.label)+.25,r.lower,r.upper,r.estimate]),a,false,intervalLabel(input.interval!))] : []),
    ] };
}

export type PairedInput = { observations: PairedObservation[]; labels: [string,string]; yLabel: string; domain?: [number,number] } & ScientificAppearance;
export function pairedOption(input: PairedInput) {
  const a = appearance(input); uniqueIds(input.observations);
  input.observations.forEach(r => [r.before,r.after].forEach(v => { if (v !== null) finite(v,"paired observation"); }));
  const complete = input.observations.filter(r => r.before !== null && r.after !== null);
  return { ...a.base, grid: { left: 18, right: 32, top: 38, bottom: 20, containLabel: true }, xAxis: { ...a.categoryAxis, data: input.labels, boundaryGap: true }, yAxis: { ...a.valueAxis, name: input.yLabel, min: input.domain?.[0],max:input.domain?.[1] },
    series: complete.map(r => ({ type: "line", name:r.id, symbolSize: 7, lineStyle: { width: 1.4, color: a.p.secondary, opacity:.48 }, itemStyle: { color:a.p.primary }, data:[r.before,r.after], tooltip:{ formatter: () => `${esc(r.id)}<br/>${esc(input.labels[0])} ${r.before}<br/>${esc(input.labels[1])} ${r.after}` } })) };
}

function bandSeries(segments: number[][], a: Appearance, numericX = false) {
  return { name:"区间带", type:"custom", silent:true, clip:true, z:1,
    renderItem: (_params:unknown,api:any) => ({ type:"polygon", shape:{points: [api.coord([api.value(0),api.value(1)]),api.coord([api.value(0),api.value(2)]),api.coord([api.value(3),api.value(5)]),api.coord([api.value(3),api.value(4)])]}, style:{fill:a.p.primary,opacity:.18}}),
    encode:{x:[0,3],y:[1,2,4,5]},data:segments };
}
export type TrendInput = { points: TrendPoint[]; interval: IntervalDefinition; yLabel:string; domain?:[number,number] } & ScientificAppearance;
export function trendOption(input: TrendInput) {
  const a=appearance(input); intervalDefinition(input.interval);
  if(new Set(input.points.map(r=>r.time)).size!==input.points.length) throw new Error("Trend times must be unique and supplied in chronological order");
  input.points.forEach(r=>{
    const missing=[r.estimate,r.lower,r.upper].filter(v=>v===null).length;
    if(missing!==0 && missing!==3) throw new Error("Missing trend value requires missing bounds");
    if(missing===0){intervalGeometry(r.estimate!,r.lower!,r.upper!);sampleSize(r.n);} else if(r.n!==0) throw new Error("Missing trend point uses n=0");
  });
  const segments=input.points.slice(0,-1).flatMap((r,i)=>{const n=input.points[i+1];return r.estimate===null||n.estimate===null?[]:[[i,r.lower!,r.upper!,i+1,n.lower!,n.upper!]];});
  return {...a.base,xAxis:{...a.categoryAxis,data:input.points.map(r=>r.time),boundaryGap:false},yAxis:{...a.valueAxis,name:input.yLabel,min:input.domain?.[0],max:input.domain?.[1]},series:[bandSeries(segments,a),{name:`均值与 ${intervalLabel(input.interval)}`,type:"line",connectNulls:false,smooth:false,z:4,symbolSize:8,lineStyle:{color:a.p.primary,width:3},itemStyle:{color:a.p.primary},data:input.points.map(r=>r.estimate),tooltip:{formatter:(p:any)=>{const r=input.points[p.dataIndex];return `${esc(r.time)}：${r.estimate?.toFixed(2)}<br/>[${r.lower?.toFixed(2)}, ${r.upper?.toFixed(2)}] · n=${r.n}`;}}}]};
}

export type CoefficientInput = { rows:EstimateRow[]; interval:IntervalDefinition; xLabel:string; scale?:"linear"|"log"; reference:number; domain?:[number,number] } & ScientificAppearance;
export function coefficientOption(input:CoefficientInput){
  const a=appearance(input);intervalDefinition(input.interval);finite(input.reference,"reference");
  if(!input.rows.length || new Set(input.rows.map(r=>r.label)).size!==input.rows.length) throw new Error("Coefficient rows must have unique labels");
  input.rows.forEach(r=>{intervalGeometry(r.estimate,r.lower,r.upper);sampleSize(r.n);if(input.scale==="log"&&r.lower<=0) throw new Error("Log interval bounds must be positive");});
  if(input.scale==="log"&&input.reference<=0) throw new Error("Log reference must be positive");
  const lo=Math.min(input.reference,...input.rows.map(r=>r.lower)),hi=Math.max(input.reference,...input.rows.map(r=>r.upper));
  const padding=(hi-lo || 1)*.08;
  const domain=input.domain ?? (input.scale==="log" ? [lo/1.15,hi*1.15] : [lo-padding,hi+padding]);
  return {...a.base,grid:{left:16,right:40,top:38,bottom:36,containLabel:true},xAxis:{...a.valueAxis,type:input.scale==="log"?"log":"value",name:input.xLabel,nameLocation:"middle",nameGap:36,nameTextStyle:{color:a.p.ink,fontSize:a.fontSize,align:"center"},min:domain[0],max:domain[1],axisLabel:{color:a.p.muted,fontSize:a.fontSize,formatter:(v:number)=>Number(v.toPrecision(3)).toString()}},yAxis:{...a.categoryAxis,inverse:true,data:input.rows.map(r=>r.label)},series:[intervalSeries(input.rows.map((r,i)=>[i,r.lower,r.upper,r.estimate]),a,true,intervalLabel(input.interval)),{name:"点估计",type:"scatter",z:8,symbol:"diamond",symbolSize:12,data:input.rows.map((r,i)=>({value:[r.estimate,i],itemStyle:{color:r.decisive?a.p.decisive:a.p.primary}})),markLine:{symbol:"none",silent:true,label:{show:false},lineStyle:{color:a.p.muted,type:"dashed",width:1.4},data:[{xAxis:input.reference}]},tooltip:{formatter:(p:any)=>{const r=input.rows[p.dataIndex];return `${esc(r.label)}<br/>${r.estimate.toFixed(2)} [${r.lower.toFixed(2)}, ${r.upper.toFixed(2)}]<br/>${intervalLabel(input.interval)} · n=${r.n}`;}}}]};
}

export type RegressionInput = { observations:RegressionObservation[]; fit:FitPoint[]; interval:IntervalDefinition; xLabel:string;yLabel:string } & ScientificAppearance;
export function regressionOption(input:RegressionInput){
  const a=appearance(input);intervalDefinition(input.interval);uniqueIds(input.observations);
  input.observations.forEach(r=>{[r.x,r.y,r.fitted,r.residual].forEach(v=>finite(v,"regression value"));if(Math.abs(r.y-r.fitted-r.residual)>1e-6)throw new Error("Residual must equal observed minus supplied fitted value");});
  input.fit.forEach((r,i)=>{finite(r.x,"fit x");intervalGeometry(r.estimate,r.lower,r.upper);if(i&&r.x<=input.fit[i-1].x)throw new Error("Fit x must be strictly increasing");});
  const band=input.fit.slice(0,-1).map((r,i)=>{const n=input.fit[i+1];return[r.x,r.lower,r.upper,n.x,n.lower,n.upper];});
  return {...a.base,grid:[{left:18,right:"34%",top:78,bottom:44,containLabel:true},{left:"72%",right:20,top:78,bottom:44,containLabel:true}],title:[{text:"A  观测与拟合",left:18,top:2,textStyle:{fontSize:a.fontSize,color:a.p.ink}},{text:"B  残差检查",left:"72%",top:2,textStyle:{fontSize:a.fontSize,color:a.p.ink}}],xAxis:[{...a.valueAxis,name:input.xLabel,nameLocation:"middle",nameGap:30,nameTextStyle:{color:a.p.ink,fontSize:a.fontSize,align:"center"}},{...a.valueAxis,gridIndex:1,name:"拟合值",nameLocation:"middle",nameGap:30,nameTextStyle:{color:a.p.ink,fontSize:a.fontSize,align:"center"},splitNumber:3}],yAxis:[{...a.valueAxis,name:input.yLabel},{...a.valueAxis,gridIndex:1,name:"残差",splitNumber:4}],series:[bandSeries(band,a,true),{type:"scatter",name:"原始观测",symbolSize:7,itemStyle:{color:a.p.primary,opacity:.65},data:input.observations.map(r=>[r.x,r.y])},{type:"line",name:`拟合均值 ${intervalLabel(input.interval)}`,symbol:"none",lineStyle:{color:a.p.decisive,width:2.5},data:input.fit.map(r=>[r.x,r.estimate])},{type:"scatter",name:"残差",xAxisIndex:1,yAxisIndex:1,symbolSize:6,itemStyle:{color:a.p.secondary},data:input.observations.map(r=>[r.fitted,r.residual]),markLine:{silent:true,symbol:"none",label:{show:false},lineStyle:{color:a.p.muted,type:"dashed"},data:[{yAxis:0}]}}]};
}
