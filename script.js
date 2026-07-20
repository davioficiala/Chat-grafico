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


    for(let i=20;i<c.length;i++){

    const s=c.slice(i-19,i+1)
      .map(x=>x.close);

    const mid=s.reduce((a,v)=>a+v,0)/20;

    const std=Math.sqrt(
      s.reduce((a,v)=>a+(v-mid)**2,0)/20
    );

    c[i].bb_mid=mid;
    c[i].bb_upper=mid+2*std;
    c[i].bb_lower=mid-2*std;

  }

  return c;

}



// ── Analisar IA ──

function analisarIA(c){

  const u=c[c.length-1];
  const p=c[c.length-2];

  let score=0;
  const mot=[];


  if(u.ma9>u.ma21 && p.ma9<=p.ma21){

    score+=30;
    mot.push("Cruzamento altista MA9×MA21");

  }else if(u.ma9<u.ma21 && p.ma9>=p.ma21){

    score-=30;
    mot.push("Cruzamento baixista MA9×MA21");

  }else if(u.ma9>u.ma21){

    score+=10;
    mot.push("MA9 acima da MA21");

  }else{

    score-=10;
    mot.push("MA9 abaixo da MA21");

  }


  if(u.rsi<30){

    score+=25;
    mot.push(`RSI ${u.rsi.toFixed(1)} — sobrevendido`);

  }else if(u.rsi>70){

    score-=25;
    mot.push(`RSI ${u.rsi.toFixed(1)} — sobrecomprado`);

  }else if(u.rsi>50){

    score+=8;
    mot.push(`RSI ${u.rsi.toFixed(1)} — momentum altista`);

  }else{

    score-=8;
    mot.push(`RSI ${u.rsi.toFixed(1)} — momentum baixista`);

  }


  if(u.macd>u.signal && p.macd<=p.signal){

    score+=20;
    mot.push("MACD cruzou acima da signal");

  }


  if(u.macd<u.signal && p.macd>=p.signal){

    score-=20;
    mot.push("MACD cruzou abaixo da signal");

  }


  if(u.close<u.bb_lower && u.bb_lower>0){

    score+=15;
    mot.push("Preço na banda inferior");

  }


  if(u.close>u.bb_upper && u.bb_upper>0){

    score-=15;
    mot.push("Preço na banda superior");

  }


  const corpo=Math.abs(u.close-u.open);
  const sombra=u.high-u.low;


  if(u.close>u.open && corpo>sombra*.6){

    score+=10;
    mot.push("Candle de alta forte");

  }


  if(u.close<u.open && corpo>sombra*.6){

    score-=10;
    mot.push("Candle de baixa forte");

  }


  const forca=Math.min(Math.abs(score),100);

  const step=u.high-u.low;


  if(score>=25)

    return {
      tipo:"COMPRA",
      forca,
      motivo:mot.slice(0,3).join(" · "),
      entrada:u.close,
      stop:u.close-step*2,
      alvo:u.close+step*3
    };


  if(score<=-25)

    return {
      tipo:"VENDA",
      forca,
      motivo:mot.slice(0,3).join(" · "),
      entrada:u.close,
      stop:u.close+step*2,
      alvo:u.close-step*3
    };


  return {
    tipo:"AGUARDAR",
    forca,
    motivo:mot.slice(0,2).join(" · "),
    entrada:u.close,
    stop:0,
    alvo:0
  };

}
