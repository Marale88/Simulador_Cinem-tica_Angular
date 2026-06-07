import { criarPistaSegmentada, obterSInicialPorPonto, obterTrechoDaPista } from './pistaSegmentada.js';

const EPSILON = 1e-6;

function sinalSentido(sentido) {
  return sentido === 'paraTras' ? -1 : 1;
}

function atritoContraMovimento(v, tendencia, mu, g, fatorNormal = 1) {
  const referencia = Math.abs(v) > EPSILON ? v : tendencia;
  if (Math.abs(referencia) <= EPSILON) return 0;
  return -Math.sign(referencia) * mu * g * fatorNormal;
}

export function calcularAceleracaoNoTrecho({ trecho, v, massa, params, pista }) {
  const mu = Math.max(Number(params.coeficienteAtrito) || 0, 0);
  const g = Math.max(Number(params.gravidade) || 9.81, 0.1);
  const forca = (Number(params.forcaExternaPista) || 0) * sinalSentido(params.sentidoForcaPista);
  const aForca = forca / Math.max(massa, 0.001);

  if (trecho === 'rampa') {
    const theta = (pista.angulo * Math.PI) / 180;
    const aGravidade = -g * Math.sin(theta);
    const tendencia = aGravidade + aForca;
    const atritoMax = mu * g * Math.cos(theta);

    if (Math.abs(v) <= EPSILON && Math.abs(tendencia) <= atritoMax) return 0;
    return tendencia + atritoContraMovimento(v, tendencia, mu, g, Math.cos(theta));
  }

  if (trecho === 'retaInferior' || trecho === 'retaSuperior') {
    if (Math.abs(v) <= EPSILON && Math.abs(aForca) <= mu * g) return 0;
    return aForca + atritoContraMovimento(v, aForca, mu, g, 1);
  }

  return 0;
}

function estadoPorVelocidade(v) {
  if (Math.abs(v) <= EPSILON) return 'parado';
  return v > 0 ? 'avancando na pista' : 'voltando na pista';
}

function simularCorpo({ s0, v0, massa, params, pista, tempoAlvo }) {
  const dt = 0.016;
  const frames = [];
  let s = Math.max(0, Math.min(s0, pista.sFimPista));
  let v = v0;
  let a = 0;
  let t = 0;

  frames.push({ t, s, v, a, trecho: obterTrechoDaPista(s, pista) });

  while (t < tempoAlvo - EPSILON) {
    const passo = Math.min(dt, tempoAlvo - t);
    const trecho = obterTrechoDaPista(s, pista);
    a = calcularAceleracaoNoTrecho({ trecho, v, massa, params, pista });
    let vNovo = v + a * passo;
    let sNovo = s + v * passo + 0.5 * a * passo * passo;

    if (Math.sign(v) !== 0 && Math.sign(vNovo) !== Math.sign(v) && Math.sign(a) !== Math.sign(v)) {
      vNovo = 0;
      sNovo = s;
    }

    if (sNovo <= 0) {
      sNovo = 0;
      vNovo = 0;
    }

    if (sNovo >= pista.sFimPista) {
      sNovo = pista.sFimPista;
      vNovo = 0;
    }

    t += passo;
    s = sNovo;
    v = vNovo;
    frames.push({ t, s, v, a, trecho: obterTrechoDaPista(s, pista) });

    if (Math.abs(v) <= EPSILON && Math.abs(a) <= EPSILON) break;
  }

  const atual = frames[frames.length - 1];
  return {
    ...atual,
    frames,
    estado: estadoPorVelocidade(atual.v),
  };
}

export function simularMovimentoNaPista(params, tempoAtual) {
  const pista = criarPistaSegmentada(params);
  const s0A = obterSInicialPorPonto(params.posicaoInicialTipoA, pista, params.sInicialA);
  const s0B = obterSInicialPorPonto(params.posicaoInicialTipoB, pista, params.sInicialB);
  const v0A = (Number(params.velocidadeInicialA) || 0) * sinalSentido(params.sentidoInicialA);
  const v0B = (Number(params.velocidadeInicialB) || 0) * sinalSentido(params.sentidoInicialB);
  const corpoA = simularCorpo({
    s0: s0A,
    v0: v0A,
    massa: Number(params.massa) || 1,
    params,
    pista,
    tempoAlvo: Math.max(0, tempoAtual),
  });
  const corpoBAtivo = Boolean(params.blocoBAtivo);
  const corpoB = corpoBAtivo
    ? simularCorpo({
        s0: s0B,
        v0: v0B,
        massa: Number(params.massaB) || 1,
        params,
        pista,
        tempoAlvo: Math.max(0, tempoAtual),
      })
    : null;
  const distanciaAB = corpoB ? Math.abs(corpoA.s - corpoB.s) : Number.POSITIVE_INFINITY;
  const distanciaContato = ((Number(params.comprimentoA) || 1) + (Number(params.comprimentoB) || 0.7)) / 2;
  const contatoDetectado = Boolean(corpoB && distanciaAB <= distanciaContato);
  const mensagemContato = contatoDetectado
    ? 'B encontrou A na pista. A simulacao de colisao sera implementada na V6.'
    : 'Sem contato entre os corpos.';

  return {
    pista,
    tempoAtual,
    corpoA,
    corpoB,
    distanciaAB,
    distanciaContato,
    contatoDetectado,
    mensagemContato,
    estadoMovimento: contatoDetectado ? mensagemContato : `A: ${corpoA.estado}${corpoB ? ` | B: ${corpoB.estado}` : ''}`,
  };
}
