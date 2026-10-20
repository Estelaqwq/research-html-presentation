"""Render supplied scientific geometry; never estimate statistics while exporting.
Dependencies: numpy, matplotlib. Use --help for the CLI. SVG text uses paths.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

PALETTES={
 'academic-light':dict(bg='#ffffff',ink='#162b4f',muted='#63738b',grid='#dce5f3',primary='#2455b5',secondary='#6f8fc9',decisive='#b3262e',groups=['#2455b5','#b3262e','#7868a6']),
 'tech-engineering-dark':dict(bg='#061c50',ink='#e8f5ff',muted='#a0bde6',grid='#214580',primary='#20b9ff',secondary='#438dff',decisive='#ffe393',groups=['#20b9ff','#ffe393','#c4adff'])}
KINDS=['distribution','paired','trend','regression','coefficient','multipanel']
def interval(d):
    v=d['interval']
    if v['kind'] not in ['CI','SD','SE','prediction'] or not v['method'].strip() or not v['samplingUnit'].strip(): raise ValueError('Declare interval kind, method and sampling unit')
    if v['kind'] in ['CI','prediction'] and not 0<v.get('level',0)<1:raise ValueError('Invalid interval level')
    return f'{v.get("level",0)*100:g}% {v["kind"]}' if v.get('level') else v['kind']
def bounds(m,l,u):
    if not all(np.isfinite([m,l,u])) or not l<=m<=u:raise ValueError('Invalid finite ordered bounds')
def nvalid(n):
    if not isinstance(n,int) or n<1:raise ValueError('n must be positive integer')
def unique(rows):
    ids=[r['id'] for r in rows]
    if any(not x.strip() for x in ids) or len(set(ids))!=len(ids):raise ValueError('Duplicate/missing observation ID')
def validate(kind,d):
    if kind=='multipanel':
        for k in ['distribution','trend','coefficient']:validate(k,d[k])
    elif kind=='distribution':
        unique(d['observations']);groups=[s['group'] for s in d['summaries']]
        if len(set(groups))!=len(groups) or not groups:raise ValueError('Invalid summary groups')
        for r in d['observations']:
            if r['group'] not in groups:raise ValueError('Unknown group')
            if r['value'] is not None and not np.isfinite(r['value']):raise ValueError('Nonfinite observation')
        for s in d['summaries']:
            nvalid(s['n']);v=[s[k] for k in ['low','q1','median','q3','high']]
            if not all(np.isfinite(v)) or any(b<a for a,b in zip(v,v[1:])):raise ValueError('Invalid box geometry')
            if s['n']!=sum(r['group']==s['group'] and r['value'] is not None for r in d['observations']):raise ValueError('n mismatch')
        if d.get('estimates'):
            interval(d)
            for r in d['estimates']:
                bounds(r['estimate'],r['lower'],r['upper']);nvalid(r['n'])
                if r['label'] not in groups or next(s['n'] for s in d['summaries'] if s['group']==r['label'])!=r['n']:raise ValueError('Estimate n/group mismatch')
    elif kind=='paired':
        unique(d['observations'])
        for r in d['observations']:
            for k in ['before','after']:
                if r[k] is not None and not np.isfinite(r[k]):raise ValueError('Nonfinite paired observation')
    elif kind=='trend':
        interval(d);times=[r['time'] for r in d['points']]
        if len(set(times))!=len(times):raise ValueError('Duplicate time')
        for r in d['points']:
            missing=sum(r[k] is None for k in ['estimate','lower','upper'])
            if missing not in [0,3]:raise ValueError('Partial missing trend bounds')
            if not missing:bounds(r['estimate'],r['lower'],r['upper']);nvalid(r['n'])
            elif r['n']!=0:raise ValueError('Missing time requires n=0')
    elif kind=='coefficient':
        interval(d)
        if not np.isfinite(d['reference']):raise ValueError('Invalid reference')
        for r in d['rows']:
            bounds(r['estimate'],r['lower'],r['upper']);nvalid(r['n'])
            if d.get('scale')=='log' and min(r['lower'],d['reference'])<=0:raise ValueError('Log geometry must be positive')
    elif kind=='regression':
        interval(d);unique(d['observations'])
        for r in d['observations']:
            if not all(np.isfinite([r[k] for k in ['x','y','fitted','residual']])) or abs(r['y']-r['fitted']-r['residual'])>1e-6:raise ValueError('Invalid residual geometry')
        for i,r in enumerate(d['fit']):
            bounds(r['estimate'],r['lower'],r['upper'])
            if not np.isfinite(r['x']) or (i and r['x']<=d['fit'][i-1]['x']):raise ValueError('Fit x not increasing')
def axes_style(ax,p):
    ax.set_facecolor(p['bg']);ax.spines[['top','right']].set_visible(False)
    for s in ['left','bottom']:ax.spines[s].set_color(p['grid'])
    ax.tick_params(colors=p['muted']);ax.yaxis.grid(True,color=p['grid'],linestyle='--',linewidth=.65);ax.set_axisbelow(True)
def draw(ax,kind,d,p):
    axes_style(ax,p)
    if kind=='distribution':
        for i,s in enumerate(d['summaries']):
            ax.bxp([dict(label=s['group'],whislo=s['low'],q1=s['q1'],med=s['median'],q3=s['q3'],whishi=s['high'],fliers=[])],positions=[i],widths=.27,patch_artist=True,showfliers=False,boxprops=dict(facecolor=p['bg'],edgecolor=p['secondary']),medianprops=dict(color=p['ink']),whiskerprops=dict(color=p['secondary']),capprops=dict(color=p['secondary']))
            rows=[r for r in d['observations'] if r['group']==s['group'] and r['value'] is not None]
            # Stable ID jitter, independent of renderer order and random state.
            jitter=[(int(hashlib.sha256(r['id'].encode()).hexdigest()[:8],16)%1001/1000-.5)*.32 for r in rows]
            ax.scatter(np.array(jitter)+i,[r['value'] for r in rows],s=15,alpha=.65,c=p['groups'][i%len(p['groups'])],zorder=3)
        for r in d.get('estimates',[]):
            i=[s['group'] for s in d['summaries']].index(r['label'])+.25
            ax.errorbar(i,r['estimate'],yerr=[[r['estimate']-r['lower']],[r['upper']-r['estimate']]],fmt='o',markersize=4,color=p['ink'],capsize=3,zorder=5)
        ax.set_xticks(range(len(d['summaries'])),[f'{s["group"]}\nn={s["n"]}' for s in d['summaries']]);ax.set_ylabel(d['yLabel']);ax.set_xlim(-.5,len(d['summaries'])-.5)
        if d.get('domain'):ax.set_ylim(d['domain'])
    elif kind=='paired':
        complete=[r for r in d['observations'] if r['before'] is not None and r['after'] is not None]
        for r in complete:ax.plot([0,1],[r['before'],r['after']],'-o',color=p['secondary'],alpha=.5,markersize=2.5,linewidth=.8)
        ax.set_xticks([0,1],d['labels']);ax.set_xlim(-.3,1.3);ax.set_ylabel(d['yLabel']);ax.set_title(f'完整配对 {len(complete)} / {len(d["observations"])}',loc='left')
        if d.get('domain'):ax.set_ylim(d['domain'])
    elif kind=='trend':
        x=np.arange(len(d['points']));vals=lambda k:np.array([np.nan if r[k] is None else r[k] for r in d['points']])
        ax.fill_between(x,vals('lower'),vals('upper'),color=p['primary'],alpha=.18);ax.plot(x,vals('estimate'),'-o',color=p['primary'],markersize=3)
        step=2 if len(x)>6 else 1; ax.set_xticks(x[::step],[r['time'] for r in d['points']][::step]);ax.set_ylabel(d['yLabel'])
        if d.get('domain'):ax.set_ylim(d['domain'])
    elif kind=='coefficient':
        ax.axvline(d['reference'],color=p['muted'],ls='--',lw=.8,label=f'参考 {d["reference"]}')
        for i,r in enumerate(d['rows']):ax.errorbar(r['estimate'],i,xerr=[[r['estimate']-r['lower']],[r['upper']-r['estimate']]],fmt='D',markersize=4,color=p['primary'],capsize=3)
        ax.set_yticks(range(len(d['rows'])),[r['label'] for r in d['rows']]);ax.invert_yaxis();ax.set_xlabel(d['xLabel']);ax.margins(y=.5)
        if d.get('scale')=='log':ax.set_xscale('log')
        if d.get('domain'):ax.set_xlim(d['domain'])
    elif kind=='regression':
        rows=d['observations'];fit=d['fit'];ax.scatter([r['x'] for r in rows],[r['y'] for r in rows],s=15,color=p['primary'],alpha=.6)
        ax.fill_between([r['x'] for r in fit],[r['lower'] for r in fit],[r['upper'] for r in fit],color=p['primary'],alpha=.18);ax.plot([r['x'] for r in fit],[r['estimate'] for r in fit],color=p['decisive']);ax.set_xlabel(d['xLabel']);ax.set_ylabel(d['yLabel'])
def export(data,kind,style,profile,output,input_hash):
    p=PALETTES[style];d=data if kind=='multipanel' else data.get(kind,data);validate(kind,d)
    installed={f.name for f in font_manager.fontManager.ttflist};font=next((f for f in ['Microsoft YaHei','Noto Sans CJK SC','SimHei'] if f in installed),'DejaVu Sans')
    config={'font.family':font,'font.size':14 if profile=='slide' else 9,'axes.labelcolor':p['ink'],'axes.titlecolor':p['ink'],'text.color':p['ink'],'figure.facecolor':p['bg'],'savefig.facecolor':p['bg'],'svg.fonttype':'path','pdf.fonttype':42,'axes.unicode_minus':False}
    with plt.rc_context(config):
        if kind=='multipanel':
            fig=plt.figure(figsize=(13.33,7.5));gs=fig.add_gridspec(2,2,width_ratios=[1.55,1],hspace=.65,wspace=.42)
            for ax,k,label in [(fig.add_subplot(gs[:,0]),'distribution','A · 分布'),(fig.add_subplot(gs[0,1]),'trend','B · 趋势'),(fig.add_subplot(gs[1,1]),'coefficient','C · 系数')]:draw(ax,k,d[k],p);ax.set_title(label,loc='left')
        elif kind=='regression':
            fig,axes=plt.subplots(1,2,figsize=(13.33,6),gridspec_kw={'width_ratios':[2,1]});draw(axes[0],kind,d,p);ax=axes[1];axes_style(ax,p);rows=d['observations'];ax.scatter([r['fitted'] for r in rows],[r['residual'] for r in rows],s=14,c=p['secondary']);ax.axhline(0,color=p['muted'],ls='--',lw=.8);ax.set_xlabel('拟合值');ax.set_ylabel('残差');ax.set_title('B · 残差检查',loc='left');axes[0].set_title('A · 观测与拟合',loc='left');fig.subplots_adjust(wspace=.4)
        else:fig,ax=plt.subplots(figsize=(10.67,6));draw(ax,kind,d,p)
        notice='模拟数据 · 仅用于能力演示' if data.get('demo') else '来源与分析方法见伴随元数据'
        method=interval(d) if 'interval' in d else ''
        fig.text(.02,.025,f'{notice}   {method}',color=p['muted'],fontsize=9)
        fig.subplots_adjust(bottom=.18,top=.88,left=.1,right=.96)
        out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
        for ext in ['svg','pdf','png']:fig.savefig(str(out)+'.'+ext,dpi=240)
        plt.close(fig)
    meta=dict(inputSha256=input_hash,kind=kind,style=style,profile=profile,font=font,svgText='paths',dpi=240,renderer=f'Matplotlib {matplotlib.__version__}',interval=d.get('interval'),panelIntervals={k:d[k].get('interval') for k in ['distribution','trend','coefficient']} if kind=='multipanel' else None,sourceDataUnmodified=True,demo=data.get('demo',False))
    Path(str(output)+'.metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    return meta
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--kind',choices=KINDS,required=True);parser.add_argument('--style',choices=list(PALETTES),default='academic-light');parser.add_argument('--profile',choices=['slide','manuscript'],default='slide');parser.add_argument('--output',required=True);args=parser.parse_args()
    raw=Path(args.input).read_bytes();export(json.loads(raw),args.kind,args.style,args.profile,args.output,hashlib.sha256(raw).hexdigest());print(f'Wrote SVG/PDF/PNG + metadata: {args.output}')
