
// ===============================
// PARTE 1
// ===============================

const API_KEY = "https://brapi.dev/api/v2/stocks/quote?symbols=PETR4";
const API_URL = "https://api.hgbrasil.com/finance?key=suachave";


const ATIVOS=[
  {id:"WDO",label:"Mini Dólar (WDO)",base:5.72,step:0.0005},
  {id:"WIN",label:"Mini Índice (WIN)",base:132500,step:50},
  {id:"PETR4",label:"PETR4",base:38.5,step:0.05},
  {id:"VALE3",label:"VALE3",base:62.3,step:0.05},
];

let ativoIdx=0;
let candles=[];
let sinal=null;


// ── Buscar candles reais Twelve Data ──

async function buscarCandlesAPI(){

  const resposta = await fetch(
    `${API_URL}/time_series?symbol=PETR4&interval=1min&outputsize=60&apikey=${API_KEY}`
  );

  const dados = await resposta.json();


  if(!dados.values){

    console.log("Erro API:", dados);

    return [];

  }


  return dados.values.reverse().map(c=>({

    time:c.datetime.slice(11,16),

    open:Number(c.open),

    high:Number(c.high),

    low:Number(c.low),

    close:Number(c.close),

    volume:Number(c.volume || 0),

    ma9:0,

    ma21:0,

    rsi:50,

    macd:0,

    signal:0,

    bb_upper:0,

    bb_lower:0,

    bb_mid:0

  }));

}



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


// ===============================
// FIM PARTE 1
// ===============================



// ===============================
// FIM PARTE 1
// ===============================


// ===============================
// API TEMPO REAL
// ===============================

let candleAtual = null;


// Buscar preço atual Twelve Data

async function buscarPrecoTempoReal(){

const ativo = ATIVOS[ativoIdx];


const resposta = await fetch(
`${API_URL}/quote?symbol=${ativo.id}&apikey=${API_KEY}`
);


const dados = await resposta.json();


if(!dados.close){

console.log("Erro API tempo real:", dados);

return null;

}


return Number(dados.close);


}



// Atualizar candle aberto

function atualizarCandle(preco){


const agora = new Date();

const minuto =
agora.toTimeString().slice(0,5);



if(!candleAtual || candleAtual.time !== minuto){


candleAtual={

time:minuto,

open:preco,

high:preco,

low:preco,

close:preco,

volume:0,

ma9:0,

ma21:0,

rsi:50,

macd:0,

signal:0,

bb_upper:0,

bb_lower:0,

bb_mid:0

};


candles.push(candleAtual);



if(candles.length>60){

candles.shift();

}



}else{


candleAtual.high =
Math.max(candleAtual.high,preco);


candleAtual.low =
Math.min(candleAtual.low,preco);


candleAtual.close = preco;


}



// Recalcula indicadores

candles = calcIndicadores(candles);


// Atualiza IA

sinal = analisarIA(candles);


// Atualiza tela

renderAll();


}



// Loop de atualização

setInterval(async()=>{


const preco =
await buscarPrecoTempoReal();


if(preco){

atualizarCandle(preco);

}


},5000);



// ===============================
// FIM API TEMPO REAL
// ===============================



// ===============================
// PARTE 2
// ===============================


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


// ── Desenhar gráficos canvas ──

function desenharMain(){

const cv=document.getElementById("cvMain");

cv.width=cv.offsetWidth||360;

const ctx=cv.getContext("2d");

const d=candles.slice(-40);

const W=cv.width;
const H=cv.height||220;


ctx.clearRect(0,0,W,H);


const prices=d.flatMap(c=>[
c.high,
c.low,
c.ma9||c.close,
c.ma21||c.close,
c.bb_upper||c.close,
c.bb_lower||c.close
]).filter(v=>v>0);


const minP=Math.min(...prices);
const maxP=Math.max(...prices);

const range=maxP-minP||1;


const pad={
t:10,
b:20,
l:48,
r:8
};


const cW=W-pad.l-pad.r;
const cH=H-pad.t-pad.b;


const toY=v=>
pad.t+cH-(v-minP)/range*cH;


const bw=Math.max(2,Math.floor(cW/d.length)-2);

const bx=i=>
pad.l+i*(cW/d.length)+cW/d.length/2;



// Grid

ctx.strokeStyle="#21262d";
ctx.lineWidth=1;


for(let i=0;i<4;i++){

const y=pad.t+i*cH/3;

ctx.beginPath();
ctx.moveTo(pad.l,y);
ctx.lineTo(W-pad.r,y);
ctx.stroke();

}


// ===============================
// FIM PARTE 2
// ===============================

// ===============================
// PARTE 3
// ===============================


d.forEach((c,i)=>{

if(c.ma21>0){

const x=bx(i);
const y=toY(c.ma21);

i===0
?
ctx.moveTo(x,y)
:
ctx.lineTo(x,y);

}

});


ctx.stroke();



// Candles

d.forEach((c,i)=>{

const alta=c.close>=c.open;

const cor=alta?
"#26a17b":
"#ef4444";


const x=bx(i);

const yH=toY(c.high);
const yL=toY(c.low);

const yO=toY(c.open);
const yC=toY(c.close);


ctx.strokeStyle=cor;
ctx.lineWidth=1;

ctx.beginPath();
ctx.moveTo(x,yH);
ctx.lineTo(x,yL);
ctx.stroke();


ctx.fillStyle=cor;

const bodyY=Math.min(yO,yC);

const bodyH=Math.max(Math.abs(yC-yO),1);


ctx.fillRect(
x-bw/2,
bodyY,
bw,
bodyH
);


});



// Labels

ctx.fillStyle="#8b949e";
ctx.font="9px monospace";
ctx.textAlign="right";


const ativo=ATIVOS[ativoIdx];


for(let i=0;i<=3;i++){

const v=minP+range*i/3;

ctx.fillText(
v.toFixed(ativo.step<1?3:1),
pad.l-4,
pad.t+cH-i*cH/3+3
);

}


ctx.textAlign="center";


d.forEach((c,i)=>{

if(i%10===0)

ctx.fillText(
c.time,
bx(i),
H-4
);

});


}


// ===============================
// FIM PARTE 3 
// ===============================

// ===============================
// PARTE 4
// ===============================


// ── Volume ──

function desenharVol(){

const cv=document.getElementById("cvVol");

cv.width=cv.offsetWidth||360;

const ctx=cv.getContext("2d");

const d=candles.slice(-40);

const W=cv.width;
const H=cv.height||60;


ctx.clearRect(0,0,W,H);


const maxV=Math.max(...d.map(c=>c.volume))||1;

const pad={
l:8,
r:8
};

const cW=W-pad.l-pad.r;


d.forEach((c,i)=>{

const x=pad.l+i*(cW/d.length);

const bw=Math.max(1,cW/d.length-2);

const bh=c.volume/maxV*(H-4);


ctx.fillStyle=
c.close>=c.open
?
"#26a17b66"
:
"#ef444466";


ctx.fillRect(
x,
H-bh,
bw,
bh
);


});


}



// ── RSI ──

function desenharRsi(){

const cv=document.getElementById("cvRsi");

cv.width=cv.offsetWidth||360;


const ctx=cv.getContext("2d");

const d=candles.slice(-40);


const W=cv.width;
const H=cv.height||70;


ctx.clearRect(0,0,W,H);


const pad={
l:28,
r:8,
t:4,
b:4
};


const cW=W-pad.l-pad.r;
const cH=H-pad.t-pad.b;


const toY=v=>
pad.t+cH-(v/100)*cH;



// Zonas

ctx.fillStyle="#ef444412";

ctx.fillRect(
pad.l,
pad.t,
cW,
toY(70)-pad.t
);


ctx.fillStyle="#26a17b12";

ctx.fillRect(
pad.l,
toY(30),
cW,
cH-(toY(30)-pad.t)
);



// Linhas

[30,50,70].forEach(v=>{


ctx.strokeStyle=
v===50
?
"#30363d"
:
"#ef444430";


if(v===30)
ctx.strokeStyle="#26a17b30";


ctx.lineWidth=1;

ctx.setLineDash([4,2]);


ctx.beginPath();

ctx.moveTo(
pad.l,
toY(v)
);


ctx.lineTo(
W-pad.r,
toY(v)
);


ctx.stroke();


});


ctx.setLineDash([]);



// Barras RSI

const bw=Math.max(1,cW/d.length-2);


d.forEach((c,i)=>{


const x=pad.l+i*(cW/d.length);


const cor=
c.rsi>70
?
"#ef4444"
:
c.rsi<30
?
"#26a17b"
:
"#6366f1";


const y=toY(c.rsi);

const bh=H-pad.b-y;


ctx.fillStyle=cor+"aa";


ctx.fillRect(
x,
y,
bw,
bh
);


});


// ===============================
// FIM PARTE 4 
// ===============================

// ===============================
// PARTE 5
// ===============================


// Valores

ctx.fillStyle="#8b949e";

ctx.font="9px monospace";

ctx.textAlign="right";


[30,50,70].forEach(v=>{

ctx.fillText(
v,
pad.l-3,
toY(v)+3
);

});


const last=candles[candles.length-1];


document.getElementById("rsi-title").textContent=
`RSI (14) — ${last?last.rsi.toFixed(1):"--"}`;


}

// ── Atualizar UI ──

function atualizarPreco(){

const ativo=ATIVOS[ativoIdx];

const last=candles[candles.length-1];

const prev=candles[candles.length-2];


if(!last)return;


const dp=ativo.step<1?4:2;


const diff=prev?
last.close-prev.close:
0;


const pct=prev?
((diff/prev.close)*100):
0;


const alta=diff>=0;



document.getElementById("ativo-label").textContent=
ativo.label;


document.getElementById("preco-atual").textContent=
last.close.toFixed(dp);


document.getElementById("preco-atual").style.color=
alta?
"#26a17b":
"#ef4444";



document.getElementById("preco-diff").textContent=
`${alta?"▲":"▼"} ${Math.abs(diff).toFixed(dp)} (${alta?"+":""}${pct.toFixed(2)}%)`;



document.getElementById("preco-diff").style.color=
alta?
"#26a17b":
"#ef4444";



document.getElementById("preco-hl").textContent=
`H: ${last.high.toFixed(dp)} · L: ${last.low.toFixed(dp)}`;



document.getElementById("candle-count").textContent=
`${Math.min(candles.length,40)} candles`;



}




function atualizarSinal(){

if(!sinal)return;


const cor=
sinal.tipo==="COMPRA"
?
"#26a17b"
:
sinal.tipo==="VENDA"
?
"#ef4444"
:
"#f59e0b";



const bg=
sinal.tipo==="COMPRA"
?
"#052e1c"
:
sinal.tipo==="VENDA"
?
"#1f0a0a"
:
"#1c1200";



const txt=
sinal.tipo==="COMPRA"
?
"⬆ COMPRA"
:
sinal.tipo==="VENDA"
?
"⬇ VENDA"
:
"⏸ AGUARDAR";



// Badge

document.getElementById("sinal-badge").style.borderColor=cor;

document.getElementById("sinal-badge").style.background=bg;


document.getElementById("sinal-tipo").textContent=
sinal.tipo;


document.getElementById("sinal-tipo").style.color=cor;


document.getElementById("sinal-forca-top").textContent=
sinal.forca+"%";


document.getElementById("sinal-forca-top").style.color=cor;




// Card IA

document.getElementById("sinal-card").style.borderColor=cor;

document.getElementById("sinal-card").style.background=bg;


document.getElementById("sinal-main").textContent=txt;

document.getElementById("sinal-main").style.color=cor;


document.getElementById("sinal-forca-pct").textContent=
sinal.forca+"%";


document.getElementById("forca-fill").style.width=
sinal.forca+"%";


document.getElementById("forca-fill").style.background=
cor;


document.getElementById("sinal-motivo").textContent=
sinal.motivo;



}


// ===============================
// FIM PARTE 5
// ===============================

// ===============================
// PARTE 6
// ===============================


// ── Entrada / Stop / Alvo ──

function atualizarEntrada(){

const ativo=ATIVOS[ativoIdx];

const dp=ativo.step<1?4:2;


const grid=document.getElementById("entrada-grid");


grid.style.display=
sinal.tipo!=="AGUARDAR"
?
"grid"
:
"none";



document.getElementById("entrada-val").textContent=
sinal.entrada.toFixed(dp);


document.getElementById("stop-val").textContent=
sinal.stop.toFixed(dp);


document.getElementById("alvo-val").textContent=
sinal.alvo.toFixed(dp);


}




// ── Análise completa ──

function atualizarAnalise(){

const last=candles[candles.length-1];

if(!last)return;


const set=(id,txt,cor)=>{

const el=document.getElementById(id);

el.textContent=txt;

el.style.color=cor;

};



set(
"a-tendencia",
last.ma9>last.ma21?
"ALTA ▲":
"BAIXA ▼",
last.ma9>last.ma21?
"#26a17b":
"#ef4444"
);



set(
"a-rsi",
`${last.rsi.toFixed(1)} — ${
last.rsi>70?
"Sobrecomprado":
last.rsi<30?
"Sobrevendido":
"Neutro"
}`,
last.rsi>70?
"#ef4444":
last.rsi<30?
"#26a17b":
"#f59e0b"
);



set(
"a-macd",
last.macd>last.signal?
"Acima da signal ▲":
"Abaixo da signal ▼",
last.macd>last.signal?
"#26a17b":
"#ef4444"
);



set(
"a-boll",
last.close>last.bb_upper?
"Acima da banda":
last.close<last.bb_lower?
"Abaixo da banda":
"Dentro das bandas",
last.close>last.bb_upper?
"#ef4444":
last.close<last.bb_lower?
"#26a17b":
"#8b949e"
);



set(
"a-candle",
last.close>last.open?
"Alta 🟢":
"Baixa 🔴",
last.close>last.open?
"#26a17b":
"#ef4444"
);



set(
"a-vol",
last.volume>1000?
"Alto 🔊":
"Baixo 🔇",
last.volume>1000?
"#58a6ff":
"#8b949e"
);


}



// ── Indicadores ──

function atualizarIndicadores(){

const last=candles[candles.length-1];

if(!last)return;


const ativo=ATIVOS[ativoIdx];

const dp=ativo.step<1?4:2;


const itens=[

{
nome:"MA 9",
val:last.ma9?last.ma9.toFixed(dp):"--",
desc:"Média Móvel Rápida"
},

{
nome:"MA 21",
val:last.ma21?last.ma21.toFixed(dp):"--",
desc:"Média Móvel Lenta"
},

{
nome:"RSI 14",
val:last.rsi.toFixed(1),
desc:"RSI"
},

{
nome:"MACD",
val:last.macd.toFixed(5),
desc:"MACD Line"
},

{
nome:"Signal",
val:last.signal.toFixed(5),
desc:"Signal Line"
},

{
nome:"Volume",
val:last.volume.toLocaleString("pt-BR"),
desc:"Volume"
}

];


// Lista indicadores

document.getElementById("ind-lista").innerHTML=
itens.map(it=>`

<div class="ind-row">

<div>

<div class="ind-name">
${it.nome}
</div>

<div class="ind-desc">
${it.desc}
</div>

</div>

<div class="ind-val">
${it.val}
</div>

</div>

`).join("");



// Suporte e resistência

const prices=candles
.slice(-20)
.map(c=>c.close);


const sup=Math.min(...prices).toFixed(dp);

const res=Math.max(...prices).toFixed(dp);



document.getElementById("sr-lista").innerHTML=`

<div class="sr-row">

<span>
🟢 Suporte
</span>

<span class="ind-val">
${sup}
</span>

</div>


<div class="sr-row">

<span>
🔴 Resistência
</span>

<span class="ind-val">
${res}
</span>

</div>

`;

}

// ===============================
// FIM PARTE 6 parei parte 6
// ===============================


// ===============================
// PARTE 7 - API REAL
// ===============================


// ── Render geral ──

function renderAll(){

atualizarPreco();

desenharMain();

desenharVol();

desenharRsi();

atualizarSinal();

atualizarEntrada();

atualizarAnalise();

atualizarIndicadores();

}



// ── Abas ──

function setTab(id){

document.querySelectorAll(".tab-content")
.forEach(el=>el.classList.remove("active"));


document.querySelectorAll(".tab-btn")
.forEach(el=>el.classList.remove("active"));


document.getElementById("tab-"+id)
.classList.add("active");


event.target.classList.add("active");


if(id==="chart"){

desenharMain();

desenharVol();

desenharRsi();

}

}



// ── Tempo gráfico ──

function setTf(btn,tf){

document.querySelectorAll(".tf-btn")
.forEach(b=>b.classList.remove("active"));


btn.classList.add("active");

}



// ── Botões ativos ──

const ativosEl=document.getElementById("ativos");


ATIVOS.forEach((a,i)=>{


const btn=document.createElement("button");


btn.className=
"ativo-btn"+
(i===0?" active":"");


btn.textContent=a.id;



btn.onclick=async()=>{


ativoIdx=i;


// Buscar dados reais API

candles=await buscarCandlesAPI(a.id);


if(!candles.length){

console.log("Falha API");

return;

}


candles=calcIndicadores(candles);


sinal=analisarIA(candles);



document.querySelectorAll(".ativo-btn")
.forEach(b=>b.classList.remove("active"));



btn.classList.add("active");


renderAll();


};



ativosEl.appendChild(btn);


});




// ── Relógio ──

setInterval(()=>{

document.getElementById("relogio")
.textContent=
new Date().toLocaleTimeString("pt-BR");


},1000);




// ── Atualização automática ──

setInterval(async()=>{


const ativo=ATIVOS[ativoIdx];


const novos=await buscarCandlesAPI(ativo.id);



if(novos.length){


candles=calcIndicadores(novos);


sinal=analisarIA(candles);


renderAll();


}


},60000);





// ── Inicialização ──

async function iniciarSistema(){


candles=await buscarCandlesAPI(
ATIVOS[0].id
);



if(!candles.length){

console.log("API sem dados");

return;

}


candles=calcIndicadores(candles);


sinal=analisarIA(candles);



renderAll();


}



iniciarSistema();





window.addEventListener(
"resize",
()=>{

desenharMain();

desenharVol();

desenharRsi();

}

);


// ===============================
// FIM PARTE 7
// ===============================






