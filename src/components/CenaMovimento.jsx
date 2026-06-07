import { ControlesAnimacao } from './PainelMovimento.jsx';

function formatar(valor, casas = 1) {
  if (!Number.isFinite(valor)) return 'nao definido';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

function CenaHorizontalMovimento({ movimento }) {
  const blocoLeft = `${8 + movimento.progresso * 78}%`;
  const trilhaWidth = `${Math.max(0, movimento.progresso * 78)}%`;

  return (
    <div className="cena-movimento cena-movimento-horizontal">
      <div className="marcador inicio">inicio</div>
      <div className="marcador fim">fim</div>
      <div className="trilha" style={{ width: trilhaWidth }} />
      <div className="bloco-movimento" style={{ left: blocoLeft }}>A</div>
      <div className="vetor-movimento velocidade">v = {formatar(movimento.velocidadeAtual)} m/s</div>
      <div className="vetor-movimento aceleracao">a = {formatar(movimento.aceleracao, 2)} m/s²</div>
      <div className="pista-horizontal" />
      <div className="regua">{formatar(movimento.comprimentoTotal)} m</div>
    </div>
  );
}

function CenaPlanoMovimento({ movimento, params }) {
  const comprimentoRampa = Math.max(params.comprimentoRampa || 5, 0.1);
  const comprimentoPlano = Math.max(params.comprimentoPlanoAposRampa || 0, 0);
  const angulo = Math.max(0, Math.min(params.anguloPlano || 0, 60));
  const theta = (angulo * Math.PI) / 180;
  const projecaoRampa = comprimentoRampa * Math.cos(theta);
  const alturaRampa = comprimentoRampa * Math.sin(theta);
  const larguraFisica = Math.max(projecaoRampa + comprimentoPlano, 0.1);
  const alturaFisica = Math.max(alturaRampa, 0.1);
  const escala = Math.min(74 / larguraFisica, 42 / alturaFisica);
  const rampaDx = projecaoRampa * escala;
  const rampaDy = alturaRampa * escala;
  const planoDx = comprimentoPlano * escala;
  const inicio = { x: 16, y: 74 };
  const fimRampa = { x: inicio.x + rampaDx, y: inicio.y - rampaDy };
  const fimPlano = { x: fimRampa.x + planoDx, y: fimRampa.y };
  const distanciaNaRampa = Math.min(movimento.distanciaPercorrida, comprimentoRampa);
  const distanciaNoPlano = Math.max(0, movimento.distanciaPercorrida - comprimentoRampa);
  const fracaoNaRampa = Math.min(Math.max(distanciaNaRampa / comprimentoRampa, 0), 1);
  const fracaoNoPlano = comprimentoPlano > 0 ? Math.min(Math.max(distanciaNoPlano / comprimentoPlano, 0), 1) : 0;
  const noPlano = movimento.trechoAtual === 'plano';
  const x = noPlano ? fimRampa.x + planoDx * fracaoNoPlano : inicio.x + rampaDx * fracaoNaRampa;
  const y = noPlano ? fimRampa.y : inicio.y - rampaDy * fracaoNaRampa;
  const trilhaRampaX = noPlano ? fimRampa.x : x;
  const trilhaRampaY = noPlano ? fimRampa.y : y;

  return (
    <div className="cena-movimento cena-movimento-plano">
      <svg className="rampa-movimento" viewBox="0 0 100 100" aria-hidden="true">
        <path className="linha-rampa" d={`M${inicio.x} ${inicio.y} L${fimRampa.x} ${fimRampa.y}`} />
        <path className="linha-plano" d={`M${fimRampa.x} ${fimRampa.y} H${fimPlano.x}`} />
        <path className="trilha-rampa" d={`M${inicio.x} ${inicio.y} L${trilhaRampaX} ${trilhaRampaY}`} />
        {noPlano ? <path className="trilha-plano" d={`M${fimRampa.x} ${fimRampa.y} H${x}`} /> : null}
      </svg>
      <div
        className="bloco-movimento bloco-rampa"
        style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${noPlano ? 0 : -angulo}deg)` }}
      >
        A
      </div>
      <div className="marcador inicio" style={{ left: `${inicio.x - 3}%`, top: `${inicio.y + 7}%` }}>inicio</div>
      <div className="marcador rampa" style={{ left: `${(inicio.x + fimRampa.x) / 2 - 4}%`, top: `${(inicio.y + fimRampa.y) / 2 - 8}%` }}>
        rampa {formatar(comprimentoRampa)} m / {formatar(angulo, 0)}°
      </div>
      <div className="marcador plano" style={{ left: `${fimRampa.x + Math.max(planoDx / 2 - 6, 1)}%`, top: `${fimRampa.y + 7}%` }}>
        plano {formatar(comprimentoPlano)} m
      </div>
      <div className="marcador fim" style={{ left: `${Math.min(fimPlano.x, 94)}%`, top: `${fimPlano.y + 7}%` }}>fim</div>
      <div className="vetor-movimento velocidade">v = {formatar(movimento.velocidadeAtual)} m/s</div>
      <div className="vetor-movimento aceleracao">a = {formatar(movimento.aceleracao, 2)} m/s²</div>
    </div>
  );
}

export default function CenaMovimento({ movimento, params, avisoBlocoB, simulando, onPlay, onPause, onReset }) {
  return (
    <section className="painel visual visual-movimento">
      <div className="visual-cabecalho">
        <div>
          <p className="rotulo">Cena V5</p>
          <h2>{params.cenario === 'planoInclinado' ? 'Movimento em rampa + plano' : 'Movimento horizontal'}</h2>
        </div>
        <span className="estado estado-v5">{movimento.estadoMovimento}</span>
      </div>

      <ControlesAnimacao
        simulando={simulando}
        onPlay={onPlay}
        onPause={onPause}
        onReset={onReset}
      />

      {params.cenario === 'planoInclinado' ? (
        <CenaPlanoMovimento movimento={movimento} params={params} />
      ) : (
        <CenaHorizontalMovimento movimento={movimento} />
      )}

      <div className="painel-telemetria">
        <span>t: <strong>{formatar(movimento.tempoAtual)} s</strong></span>
        <span>s: <strong>{formatar(movimento.posicaoAtual)} m</strong></span>
        <span>v: <strong>{formatar(movimento.velocidadeAtual)} m/s</strong></span>
        <span>a: <strong>{formatar(movimento.aceleracao, 2)} m/s²</strong></span>
      </div>

      <p className="mensagem">{movimento.estadoMovimento}</p>
      {avisoBlocoB ? <div className="observacao observacao-secundaria">{avisoBlocoB}</div> : null}
    </section>
  );
}
