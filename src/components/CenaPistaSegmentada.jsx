import { criarGeometriaVisualPista, mapearSParaXY } from '../utils/pistaSegmentada.js';
import { ControlesAnimacao } from './PainelMovimento.jsx';

function formatar(valor, casas = 1) {
  if (!Number.isFinite(valor)) return 'nao definido';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

function BlocoSvg({ corpo, pista, visual, label, classe }) {
  if (!corpo) return null;
  const ponto = mapearSParaXY(corpo.s, pista, visual);
  const largura = label === 'A' ? 54 : 46;
  const altura = label === 'A' ? 38 : 32;
  const centro = {
    x: ponto.x + ponto.normal.x * (altura / 2),
    y: ponto.y + ponto.normal.y * (altura / 2),
  };

  return (
    <g className={`bloco-pista bloco-pista-${classe}`} transform={`translate(${centro.x}, ${centro.y}) rotate(${ponto.anguloVisual})`}>
      <rect x={-largura / 2} y={-altura / 2} width={largura} height={altura} rx="4" />
      <text x="0" y="6" textAnchor="middle">{label}</text>
    </g>
  );
}

function TrilhaSvg({ corpo, pista, visual, classe }) {
  if (!corpo?.frames?.length) return null;
  const pontos = corpo.frames
    .filter((_, index) => index % 8 === 0)
    .map((frame) => {
      const ponto = mapearSParaXY(frame.s, pista, visual);
      return `${ponto.x.toFixed(1)},${ponto.y.toFixed(1)}`;
    })
    .join(' ');
  return <polyline className={`trilha-pista trilha-pista-${classe}`} points={pontos} />;
}

export default function CenaPistaSegmentada({ simulacao, params, simulando, onPlay, onPause, onReset }) {
  const visual = criarGeometriaVisualPista(simulacao.pista, 940, 430);

  return (
    <section className="painel visual visual-pista-segmentada">
      <div className="visual-cabecalho">
        <div>
          <p className="rotulo">Cena V5.1</p>
          <h2>Pista segmentada</h2>
        </div>
        <span className="estado estado-v5">{simulacao.contatoDetectado ? 'contato detectado' : 'simulando por trechos'}</span>
      </div>

      <ControlesAnimacao simulando={simulando} onPlay={onPlay} onPause={onPause} onReset={onReset} />

      <div className="cena-pista-wrap">
        <svg className="cena-pista-svg" viewBox={`0 0 ${visual.largura} ${visual.altura}`} role="img" aria-label="Pista segmentada">
          <path className="pista-segmento reta-inferior" d={`M${visual.p0.x} ${visual.p0.y} L${visual.p1.x} ${visual.p1.y}`} />
          <path className="pista-segmento rampa" d={`M${visual.p1.x} ${visual.p1.y} L${visual.p2.x} ${visual.p2.y}`} />
          <path className="pista-segmento reta-superior" d={`M${visual.p2.x} ${visual.p2.y} L${visual.p3.x} ${visual.p3.y}`} />
          <TrilhaSvg corpo={simulacao.corpoA} pista={simulacao.pista} visual={visual} classe="a" />
          <TrilhaSvg corpo={simulacao.corpoB} pista={simulacao.pista} visual={visual} classe="b" />
          <circle className="ponto-pista" cx={visual.p0.x} cy={visual.p0.y} r="5" />
          <circle className="ponto-pista" cx={visual.p1.x} cy={visual.p1.y} r="5" />
          <circle className="ponto-pista" cx={visual.p2.x} cy={visual.p2.y} r="5" />
          <text className="label-ponto" x={visual.p0.x - 10} y={visual.p0.y + 24}>1</text>
          <text className="label-ponto" x={visual.p1.x - 10} y={visual.p1.y - 12}>2</text>
          <text className="label-ponto" x={visual.p2.x + 8} y={visual.p2.y - 12}>3</text>
          <text className="label-trecho" x={(visual.p0.x + visual.p1.x) / 2 - 46} y={visual.p0.y + 34}>reta inferior {formatar(simulacao.pista.L1)} m</text>
          <text className="label-trecho" x={(visual.p1.x + visual.p2.x) / 2 - 40} y={(visual.p1.y + visual.p2.y) / 2 - 20}>rampa {formatar(simulacao.pista.L2)} m / {formatar(simulacao.pista.angulo, 0)}°</text>
          <text className="label-trecho" x={(visual.p2.x + visual.p3.x) / 2 - 44} y={visual.p2.y - 18}>reta superior {formatar(simulacao.pista.L3)} m</text>
          <BlocoSvg corpo={simulacao.corpoA} pista={simulacao.pista} visual={visual} label="A" classe="a" />
          {params.blocoBAtivo ? <BlocoSvg corpo={simulacao.corpoB} pista={simulacao.pista} visual={visual} label="B" classe="b" /> : null}
        </svg>
      </div>

      <div className="painel-telemetria painel-telemetria-pista">
        <span>t: <strong>{formatar(simulacao.tempoAtual)} s</strong></span>
        <span>A s: <strong>{formatar(simulacao.corpoA.s)} m</strong></span>
        <span>A v: <strong>{formatar(simulacao.corpoA.v)} m/s</strong></span>
        <span>A a: <strong>{formatar(simulacao.corpoA.a, 2)} m/s²</strong></span>
        {params.blocoBAtivo ? <span>B s: <strong>{formatar(simulacao.corpoB.s)} m</strong></span> : null}
      </div>

      <p className="mensagem">{simulacao.mensagemContato}</p>
      {!simulando && Math.abs(simulacao.corpoA.v) < 0.000001 && (!simulacao.corpoB || Math.abs(simulacao.corpoB.v) < 0.000001) ? (
        <div className="observacao observacao-secundaria">
          Se nada se mover ao apertar Play, defina uma velocidade inicial, reduza o atrito, aumente a forca externa da pista ou posicione o corpo na rampa com angulo suficiente para vencer o atrito.
        </div>
      ) : null}
      <div className="observacao observacao-v5">
        Nesta V5.1, a pista e tratada como uma trajetoria segmentada com uma coordenada unica s. Se dois corpos se encontrarem, o simulador detecta o contato, mas ainda nao calcula colisao ou impulso. Esse sera o foco da V6.
      </div>
    </section>
  );
}
