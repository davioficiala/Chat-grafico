const ATIVOS=[
  {id:"WDO",label:"Mini Dólar (WDO)",base:5.72,step:0.0005},
  {id:"WIN",label:"Mini Índice (WIN)",base:132500,step:50},
  {id:"PETR4",label:"PETR4",base:38.5,step:0.05},
  {id:"VALE3",label:"VALE3",base:62.3,step:0.05},
];

let ativoIdx=0;
let candles=[];
let sinal=null;


// ── Gerar candles ──

function gerarCandles(base,step,n=60){

  const arr=[];
  let preco=base;
  const now=Date.now();

  for(let i=n;i>=0;i--){

    const vol=(Math.random()-0.48)*step*8;
    const open=preco;
    const close=open+vol;

    const high=Math.max(open,close)+Math.random()*step*3;
    const low=Math.min(open,close)-Math.random()*step*3;

    const t=new Date(now-i*60000);

    arr.push({
      time:t.toTimeString().slice(0,5),
      open,
      high,
      low,
      close,
      volume:Math.floor(200+Math.random()*1800),
      ma9:0,
      ma21:0,
      rsi:50,
      macd:0,
      signal:0,
      bb_upper:0,
      bb_lower:0,
      bb_mid:0
    });

    preco=close;
  }

  return calcIndicadores(arr);

}



// ── Calcular indicadores ──

function calcIndicadores(c){

  for(let i=0;i<c.length;i++){

    if(i>=8)
      c[i].ma9=c.slice(i-8,i+1)
      .reduce((s,x)=>s+x.close,0)/9;


    if(i>=20)
      c[i].ma21=c.slice(i-20,i+1)
      .reduce((s,x)=>s+x.close,0)/21;

  }


  for(let i=14;i<c.length;i++){

    let g=0,l=0;

    for(let j=i-13;j<=i;j++){

      const d=c[j].close-c[j>0?j-1:0].close;

      if(d>0)
        g+=d;
      else
        l-=d;

    }

    c[i].rsi=100-100/(1+g/(l||0.001));

  }


  const ema=(arr,p)=>{

    const k=2/(p+1);
    let e=arr[0];

    return arr.map(v=>{

      e=v*k+e*(1-k);
      return e;

    });

  };


  const cl=c.map(x=>x.close);

  const e12=ema(cl,12);
  const e26=ema(cl,26);

  const ml=e12.map((v,i)=>v-e26[i]);
  const sl=ema(ml,9);


  c.forEach((x,i)=>{

    x.macd=ml[i];
    x.signal=sl[i];

  });
