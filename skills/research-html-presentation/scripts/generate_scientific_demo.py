"""Deterministic synthetic fixture, not research findings. Requires NumPy/SciPy.
Writes raw observations, computed summaries and transformation metadata together.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from scipy import stats

def build():
    rng=np.random.default_rng(20261020)
    groups=['对照组','方法 A','方法 B']
    observations=[]; summaries=[]; estimates=[]
    for i,g in enumerate(groups):
        values=rng.normal(48+i*6, [7,9,5][i], 28+i*4)
        if i==1: values[-1]+=17
        observations.extend(dict(id=f'g{i}-{j:02}',group=g,value=float(v)) for j,v in enumerate(values))
        q1,median,q3=np.quantile(values,[.25,.5,.75],method='linear');iqr=q3-q1
        low=values[values>=q1-1.5*iqr].min();high=values[values<=q3+1.5*iqr].max()
        summaries.append(dict(group=g,low=float(low),q1=float(q1),median=float(median),q3=float(q3),high=float(high),n=len(values)))
        mean=values.mean();radius=stats.t.ppf(.975,len(values)-1)*stats.sem(values)
        estimates.append(dict(label=g,estimate=float(mean),lower=float(mean-radius),upper=float(mean+radius),n=len(values)))
    before=rng.normal(50,7,30); after=before+rng.normal(6,4,30)
    pairs=[dict(id=f'p{j:02}',before=float(x),after=float(y) if j!=29 else None) for j,(x,y) in enumerate(zip(before,after))]
    visits=[];trend=[]
    for i in range(8):
        if i==4: trend.append(dict(time=f'第{i+1}周',estimate=None,lower=None,upper=None,n=0));continue
        v=rng.normal(42+i*3,5,24)
        visits.extend(dict(id=f'w{i}-{j}',week=i+1,value=float(x)) for j,x in enumerate(v))
        m=v.mean();r=stats.t.ppf(.975,len(v)-1)*stats.sem(v)
        trend.append(dict(time=f'第{i+1}周',estimate=float(m),lower=float(m-r),upper=float(m+r),n=len(v)))
    x=rng.uniform(1,10,72);y=18+3.2*x+rng.normal(0,4,len(x));X=np.column_stack([np.ones(len(x)),x])
    beta=np.linalg.lstsq(X,y,rcond=None)[0];fitted=X@beta;residual=y-fitted
    mse=float(residual@residual/(len(x)-2));cov=mse*np.linalg.inv(X.T@X);crit=stats.t.ppf(.975,len(x)-2)
    fit=[]
    for xv in np.linspace(x.min(),x.max(),65):
        row=np.array([1,xv]);estimate=float(row@beta);radius=float(crit*np.sqrt(row@cov@row))
        fit.append(dict(x=float(xv),estimate=estimate,lower=estimate-radius,upper=estimate+radius))
    # Separate coefficient example: standardized predictors/outcome share comparable units.
    predictors=rng.normal(size=(96,4));predictors=(predictors-predictors.mean(axis=0))/predictors.std(axis=0,ddof=1)
    outcome=predictors@np.array([.55,-.35,.12,.04])+rng.normal(size=96)
    outcome=(outcome-outcome.mean())/outcome.std(ddof=1);design=np.column_stack([np.ones(96),predictors])
    b=np.linalg.lstsq(design,outcome,rcond=None)[0];e=outcome-design@b;cov_b=float(e@e/91)*np.linalg.inv(design.T@design);t_b=stats.t.ppf(.975,91)
    coefficients=[dict(label=label,estimate=float(b[i]),lower=float(b[i]-t_b*np.sqrt(cov_b[i,i])),upper=float(b[i]+t_b*np.sqrt(cov_b[i,i])),n=96) for i,label in enumerate(['','信号强度','环境扰动','资源投入','批次差异']) if i]
    interval=dict(kind='CI',level=.95,method='Student t interval for independent normal-sample mean',samplingUnit='独立模拟观测')
    return dict(schemaVersion=1,demo=True,seed=20261020,warning='全部为确定性模拟数据，仅用于图形能力测试，不能作为研究结论。',
        transforms=[dict(id='demo-groups-summary',method='linear quantiles; Tukey 1.5 IQR whiskers; t mean CI; nulls excluded with counts'),dict(id='demo-pairs-complete',method='pair by stable ID; 29 complete pairs; 1 missing after; no imputation'),dict(id='demo-trend-mean',method='independent samples at each visit; pointwise t mean CI; week 5 missing, n=0'),dict(id='demo-ols',method='OLS y~1+x; Gaussian homoskedastic errors; t parameter CI and pointwise fitted-mean CI; residual=y-fitted'),dict(id='demo-coefficient-ols',method='independent n=96; standardize four predictors and outcome using sample SD; OLS with intercept; coefficient t CI df=91; intercept omitted from figure')],
        distribution=dict(observations=observations,summaries=summaries,estimates=estimates,interval=interval,yLabel='响应值（a.u.）',domain=[25,88]),
        paired=dict(observations=pairs,labels=['处理前','处理后'],yLabel='响应值（a.u.）',domain=[25,88]),
        trend=dict(points=trend,interval=interval,yLabel='响应值（a.u.）',domain=[35,70]),trendObservations=visits,
        regression=dict(observations=[dict(id=f'r{i:02}',x=float(xv),y=float(yv),fitted=float(fv),residual=float(rv)) for i,(xv,yv,fv,rv) in enumerate(zip(x,y,fitted,residual))],fit=fit,interval=dict(kind='CI',level=.95,method='OLS pointwise fitted-mean t interval, not prediction interval',samplingUnit='独立模拟观测'),xLabel='输入强度（a.u.）',yLabel='响应值（a.u.）'),
        coefficientObservations=[dict(id=f'c{i:02}',predictors=[float(v) for v in predictors[i]],outcome=float(outcome[i])) for i in range(96)],
        coefficient=dict(rows=coefficients,interval=dict(kind='CI',level=.95,method='OLS standardized coefficient t interval, df=91',samplingUnit='独立模拟观测'),xLabel='标准化回归系数 β',reference=0))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
    data=build();body=json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
    target=Path(args.output);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(body,encoding='utf-8')
    print(f'{target}: synthetic seed {data["seed"]}; SHA256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
