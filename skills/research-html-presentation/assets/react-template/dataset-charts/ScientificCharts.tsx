"use client";
import { useCallback, type ReactNode } from "react";
import { DatasetChartFrame, type DatasetChartCommonProps } from "./DatasetChartFrame";
import { distributionOption, pairedOption, trendOption, coefficientOption, regressionOption } from "./scientific-options";
import type { DistributionInput, PairedInput, TrendInput, CoefficientInput, RegressionInput } from "./scientific-options";
import { currentVisualStyle } from "../chart-adapters/academic-theme";

type Common = Omit<DatasetChartCommonProps, "buildOption" | "series" | "metrics">;
function ScientificChart({ input, builder, ...props }: Common & { input: any; builder: (input:any)=>Record<string,unknown> }) {
  const visualStyle=props.visualStyle ?? currentVisualStyle();
  const buildOption=useCallback(()=>builder({...input,visualStyle}),[builder,input,visualStyle]);
  return <DatasetChartFrame {...props} visualStyle={visualStyle} buildOption={buildOption}/>;
}
export function ScientificDistributionChart({input,...props}:Common & {input:DistributionInput}){return <ScientificChart {...props} input={input} builder={distributionOption}/>;}
export function PairedObservationChart({input,...props}:Common & {input:PairedInput}){return <ScientificChart {...props} input={input} builder={pairedOption}/>;}
export function UncertaintyTrendChart({input,...props}:Common & {input:TrendInput}){return <ScientificChart {...props} input={input} builder={trendOption}/>;}
export function CoefficientIntervalChart({input,...props}:Common & {input:CoefficientInput}){return <ScientificChart {...props} input={input} builder={coefficientOption}/>;}
export function RegressionDiagnosticChart({input,...props}:Common & {input:RegressionInput}){return <ScientificChart {...props} input={input} builder={regressionOption}/>;}

/** Layout only: child charts retain their own evidence records and common supplied domains. */
export function ScientificPanelGrid({hero,supports,label="组合结果图"}:{hero:ReactNode; supports:ReactNode[];label?:string}){
  return <div className="scientific-panel-grid" aria-label={label}><div className="scientific-panel-hero">{hero}</div><div className="scientific-panel-supports">{supports.map((node,i)=><div key={i}>{node}</div>)}</div></div>;
}
