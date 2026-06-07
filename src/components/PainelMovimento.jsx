import GraficoRetro from './GraficoRetro.jsx';

function valorFinito(valor) {
  return Number.isFinite(valor) ? valor : null;
}

function formatar(valor, casas = 2) {
  const finito = valorFinito(valor);
  if (finito === null) return 'nao definido';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(finito);
}

function ResultadoMovimento({ label, valor, unidade = '', casas = 2 }) {
  return (
    <div className="resultado-item">
      <span>{label}</span>
      <strong>{typeof valor === 'number' ? formatar(valor, casas) : valor} <small>{unidade}</small></strong>
    </div>
  );
}

export function ControlesAnimacao({ simulando, onPlay, onPause, onReset }) {
  return (
    <div className="controles-animacao" aria-label="Controles de simulacao">
      <button type="button" onClick={onPlay}>Play</button>
      <button type="button" onClick={onPause}>Pausar</button>
      <button type="button" onClick={onReset}>Reiniciar</button>
      <span>{simulando ? 'rodando' : 'pausado'}</span>
    </div>
  );
}

export function PainelResultadosMovimento({ movimento, params }) {
  return (
    <aside className="painel resultados painel-movimento">
      <p className="rotulo">Resultados V5</p>
      <h2>Movimento no tempo</h2>
      <div className="lista-resultados">
        <div className="secao-resultado">
          <h3>Cinematica</h3>
          <ResultadoMovimento label="Tempo atual" valor={movimento.tempoAtual} unidade="s" />
          <ResultadoMovimento label="Posicao atual" valor={movimento.posicaoAtual} unidade="m" />
          <ResultadoMovimento label="Velocidade atual" valor={movimento.velocidadeAtual} unidade="m/s" />
          <ResultadoMovimento label="Aceleracao" valor={movimento.aceleracao} unidade="m/s²" casas={3} />
          <ResultadoMovimento label="Distancia percorrida" valor={movimento.distanciaPercorrida} unidade="m" />
          <ResultadoMovimento label="Comprimento da pista" valor={movimento.comprimentoTotal} unidade="m" />
          <ResultadoMovimento label="Distancia ate parar" valor={movimento.distanciaParada} unidade="m" />
          <ResultadoMovimento label="Tempo ate parar" valor={movimento.tempoParada} unidade="s" />
          <ResultadoMovimento label="Chega ao fim?" valor={movimento.chegaAoFim ? 'sim' : 'nao'} />
          <ResultadoMovimento label="Estado" valor={movimento.estadoMovimento} />
        </div>
        {params.cenario === 'planoInclinado' ? (
          <div className="secao-resultado">
            <h3>Rampa + plano</h3>
            <ResultadoMovimento label="Trecho atual" valor={movimento.trechoAtual} />
            <ResultadoMovimento label="Aceleracao na rampa" valor={movimento.aceleracaoRampa} unidade="m/s²" casas={3} />
            <ResultadoMovimento label="Velocidade no fim da rampa" valor={movimento.velocidadeFinalRampa ?? 0} unidade="m/s" />
            <ResultadoMovimento label="Aceleracao no plano" valor={movimento.aceleracaoPlano} unidade="m/s²" casas={3} />
          </div>
        ) : null}
        <div className="grade-graficos">
          <GraficoRetro pontos={movimento.pontosGrafico} titulo="posicao x tempo" eixoY="s" unidade="m" />
          <GraficoRetro pontos={movimento.pontosGrafico} titulo="velocidade x tempo" eixoY="v" unidade="m/s" />
          <GraficoRetro pontos={movimento.pontosGrafico} titulo="aceleracao x tempo" eixoY="a" unidade="m/s²" />
        </div>
        <div className="observacao observacao-v5">
          Nesta V5, o movimento e calculado por cinematica com aceleracao constante em cada trecho. O modelo e didatico e simplificado. Efeitos como resistencia do ar, colisoes complexas, rolamento, deformacoes reais e variacoes continuas de atrito nao sao considerados.
        </div>
      </div>
    </aside>
  );
}
