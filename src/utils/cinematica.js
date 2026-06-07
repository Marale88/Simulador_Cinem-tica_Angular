const EPSILON = 1e-9;

function numeroSeguro(valor, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

function tempoAtePercorrerDistancia({ v0, a, distancia }) {
  if (distancia <= 0) return 0;
  if (Math.abs(a) < EPSILON) return v0 > 0 ? distancia / v0 : Number.POSITIVE_INFINITY;

  const delta = v0 * v0 + 2 * a * distancia;
  if (delta < 0) return Number.POSITIVE_INFINITY;

  const raiz = Math.sqrt(delta);
  const t1 = (-v0 + raiz) / a;
  const t2 = (-v0 - raiz) / a;
  const tempos = [t1, t2].filter((tempo) => Number.isFinite(tempo) && tempo >= 0);
  return tempos.length ? Math.min(...tempos) : Number.POSITIVE_INFINITY;
}

export function calcularPosicao({ s0, v0, a, t }) {
  return numeroSeguro(s0) + numeroSeguro(v0) * numeroSeguro(t) + 0.5 * numeroSeguro(a) * numeroSeguro(t) ** 2;
}

export function calcularVelocidade({ v0, a, t }) {
  return numeroSeguro(v0) + numeroSeguro(a) * numeroSeguro(t);
}

export function calcularDistanciaParada({ v0, a }) {
  const velocidade = Math.max(0, numeroSeguro(v0));
  const aceleracao = numeroSeguro(a);

  if (velocidade <= EPSILON || aceleracao >= -EPSILON) {
    return {
      distanciaParada: Number.POSITIVE_INFINITY,
      tempoParada: Number.POSITIVE_INFINITY,
      para: false,
    };
  }

  return {
    distanciaParada: (velocidade * velocidade) / (2 * Math.abs(aceleracao)),
    tempoParada: velocidade / Math.abs(aceleracao),
    para: true,
  };
}

export function calcularAceleracaoHorizontal({ params, resultados }) {
  const massa = Math.max(numeroSeguro(params.massa, 1), EPSILON);
  const mu = Math.max(numeroSeguro(params.coeficienteAtrito), 0);
  const normal = Math.max(numeroSeguro(resultados.normalA ?? resultados.normal), 0);
  const atritoDinamico = mu * normal;
  const forcaX = numeroSeguro(resultados.forcaA_vetor);
  const v0 = Math.max(numeroSeguro(params.velocidadeInicial), 0);

  if (v0 > EPSILON) {
    return (forcaX - atritoDinamico) / massa;
  }

  if (Math.abs(forcaX) <= atritoDinamico + EPSILON) return 0;
  return (forcaX - Math.sign(forcaX) * atritoDinamico) / massa;
}

export function simularMovimentoHorizontal({ params, resultados, tempoAtual }) {
  const s0 = Math.max(numeroSeguro(params.posicaoInicial), 0);
  const v0 = Math.max(numeroSeguro(params.velocidadeInicial), 0);
  const t = Math.max(numeroSeguro(tempoAtual), 0);
  const comprimento = Math.max(numeroSeguro(params.comprimentoSuperficie, 10), 0.1);
  const a = calcularAceleracaoHorizontal({ params, resultados });
  const parada = calcularDistanciaParada({ v0, a });
  const distanciaDisponivel = Math.max(comprimento - s0, 0);
  const tempoFim = tempoAtePercorrerDistancia({ v0, a, distancia: distanciaDisponivel });
  const tempoEvento = Math.min(parada.tempoParada, tempoFim);
  const tempoEfetivo = Number.isFinite(tempoEvento) ? Math.min(t, tempoEvento) : t;
  const posicaoLivre = calcularPosicao({ s0, v0, a, t: tempoEfetivo });
  const velocidadeLivre = calcularVelocidade({ v0, a, t: tempoEfetivo });
  const chegouAoFim = tempoFim <= parada.tempoParada && t >= tempoFim;
  const parouAntes = parada.para && parada.distanciaParada <= distanciaDisponivel && t >= parada.tempoParada;
  const posicaoAtual = clamp(posicaoLivre, 0, comprimento);
  const velocidadeAtual = parouAntes ? 0 : Math.max(0, velocidadeLivre);
  const distanciaPercorrida = Math.max(0, posicaoAtual - s0);

  let estadoMovimento = 'O bloco permanece parado.';
  if (chegouAoFim && velocidadeAtual > EPSILON) estadoMovimento = 'O bloco chega ao fim ainda em movimento.';
  else if (chegouAoFim) estadoMovimento = 'O bloco chega ao fim da superficie.';
  else if (parouAntes) estadoMovimento = 'O bloco para antes do fim.';
  else if (Math.abs(a) > EPSILON || v0 > EPSILON) estadoMovimento = 'O bloco acelera ao longo da superficie.';

  return {
    tipo: 'horizontal',
    aceleracao: a,
    tempoAtual: t,
    posicaoAtual,
    velocidadeAtual,
    distanciaPercorrida,
    comprimentoTotal: comprimento,
    distanciaParada: parada.distanciaParada,
    tempoParada: parada.tempoParada,
    chegaAoFim: chegouAoFim || tempoFim <= parada.tempoParada,
    estadoMovimento,
    progresso: comprimento > 0 ? clamp(posicaoAtual / comprimento, 0, 1) : 0,
    pontosGrafico: gerarPontosGrafico({ s0, v0, a, duracao: Math.max(numeroSeguro(params.tempoSimulacao, 5), 0.1), limite: comprimento }),
  };
}

export function simularMovimentoPlanoInclinado({ params, resultados, tempoAtual }) {
  const v0 = Math.max(numeroSeguro(params.velocidadeInicial), 0);
  const t = Math.max(numeroSeguro(tempoAtual), 0);
  const comprimentoRampa = Math.max(numeroSeguro(params.comprimentoRampa, 5), 0.1);
  const comprimentoPlano = Math.max(numeroSeguro(params.comprimentoPlanoAposRampa, 10), 0);
  const massa = Math.max(numeroSeguro(params.massa, 1), EPSILON);
  const aRampa = -numeroSeguro(resultados.forcaResultante) / massa;
  const vFinalRampa2 = v0 * v0 + 2 * aRampa * comprimentoRampa;
  const tempoFimRampa = tempoAtePercorrerDistancia({ v0, a: aRampa, distancia: comprimentoRampa });
  const paradaRampa = calcularDistanciaParada({ v0, a: aRampa });
  const chegaFimRampa = vFinalRampa2 >= -EPSILON && tempoFimRampa !== Number.POSITIVE_INFINITY;
  const distanciaParadaRampa = paradaRampa.distanciaParada;

  if (!chegaFimRampa || (paradaRampa.para && distanciaParadaRampa < comprimentoRampa)) {
    const tempoEfetivo = paradaRampa.para ? Math.min(t, paradaRampa.tempoParada) : t;
    const posicaoRampa = clamp(calcularPosicao({ s0: 0, v0, a: aRampa, t: tempoEfetivo }), 0, comprimentoRampa);
    const velocidadeAtual = paradaRampa.para && t >= paradaRampa.tempoParada ? 0 : Math.max(0, calcularVelocidade({ v0, a: aRampa, t: tempoEfetivo }));

    return {
      tipo: 'planoInclinado',
      trechoAtual: 'rampa',
      aceleracao: aRampa,
      aceleracaoRampa: aRampa,
      aceleracaoPlano: 0,
      tempoAtual: t,
      posicaoAtual: posicaoRampa,
      velocidadeAtual,
      distanciaPercorrida: posicaoRampa,
      comprimentoTotal: comprimentoRampa + comprimentoPlano,
      distanciaParada: distanciaParadaRampa,
      tempoParada: paradaRampa.tempoParada,
      chegaAoFim: false,
      estadoMovimento: 'O bloco para antes do fim da rampa.',
      progresso: comprimentoRampa > 0 ? clamp(posicaoRampa / (comprimentoRampa + comprimentoPlano || comprimentoRampa), 0, 1) : 0,
      pontosGrafico: gerarPontosGrafico({ s0: 0, v0, a: aRampa, duracao: Math.max(numeroSeguro(params.tempoSimulacao, 5), 0.1), limite: comprimentoRampa + comprimentoPlano }),
    };
  }

  const vFinalRampa = Math.sqrt(Math.max(vFinalRampa2, 0));
  const mu = Math.max(numeroSeguro(params.coeficienteAtrito), 0);
  const g = Math.max(numeroSeguro(params.gravidade, 9.81), EPSILON);
  const aPlano = -mu * g;
  const tempoNoPlano = Math.max(0, t - tempoFimRampa);
  const paradaPlano = calcularDistanciaParada({ v0: vFinalRampa, a: aPlano });
  const tempoFimPlano = tempoAtePercorrerDistancia({ v0: vFinalRampa, a: aPlano, distancia: comprimentoPlano });
  const chegaFimPlano = comprimentoPlano <= EPSILON || tempoFimPlano <= paradaPlano.tempoParada;
  const tempoPlanoEfetivo = Number.isFinite(Math.min(paradaPlano.tempoParada, tempoFimPlano))
    ? Math.min(tempoNoPlano, paradaPlano.tempoParada, tempoFimPlano)
    : tempoNoPlano;
  const distanciaPlano = clamp(calcularPosicao({ s0: 0, v0: vFinalRampa, a: aPlano, t: tempoPlanoEfetivo }), 0, comprimentoPlano);
  const estaNaRampa = t < tempoFimRampa;
  const posicaoRampaAtual = estaNaRampa ? clamp(calcularPosicao({ s0: 0, v0, a: aRampa, t }), 0, comprimentoRampa) : comprimentoRampa;
  const velocidadeRampaAtual = Math.max(0, calcularVelocidade({ v0, a: aRampa, t: Math.min(t, tempoFimRampa) }));
  const velocidadePlanoAtual = tempoNoPlano >= paradaPlano.tempoParada ? 0 : Math.max(0, calcularVelocidade({ v0: vFinalRampa, a: aPlano, t: tempoPlanoEfetivo }));
  const atravessouPlano = !estaNaRampa && chegaFimPlano && tempoNoPlano >= tempoFimPlano;
  const parouNoPlano = !estaNaRampa && paradaPlano.para && paradaPlano.distanciaParada <= comprimentoPlano && tempoNoPlano >= paradaPlano.tempoParada;

  let estadoMovimento = 'O bloco desce a rampa.';
  if (!estaNaRampa && parouNoPlano) estadoMovimento = 'O bloco para no trecho plano.';
  else if (!estaNaRampa && atravessouPlano) estadoMovimento = 'O bloco atravessa todo o trecho plano ainda em movimento.';
  else if (!estaNaRampa) estadoMovimento = 'O bloco entra no trecho plano apos a rampa.';

  return {
    tipo: 'planoInclinado',
    trechoAtual: estaNaRampa ? 'rampa' : 'plano',
    aceleracao: estaNaRampa ? aRampa : aPlano,
    aceleracaoRampa: aRampa,
    aceleracaoPlano: aPlano,
    tempoAtual: t,
    posicaoAtual: posicaoRampaAtual + (estaNaRampa ? 0 : distanciaPlano),
    velocidadeAtual: estaNaRampa ? velocidadeRampaAtual : velocidadePlanoAtual,
    distanciaPercorrida: posicaoRampaAtual + (estaNaRampa ? 0 : distanciaPlano),
    comprimentoTotal: comprimentoRampa + comprimentoPlano,
    comprimentoRampa,
    comprimentoPlanoAposRampa: comprimentoPlano,
    distanciaParada: estaNaRampa ? distanciaParadaRampa : paradaPlano.distanciaParada,
    tempoParada: estaNaRampa ? paradaRampa.tempoParada : tempoFimRampa + paradaPlano.tempoParada,
    velocidadeFinalRampa: vFinalRampa,
    chegaAoFim: atravessouPlano || (comprimentoPlano <= EPSILON && !estaNaRampa),
    estadoMovimento,
    progresso: clamp((posicaoRampaAtual + (estaNaRampa ? 0 : distanciaPlano)) / (comprimentoRampa + comprimentoPlano || comprimentoRampa), 0, 1),
    pontosGrafico: gerarPontosGraficoComposto({
      v0,
      aRampa,
      comprimentoRampa,
      vFinalRampa,
      aPlano,
      duracao: Math.max(numeroSeguro(params.tempoSimulacao, 5), 0.1),
      limite: comprimentoRampa + comprimentoPlano,
    }),
  };
}

function gerarPontosGrafico({ s0, v0, a, duracao, limite }) {
  const parada = calcularDistanciaParada({ v0, a });
  const tempoFim = tempoAtePercorrerDistancia({ v0, a, distancia: Math.max(limite - s0, 0) });

  return Array.from({ length: 24 }, (_, indice) => {
    const t = (duracao * indice) / 23;
    const tempoEvento = Math.min(parada.tempoParada, tempoFim);
    const tempoEfetivo = Number.isFinite(tempoEvento) ? Math.min(t, tempoEvento) : t;
    const parou = parada.para && t >= parada.tempoParada && parada.distanciaParada <= Math.max(limite - s0, 0);
    const chegouFim = t >= tempoFim;
    const s = clamp(calcularPosicao({ s0, v0, a, t: tempoEfetivo }), 0, limite);
    const v = parou || chegouFim ? 0 : Math.max(0, calcularVelocidade({ v0, a, t: tempoEfetivo }));
    return { t, s, v, a: parou || chegouFim ? 0 : a };
  });
}

function gerarPontosGraficoComposto({ v0, aRampa, comprimentoRampa, vFinalRampa, aPlano, duracao, limite }) {
  const tempoFimRampa = tempoAtePercorrerDistancia({ v0, a: aRampa, distancia: comprimentoRampa });
  const paradaRampa = calcularDistanciaParada({ v0, a: aRampa });
  const paradaPlano = calcularDistanciaParada({ v0: vFinalRampa, a: aPlano });

  return Array.from({ length: 24 }, (_, indice) => {
    const t = (duracao * indice) / 23;
    if (t <= tempoFimRampa || tempoFimRampa === Number.POSITIVE_INFINITY) {
      const tempoEfetivo = paradaRampa.para ? Math.min(t, paradaRampa.tempoParada) : t;
      const parou = paradaRampa.para && t >= paradaRampa.tempoParada;
      return {
        t,
        s: clamp(calcularPosicao({ s0: 0, v0, a: aRampa, t: tempoEfetivo }), 0, limite),
        v: parou ? 0 : Math.max(0, calcularVelocidade({ v0, a: aRampa, t: tempoEfetivo })),
        a: parou ? 0 : aRampa,
      };
    }

    const tempoPlano = t - tempoFimRampa;
    const tempoPlanoEfetivo = paradaPlano.para ? Math.min(tempoPlano, paradaPlano.tempoParada) : tempoPlano;
    const parouPlano = paradaPlano.para && tempoPlano >= paradaPlano.tempoParada;

    return {
      t,
      s: clamp(comprimentoRampa + calcularPosicao({ s0: 0, v0: vFinalRampa, a: aPlano, t: tempoPlanoEfetivo }), 0, limite),
      v: parouPlano ? 0 : Math.max(0, calcularVelocidade({ v0: vFinalRampa, a: aPlano, t: tempoPlanoEfetivo })),
      a: parouPlano ? 0 : aPlano,
    };
  });
}
