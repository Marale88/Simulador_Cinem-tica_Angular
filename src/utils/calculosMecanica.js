const MARGEM_LIMITE = 0.02;
const EPSILON = 1e-9;

function evitarZero(valor, minimo = 0.000001) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return minimo;
  return Math.max(numero, minimo);
}

function positivo(valor, minimo = 0) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return minimo;
  return Math.max(numero, minimo);
}

function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

function vetorHorizontal(valor, sentido) {
  const modulo = positivo(valor, 0);
  return sentido === 'esquerda' ? -modulo : modulo;
}

function zerarResiduo(valor) {
  return Math.abs(valor) < EPSILON ? 0 : valor;
}

function grausParaRad(anguloGraus) {
  return (anguloGraus * Math.PI) / 180;
}

export function calcularGeometriaBloco({ comprimento, largura, altura }) {
  const comprimentoSeguro = evitarZero(comprimento, 0.05);
  const larguraSegura = evitarZero(largura, 0.05);
  const alturaSegura = evitarZero(altura, 0.05);

  return {
    comprimento: comprimentoSeguro,
    largura: larguraSegura,
    altura: alturaSegura,
    areaBase: comprimentoSeguro * larguraSegura,
    areaLateral: alturaSegura * larguraSegura,
    areaFrontal: alturaSegura * comprimentoSeguro,
    volume: comprimentoSeguro * larguraSegura * alturaSegura,
  };
}

export function calcularAreaContatoAB({ geometriaA, geometriaB, posicao }) {
  if (!geometriaB) return evitarZero(0, 0.01);

  if (posicao === 'emCima' || posicao === 'emCimaDeA') {
    return evitarZero(
      Math.min(geometriaA.comprimento, geometriaB.comprimento) *
        Math.min(geometriaA.largura, geometriaB.largura),
      0.01,
    );
  }

  return evitarZero(
    Math.min(geometriaA.altura, geometriaB.altura) *
      Math.min(geometriaA.largura, geometriaB.largura),
    0.01,
  );
}

export function escalaVisual(valor, minPx, maxPx, minValor, maxValor) {
  const normalizado = (valor - minValor) / (maxValor - minValor);
  const limitado = Math.max(0, Math.min(1, normalizado));
  return minPx + limitado * (maxPx - minPx);
}

export function decomporForca({
  modoForca,
  modulo,
  anguloGraus,
  tipoForca,
  sentidoHorizontal,
  sentidoVertical,
}) {
  const modo = modoForca || tipoForca || 'horizontal';
  if (modo === 'semForca') {
    return {
      fx: 0,
      fy: 0,
      modulo: 0,
      anguloGraus: 0,
      tipoForca: 'semForca',
      sentidoHorizontal: sentidoHorizontal === 'esquerda' ? 'esquerda' : 'direita',
      sentidoVertical: sentidoVertical === 'baixo' ? 'baixo' : 'cima',
      ativa: false,
    };
  }

  const forcaModulo = positivo(modulo, 0);
  const tipo = modo === 'inclinada' ? 'inclinada' : modo === 'perpendicular' ? 'perpendicular' : 'horizontal';
  const horizontal = sentidoHorizontal === 'esquerda' ? 'esquerda' : 'direita';
  const vertical = sentidoVertical === 'baixo' ? 'baixo' : 'cima';

  if (tipo === 'perpendicular') {
    return {
      fx: 0,
      fy: -forcaModulo,
      modulo: forcaModulo,
      anguloGraus: 90,
      tipoForca: tipo,
      sentidoHorizontal: horizontal,
      sentidoVertical: 'baixo',
      ativa: forcaModulo > 0,
    };
  }

  if (tipo === 'horizontal') {
    return {
      fx: horizontal === 'direita' ? forcaModulo : -forcaModulo,
      fy: 0,
      modulo: forcaModulo,
      anguloGraus: 0,
      tipoForca: tipo,
      sentidoHorizontal: horizontal,
      sentidoVertical: vertical,
      ativa: forcaModulo > 0,
    };
  }

  const anguloSeguro = limitar(positivo(anguloGraus, 0), 0, 90);
  const thetaRad = (anguloSeguro * Math.PI) / 180;
  const fxModulo = forcaModulo * Math.cos(thetaRad);
  const fyModulo = forcaModulo * Math.sin(thetaRad);

  return {
    fx: zerarResiduo(horizontal === 'direita' ? fxModulo : -fxModulo),
    fy: zerarResiduo(vertical === 'cima' ? fyModulo : -fyModulo),
    modulo: forcaModulo,
    anguloGraus: anguloSeguro,
    tipoForca: tipo,
    sentidoHorizontal: horizontal,
    sentidoVertical: vertical,
    ativa: forcaModulo > 0,
  };
}

export function calcularNormalComForcaVertical(pesoTotal, forcaVertical) {
  const normalBruta = pesoTotal - forcaVertical;
  const perdeuContatoSolo = normalBruta <= 0;

  return {
    normal: Math.max(0, normalBruta),
    normalBruta,
    normalOriginal: pesoTotal,
    perdeuContatoSolo,
  };
}

export function diagnosticarForcaInclinada({
  tipoForcaA,
  sentidoVerticalForcaA,
  perdeuContatoSolo,
}) {
  if (tipoForcaA !== 'inclinada') {
    if (tipoForcaA === 'perpendicular') {
      return 'A força perpendicular aplicada por cima de A aumenta a normal e, por consequência, o atrito máximo com o solo.';
    }
    return 'A força aplicada em A é horizontal. Toda a força atua na direção do movimento.';
  }

  if (perdeuContatoSolo) {
    return 'A componente vertical para cima superou o peso do sistema. O contato com o solo foi perdido, logo a força normal e o atrito com o solo são nulos.';
  }

  if (sentidoVerticalForcaA === 'cima') {
    return 'A força aplicada em A foi decomposta em Fx e Fy. A componente horizontal Fx tenta mover o bloco. A componente vertical Fy aponta para cima, reduzindo a normal e diminuindo o atrito máximo.';
  }

  return 'A força aplicada em A foi decomposta em Fx e Fy. A componente horizontal Fx tenta mover o bloco. A componente vertical Fy aponta para baixo, aumentando a normal e aumentando o atrito máximo.';
}

function estadoPorForca(moduloForca, atritoMaximo) {
  if (atritoMaximo <= 0) {
    return moduloForca === 0 ? 'parado' : 'deslizando';
  }

  if (moduloForca < atritoMaximo * (1 - MARGEM_LIMITE)) {
    return 'parado';
  }

  if (Math.abs(moduloForca - atritoMaximo) / atritoMaximo <= MARGEM_LIMITE) {
    return 'limite de escorregamento';
  }

  return 'deslizando';
}

function baseComum(params) {
  const geometriaA = params.geometriaA || calcularGeometriaBloco({
    comprimento: params.comprimentoA ?? params.comprimento ?? 1,
    largura: params.larguraA ?? 0.5,
    altura: params.alturaA ?? 0.5,
  });
  const geometriaB = params.geometriaB || calcularGeometriaBloco({
    comprimento: params.comprimentoB ?? 0.7,
    largura: params.larguraB ?? 0.4,
    altura: params.alturaB ?? 0.4,
  });
  const massa = evitarZero(params.massa, 1);
  const massaB = evitarZero(params.massaB, 1);
  const forcaAplicada = positivo(params.forcaAplicada, 0);
  const forcaAplicadaB = positivo(params.forcaAplicadaB, 0);
  const coeficienteAtrito = positivo(params.coeficienteAtrito, 0);
  const coeficienteAtritoBsolo = positivo(params.coeficienteAtritoBsolo, 0);
  const coeficienteAtritoAB = positivo(params.coeficienteAtritoAB, 0);
  const areaLateral = evitarZero(geometriaA.areaLateral ?? params.areaLateral, 0.01);
  const areaBase = evitarZero(geometriaA.areaBase ?? params.areaBase, 0.01);
  const areaBaseB = evitarZero(geometriaB.areaBase ?? params.areaBaseB, 0.01);
  const areaContatoAB = calcularAreaContatoAB({
    geometriaA,
    geometriaB,
    posicao: params.cenario === 'planoInclinado' ? params.posicaoBPlano : params.posicaoB,
  });
  const moduloElasticidade = evitarZero(params.moduloElasticidade, 1);
  const comprimento = evitarZero(params.comprimentoA ?? params.comprimento, 0.01);
  const gravidade = evitarZero(params.gravidade, 1);
  const sentidoForcaA = params.sentidoForcaA === 'esquerda' ? 'esquerda' : 'direita';
  const sentidoVerticalForcaA = params.sentidoVerticalForcaA === 'baixo' ? 'baixo' : 'cima';
  const sentidoForcaB = params.sentidoHorizontalForcaB || params.sentidoForcaB;
  const sentidoHorizontalForcaB = sentidoForcaB === 'direita' ? 'direita' : 'esquerda';
  const sentidoVerticalForcaB = params.sentidoVerticalForcaB === 'baixo' ? 'baixo' : 'cima';
  const modoForcaA = params.modoForcaA || params.tipoForcaA || 'horizontal';
  const modoForcaB = params.modoForcaB || (positivo(params.forcaAplicadaB, 0) > 0 ? 'horizontal' : 'semForca');
  const tipoForcaA = modoForcaA === 'inclinada' ? 'inclinada' : modoForcaA === 'perpendicular' ? 'perpendicular' : modoForcaA === 'semForca' ? 'semForca' : 'horizontal';
  const tipoForcaB = modoForcaB === 'inclinada' ? 'inclinada' : modoForcaB === 'perpendicular' ? 'perpendicular' : modoForcaB === 'semForca' ? 'semForca' : 'horizontal';
  const anguloForcaA = limitar(positivo(params.anguloForcaA, 0), 0, 90);
  const anguloForcaB = limitar(positivo(params.anguloForcaB, 0), 0, 90);
  const forcaA = decomporForca({
    modoForca: modoForcaA,
    modulo: forcaAplicada,
    anguloGraus: anguloForcaA,
    sentidoHorizontal: sentidoForcaA,
    sentidoVertical: sentidoVerticalForcaA,
  });
  const forcaB = decomporForca({
    modoForca: modoForcaB,
    modulo: forcaAplicadaB,
    anguloGraus: anguloForcaB,
    sentidoHorizontal: sentidoHorizontalForcaB,
    sentidoVertical: sentidoVerticalForcaB,
  });
  const forcaB_vetor = forcaB.fx;
  const pesoA = massa * gravidade;
  const pesoB = massaB * gravidade;

  return {
    massa,
    massaB,
    forcaAplicada,
    forcaAplicadaB,
    coeficienteAtrito,
    coeficienteAtritoBsolo,
    coeficienteAtritoAB,
    areaLateral,
    areaBase,
    areaBaseB,
    areaContatoAB,
    geometriaA,
    geometriaB,
    moduloElasticidade,
    comprimento,
    gravidade,
    sentidoForcaA,
    sentidoVerticalForcaA,
    sentidoForcaB,
    sentidoHorizontalForcaB,
    sentidoVerticalForcaB,
    modoForcaA,
    modoForcaB,
    tipoForcaA,
    tipoForcaB,
    anguloForcaA,
    anguloForcaB,
    forcaA,
    forcaB,
    forcaA_vetor: forcaA.fx,
    forcaA_vertical: forcaA.fy,
    forcaB_vetor,
    forcaB_vertical: forcaB.fy,
    pesoA,
    pesoB,
  };
}

function tensoesDeA(dados, normalBaseA) {
  const moduloFx = Math.abs(dados.forcaA.fx);
  const tensaoLateral = moduloFx / dados.areaLateral;
  const tensaoBase = normalBaseA / dados.areaBase;
  const tensaoCisalhante = moduloFx / dados.areaLateral;
  const deformacaoElastica = (moduloFx * dados.comprimento) / (dados.areaLateral * dados.moduloElasticidade);

  return {
    tensaoLateral,
    tensaoBase,
    tensaoCisalhante,
    deformacaoElastica,
    deformacaoElasticaMm: deformacaoElastica * 1000,
  };
}

function tensoesPlano(dados, normal, forcaParalela) {
  const moduloForca = Math.abs(forcaParalela);
  const deformacaoElastica =
    (moduloForca * dados.comprimento) / (dados.areaLateral * dados.moduloElasticidade);

  return {
    tensaoLateral: moduloForca / dados.areaLateral,
    tensaoBase: normal / dados.areaBase,
    tensaoCisalhante: moduloForca / dados.areaLateral,
    deformacaoElastica,
    deformacaoElasticaMm: deformacaoElastica * 1000,
  };
}

function direcaoAtrito(forcaExterna) {
  if (forcaExterna > 0) return 'esquerda';
  if (forcaExterna < 0) return 'direita';
  return 'nenhuma';
}

function mensagemEstadoSistema(estadoSistema, sentidoMovimento, perdeuContatoSolo) {
  if (perdeuContatoSolo && estadoSistema === 'deslizando') return `sistema sem contato desliza para a ${sentidoMovimento}`;
  if (perdeuContatoSolo) return 'sistema perdeu contato com o solo';
  if (estadoSistema === 'parado') return 'sistema permanece parado';
  if (estadoSistema === 'limite de escorregamento') return 'sistema no limite de escorregamento';
  return `sistema desliza para a ${sentidoMovimento}`;
}

function dadosForcaInclinada(dados, normalInfo, atritoMaximoAtualizado) {
  const efeitoNormal =
    dados.tipoForcaA === 'horizontal'
      ? 'sem alteração vertical'
      : dados.forcaA.fy > 0
        ? 'reduz a normal'
        : 'aumenta a normal';

  return {
    forcaA: dados.forcaA,
    forcaA_vetor: dados.forcaA.fx,
    forcaA_vertical: dados.forcaA.fy,
    moduloForcaA: dados.forcaA.modulo,
    anguloForcaA: dados.forcaA.anguloGraus,
    tipoForcaA: dados.tipoForcaA,
    sentidoVerticalForcaA: dados.sentidoVerticalForcaA,
    normalOriginalSemForcaVertical: normalInfo.normalOriginal,
    normalAtualizada: normalInfo.normal,
    normalBruta: normalInfo.normalBruta,
    perdeuContatoSolo: normalInfo.perdeuContatoSolo,
    efeitoComponenteVertical: efeitoNormal,
    atritoMaximoAtualizado,
    diagnosticoForcaInclinada: diagnosticarForcaInclinada({
      tipoForcaA: dados.tipoForcaA,
      sentidoVerticalForcaA: dados.sentidoVerticalForcaA,
      perdeuContatoSolo: normalInfo.perdeuContatoSolo,
    }),
  };
}

function dadosForcaB(dados) {
  return {
    forcaB: dados.forcaB,
    forcaB_vetor: dados.forcaB.fx,
    forcaB_vertical: dados.forcaB.fy,
    moduloForcaB: dados.forcaB.modulo,
    anguloForcaB: dados.forcaB.anguloGraus,
    tipoForcaB: dados.tipoForcaB,
    modoForcaB: dados.modoForcaB,
    diagnosticoForcaB:
      dados.modoForcaB === 'semForca'
        ? 'Força em B: sem aplicação de força.'
        : dados.modoForcaB === 'inclinada'
          ? 'A força aplicada em B foi decomposta em uma componente horizontal e uma componente vertical.'
          : dados.modoForcaB === 'perpendicular'
            ? 'A força perpendicular aplicada por cima de B aumenta a normal associada ao bloco.'
          : 'A força aplicada em B é horizontal.',
  };
}

function calcularBlocoA(params) {
  const dados = baseComum(params);
  const normalInfo = calcularNormalComForcaVertical(dados.pesoA, dados.forcaA.fy);
  const normalA = normalInfo.normal;
  const atritoMaximoA = dados.coeficienteAtrito * normalA;
  const moduloForca = Math.abs(dados.forcaA.fx);
  const estado = estadoPorForca(moduloForca, atritoMaximoA);
  const estaDeslizando = estado === 'deslizando';
  const sentidoMovimento =
    estaDeslizando && dados.forcaA.fx !== 0 ? (dados.forcaA.fx > 0 ? 'direita' : 'esquerda') : 'nenhum';
  const atritoAtuante = estaDeslizando ? atritoMaximoA : Math.min(moduloForca, atritoMaximoA);
  const forcaResultante = estaDeslizando ? moduloForca - atritoMaximoA : 0;
  const aceleracao = estaDeslizando ? forcaResultante / dados.massa : 0;

  return {
    modo: 'semB',
    blocoBAtivo: false,
    peso: dados.pesoA,
    pesoA: dados.pesoA,
    normal: normalA,
    normalA,
    atritoMaximo: atritoMaximoA,
    atritoMaximoA,
    atritoAtuante,
    direcaoAtrito: direcaoAtrito(dados.forcaA.fx),
    forcaResultante,
    aceleracao,
    aceleracaoSistema: aceleracao,
    sentidoMovimento,
    estado,
    estadoSistema: estado,
    descricaoSistema: mensagemEstadoSistema(estado, sentidoMovimento, normalInfo.perdeuContatoSolo),
    forcaExternaTotal: dados.forcaA.fx,
    forcaB_vetor: 0,
    ...dadosForcaInclinada(dados, normalInfo, atritoMaximoA),
    ...pacoteGeometria(dados),
    ...tensoesDeA(dados, normalA),
  };
}

export function diagnosticarContatoLateral({
  posicaoB,
  forcaA_vetor,
  forcaB_vetor,
  estadoSistema,
}) {
  const aEmpurraB =
    (posicaoB === 'direita' && forcaA_vetor > 0) || (posicaoB === 'esquerda' && forcaA_vetor < 0);
  const bEmpurraA =
    (posicaoB === 'direita' && forcaB_vetor < 0) || (posicaoB === 'esquerda' && forcaB_vetor > 0);
  const separa =
    (posicaoB === 'direita' && forcaA_vetor < 0 && forcaB_vetor > 0) ||
    (posicaoB === 'esquerda' && forcaA_vetor > 0 && forcaB_vetor < 0);

  if (separa) return 'Os blocos tendem a se separar; não há força de contato ativa.';
  if (aEmpurraB && bEmpurraA) return 'As forças comprimem os blocos entre si.';
  if (aEmpurraB) return 'A empurra B.';
  if (bEmpurraA) return 'B empurra A.';
  if (estadoSistema === 'parado' || estadoSistema === 'limite de escorregamento') {
    return 'Os blocos estão em contato, mas o sistema permanece parado.';
  }
  return 'Não há contato ativo.';
}

function contatoAtivo(mensagemContato) {
  return !mensagemContato.includes('não há') && mensagemContato !== 'Não há contato ativo.';
}

function calcularForcaContatoLateral({
  posicaoB,
  sentidoMovimento,
  aceleracaoSistema,
  massaB,
  atritoMaximoB,
  forcaB_vetor,
  diagnosticoContato,
  estadoSistema,
}) {
  if (estadoSistema !== 'deslizando' || !contatoAtivo(diagnosticoContato)) return 0;

  let contato = 0;
  if (posicaoB === 'direita' && sentidoMovimento === 'direita') {
    contato = massaB * aceleracaoSistema + atritoMaximoB - Math.max(forcaB_vetor, 0);
  } else if (posicaoB === 'esquerda' && sentidoMovimento === 'esquerda') {
    contato = massaB * aceleracaoSistema + atritoMaximoB - Math.max(-forcaB_vetor, 0);
  } else if (diagnosticoContato === 'B empurra A.' || diagnosticoContato === 'As forças comprimem os blocos entre si.') {
    contato = Math.max(0, massaB * aceleracaoSistema + atritoMaximoB - Math.abs(forcaB_vetor));
  }

  return Math.max(0, contato);
}

function calcularBlocosLadoALado(params) {
  const dados = baseComum(params);
  const normalInfo = calcularNormalComForcaVertical(dados.pesoA, dados.forcaA.fy);
  const normalA = normalInfo.normal;
  const normalB = Math.max(0, dados.pesoB - dados.forcaB.fy);
  const atritoMaximoA = dados.coeficienteAtrito * normalA;
  const atritoMaximoB = dados.coeficienteAtritoBsolo * normalB;
  const atritoMaximoTotal = atritoMaximoA + atritoMaximoB;
  const forcaExternaTotal = dados.forcaA.fx + dados.forcaB.fx;
  const moduloForcaExternaTotal = Math.abs(forcaExternaTotal);
  const estadoSistema = estadoPorForca(moduloForcaExternaTotal, atritoMaximoTotal);
  const estaDeslizando = estadoSistema === 'deslizando';
  const sentidoMovimento =
    estaDeslizando && forcaExternaTotal !== 0 ? (forcaExternaTotal > 0 ? 'direita' : 'esquerda') : 'nenhum';
  const forcaResultante = estaDeslizando ? moduloForcaExternaTotal - atritoMaximoTotal : 0;
  const aceleracaoSistema = estaDeslizando ? forcaResultante / (dados.massa + dados.massaB) : 0;
  const atritoAtuante = estaDeslizando ? atritoMaximoTotal : Math.min(moduloForcaExternaTotal, atritoMaximoTotal);
  const diagnosticoContato = diagnosticarContatoLateral({
    posicaoB: params.posicaoB,
    forcaA_vetor: dados.forcaA.fx,
    forcaB_vetor: dados.forcaB.fx,
    estadoSistema,
    sentidoMovimento,
  });
  const forcaContatoAB = calcularForcaContatoLateral({
    posicaoB: params.posicaoB,
    sentidoMovimento,
    aceleracaoSistema,
    massaB: dados.massaB,
    atritoMaximoB,
    forcaB_vetor: dados.forcaB.fx,
    diagnosticoContato,
    estadoSistema,
  });
  const pressaoContatoAB = forcaContatoAB / dados.areaContatoAB;

  return {
    modo: 'ladoALado',
    blocoBAtivo: true,
    posicaoB: params.posicaoB,
    peso: dados.pesoA,
    pesoA: dados.pesoA,
    pesoB: dados.pesoB,
    normal: normalA,
    normalA,
    normalB,
    atritoMaximo: atritoMaximoA,
    atritoMaximoA,
    atritoMaximoB,
    atritoMaximoTotal,
    atritoAtuante,
    direcaoAtrito: direcaoAtrito(forcaExternaTotal),
    forcaResultante,
    aceleracao: aceleracaoSistema,
    aceleracaoSistema,
    sentidoMovimento,
    estado: estadoSistema,
    estadoSistema,
    descricaoSistema: mensagemEstadoSistema(estadoSistema, sentidoMovimento, normalInfo.perdeuContatoSolo),
    forcaExternaTotal,
    forcaB_vetor: dados.forcaB_vetor,
    forcaContatoAB,
    pressaoContatoAB,
    diagnosticoContato,
    normalBExibida: normalB,
    ...dadosForcaInclinada(dados, normalInfo, atritoMaximoA),
    ...dadosForcaB(dados),
    ...pacoteGeometria(dados),
    ...tensoesDeA(dados, normalA),
  };
}

function diagnosticoEmpilhamento({
  estadoSistema,
  estadoRelativoAB,
  forcaA_vetor,
  forcaB_vetor,
  perdeuContatoSolo,
}) {
  const mensagens = ['B está sobre A. O peso de B aumenta a normal de A contra o solo.'];

  if (perdeuContatoSolo) {
    mensagens.push('A componente vertical da força em A superou o peso total do conjunto. O sistema perdeu contato com o solo.');
  } else if (estadoSistema === 'parado' || estadoSistema === 'limite de escorregamento') {
    mensagens.push('O conjunto permanece parado. O atrito do solo é suficiente para equilibrar as forças externas.');
  } else if (estadoRelativoAB === 'B acompanha A sem escorregar') {
    mensagens.push('A e B se movem juntos. O atrito entre A e B é suficiente para fazer B acompanhar A.');
  } else {
    mensagens.push('B escorrega sobre A. O atrito entre A e B não é suficiente para acelerar B junto com A.');
  }

  if (forcaA_vetor !== 0 && forcaB_vetor !== 0 && Math.sign(forcaA_vetor) !== Math.sign(forcaB_vetor)) {
    mensagens.push('As forças aplicadas em A e B competem entre si, alterando a tendência de movimento do sistema.');
  }

  return mensagens.join(' ');
}

function calcularBlocosEmpilhados(params) {
  const dados = baseComum(params);
  const normalAB = Math.max(0, dados.pesoB - dados.forcaB.fy);
  const normalInfo = calcularNormalComForcaVertical(dados.pesoA + normalAB, dados.forcaA.fy);
  const normalSoloA = normalInfo.normal;
  const atritoMaximoSoloA = dados.coeficienteAtrito * normalSoloA;
  const atritoMaximoAB = dados.coeficienteAtritoAB * normalAB;
  const forcaExternaTotal = dados.forcaA.fx + dados.forcaB.fx;
  const moduloForcaExternaTotal = Math.abs(forcaExternaTotal);
  const estadoSistema = estadoPorForca(moduloForcaExternaTotal, atritoMaximoSoloA);
  const estaDeslizando = estadoSistema === 'deslizando';
  const sentidoMovimento =
    estaDeslizando && forcaExternaTotal !== 0 ? (forcaExternaTotal > 0 ? 'direita' : 'esquerda') : 'nenhum';
  const forcaResultante = estaDeslizando ? moduloForcaExternaTotal - atritoMaximoSoloA : 0;
  const massaTotal = dados.massa + dados.massaB;
  const aceleracaoSistema = estaDeslizando ? forcaResultante / massaTotal : 0;
  const atritoAtuante = estaDeslizando ? atritoMaximoSoloA : Math.min(moduloForcaExternaTotal, atritoMaximoSoloA);
  const forcaNecessariaParaB = dados.massaB * aceleracaoSistema;
  const forcaAtritoNecessariaAB = estaDeslizando
    ? Math.abs(dados.massaB * aceleracaoSistema - dados.forcaB.fx)
    : 0;
  const estadoRelativoAB = !estaDeslizando
    ? 'sem escorregamento relativo'
    : forcaAtritoNecessariaAB <= atritoMaximoAB
      ? 'B acompanha A sem escorregar'
      : 'B escorrega sobre A';
  const pressaoContatoAB = normalAB / dados.areaContatoAB;
  const diagnosticoEmpilhado = diagnosticoEmpilhamento({
    estadoSistema,
    estadoRelativoAB,
    forcaA_vetor: dados.forcaA.fx,
    forcaB_vetor: dados.forcaB_vetor,
    perdeuContatoSolo: normalInfo.perdeuContatoSolo,
  });

  return {
    modo: 'empilhado',
    blocoBAtivo: true,
    posicaoB: 'emCima',
    peso: dados.pesoA,
    pesoA: dados.pesoA,
    pesoB: dados.pesoB,
    normal: normalSoloA,
    normalA: normalSoloA,
    normalAB,
    normalSoloA,
    atritoMaximo: atritoMaximoSoloA,
    atritoMaximoA: atritoMaximoSoloA,
    atritoMaximoSoloA,
    atritoMaximoAB,
    atritoAtuante,
    direcaoAtrito: direcaoAtrito(forcaExternaTotal),
    forcaResultante,
    aceleracao: aceleracaoSistema,
    aceleracaoSistema,
    sentidoMovimento,
    estado: estadoSistema,
    estadoSistema,
    descricaoSistema: mensagemEstadoSistema(estadoSistema, sentidoMovimento, normalInfo.perdeuContatoSolo),
    forcaExternaTotal,
    forcaB_vetor: dados.forcaB.fx,
    forcaNecessariaParaB,
    forcaAtritoNecessariaAB,
    estadoRelativoAB,
    diagnosticoEmpilhado,
    perdeuContatoAB: normalAB <= 0,
    pressaoContatoAB,
    ...dadosForcaInclinada(dados, normalInfo, atritoMaximoSoloA),
    ...dadosForcaB(dados),
    ...pacoteGeometria(dados),
    ...tensoesDeA(dados, normalSoloA),
  };
}

function mensagemPlanoInclinado({ estadoSistema, forcaSemAtrito, forcaResultante }) {
  if (estadoSistema === 'parado' && forcaSemAtrito < 0) {
    return 'O peso tende a puxar o bloco para baixo do plano, mas o atrito estático consegue segurá-lo.';
  }

  if (estadoSistema === 'parado' && forcaSemAtrito > 0) {
    return 'A força aplicada tende a puxar o bloco para cima do plano, mas o atrito estático equilibra o sistema.';
  }

  if (estadoSistema === 'parado') {
    return 'O bloco permanece parado no plano inclinado. As forças paralelas estão equilibradas.';
  }

  if (forcaResultante < 0) {
    return 'A componente do peso paralela ao plano venceu o atrito. O bloco desliza para baixo do plano.';
  }

  return 'A força aplicada venceu a componente do peso e o atrito. O bloco sobe o plano.';
}

function dadosPlanoBase(params) {
  const dados = baseComum({
    ...params,
    tipoForcaA: 'horizontal',
    sentidoForcaA: 'direita',
    sentidoVerticalForcaA: 'cima',
  });
  const anguloPlano = limitar(positivo(params.anguloPlano, 0), 0, 60);
  const thetaRad = grausParaRad(anguloPlano);
  const sentidoForcaPlano = params.sentidoForcaPlano === 'descendo' ? 'descendo' : 'subindo';
  const sentidoForcaBPlano = params.sentidoForcaBPlano === 'subindo' ? 'subindo' : 'descendo';
  const forcaAplicadaPlano =
    dados.modoForcaA === 'semForca' || dados.modoForcaA === 'perpendicular' ? 0 : sentidoForcaPlano === 'subindo' ? dados.forcaAplicada : -dados.forcaAplicada;
  const forcaAplicadaBPlano =
    dados.modoForcaB === 'semForca' || dados.modoForcaB === 'perpendicular' ? 0 : sentidoForcaBPlano === 'subindo' ? dados.forcaAplicadaB : -dados.forcaAplicadaB;
  const forcaPerpendicularPlanoA = dados.modoForcaA === 'perpendicular' ? dados.forcaAplicada : 0;
  const forcaPerpendicularPlanoB = dados.modoForcaB === 'perpendicular' ? dados.forcaAplicadaB : 0;

  return {
    dados,
    anguloPlano,
    thetaRad,
    sentidoForcaPlano,
    sentidoForcaBPlano,
    forcaAplicadaPlano,
    forcaAplicadaBPlano,
    forcaPerpendicularPlanoA,
    forcaPerpendicularPlanoB,
  };
}

function resolverMovimentoPlano({ forcaSemAtrito, atritoMaximo, massaTotal }) {
  const moduloSemAtrito = Math.abs(forcaSemAtrito);
  const sentidoTendencia = forcaSemAtrito > 0 ? 'subir' : forcaSemAtrito < 0 ? 'descer' : 'equilíbrio';
  const estaParado = moduloSemAtrito <= atritoMaximo;
  const atritoAtuante = estaParado ? moduloSemAtrito : atritoMaximo;
  const forcaResultanteModulo = estaParado ? 0 : moduloSemAtrito - atritoMaximo;
  const forcaResultante = estaParado ? 0 : forcaSemAtrito > 0 ? forcaResultanteModulo : -forcaResultanteModulo;
  const aceleracao = estaParado ? 0 : forcaResultanteModulo / massaTotal;
  const sentidoMovimento = estaParado ? 'nenhum' : forcaResultante > 0 ? 'subindo' : 'descendo';
  const estadoSistema = estaParado ? 'parado' : 'deslizando';

  return {
    moduloSemAtrito,
    sentidoTendencia,
    atritoAtuante,
    forcaResultante,
    forcaResultanteModulo,
    aceleracao,
    aceleracaoSistema: aceleracao,
    sentidoMovimento,
    estadoSistema,
    estado: estadoSistema,
  };
}

function pacoteGeometria(dados) {
  return {
    geometriaA: dados.geometriaA,
    geometriaB: dados.geometriaB,
    areaBaseA: dados.geometriaA.areaBase,
    areaLateralA: dados.geometriaA.areaLateral,
    volumeA: dados.geometriaA.volume,
    areaBaseB: dados.geometriaB.areaBase,
    areaLateralB: dados.geometriaB.areaLateral,
    volumeB: dados.geometriaB.volume,
    areaContatoAB: dados.areaContatoAB,
  };
}

function calcularPlanoInclinadoBlocoA(params) {
  const { dados, anguloPlano, thetaRad, forcaAplicadaPlano, forcaPerpendicularPlanoA } = dadosPlanoBase({
    ...params,
    blocoBAtivo: false,
  });
  const peso = dados.pesoA;
  const pesoParaleloModulo = peso * Math.sin(thetaRad);
  const pesoParalelo = -pesoParaleloModulo;
  const pesoPerpendicular = peso * Math.cos(thetaRad);
  const normal = Math.max(0, pesoPerpendicular + forcaPerpendicularPlanoA);
  const atritoMaximo = dados.coeficienteAtrito * normal;
  const forcaSemAtrito = forcaAplicadaPlano + pesoParalelo;
  const movimento = resolverMovimentoPlano({ forcaSemAtrito, atritoMaximo, massaTotal: dados.massa });
  const mensagemDidatica = mensagemPlanoInclinado({
    estadoSistema: movimento.estadoSistema,
    forcaSemAtrito,
    forcaResultante: movimento.forcaResultante,
  });

  return {
    modo: 'planoInclinado',
    cenario: 'planoInclinado',
    blocoBAtivo: false,
    massa: dados.massa,
    peso,
    pesoA: peso,
    anguloPlano,
    pesoParaleloModulo,
    pesoParalelo,
    pesoPerpendicular,
    normal,
    normalA: normal,
    atritoMaximo,
    atritoMaximoA: atritoMaximo,
    forcaAplicadaPlano,
    forcaPerpendicularPlanoA,
    forcaSemAtrito,
    ...movimento,
    atritoAtuante: movimento.atritoAtuante,
    descricaoSistema: movimento.estadoSistema === 'parado' ? 'bloco parado no plano' : `bloco ${movimento.sentidoMovimento} o plano`,
    mensagemDidatica,
    direcaoAtrito: forcaSemAtrito > 0 ? 'descendo' : forcaSemAtrito < 0 ? 'subindo' : 'nenhuma',
    forcaExternaTotal: forcaSemAtrito,
    forcaA_vetor: forcaAplicadaPlano,
    forcaA_vertical: 0,
    moduloForcaA: dados.forcaAplicada,
    anguloForcaA: 0,
    tipoForcaA: 'paralela ao plano',
    diagnosticoForcaInclinada: forcaPerpendicularPlanoA > 0
      ? 'No plano inclinado, a força perpendicular aplicada por cima de A aumenta a normal e o atrito máximo.'
      : 'No plano inclinado, a força aplicada em A é tratada como paralela à rampa.',
    ...pacoteGeometria(dados),
    ...tensoesPlano(dados, normal, forcaAplicadaPlano),
  };
}

export function diagnosticarContatoPlanoInclinado({ posicaoBPlano, forcaSemAtritoTotal, estadoSistema }) {
  if (estadoSistema === 'parado') return 'O conjunto permanece parado na rampa.';

  if (posicaoBPlano === 'acimaDeA' && forcaSemAtritoTotal > 0) return 'A empurra B para cima da rampa.';
  if (posicaoBPlano === 'acimaDeA' && forcaSemAtritoTotal < 0) return 'B empurra A para baixo da rampa.';
  if (posicaoBPlano === 'abaixoDeA' && forcaSemAtritoTotal < 0) return 'A empurra B para baixo da rampa.';
  if (posicaoBPlano === 'abaixoDeA' && forcaSemAtritoTotal > 0) return 'B empurra A para cima da rampa.';

  return 'Os blocos tendem a se separar; a força de contato é nula.';
}

function calcularContatoPlano({
  posicaoBPlano,
  sentidoMovimento,
  aceleracaoSistema,
  massaB,
  atritoMaximoB,
  pesoB,
  thetaRad,
  forcaAplicadaBPlano,
  diagnosticoContatoPlano,
  estadoSistema,
}) {
  if (estadoSistema !== 'deslizando' || diagnosticoContatoPlano.includes('nula')) return 0;

  let contato = 0;
  if (posicaoBPlano === 'acimaDeA' && sentidoMovimento === 'subindo') {
    contato =
      massaB * aceleracaoSistema +
      atritoMaximoB +
      pesoB * Math.sin(thetaRad) -
      Math.max(forcaAplicadaBPlano, 0);
  } else if (posicaoBPlano === 'abaixoDeA' && sentidoMovimento === 'descendo') {
    contato =
      massaB * aceleracaoSistema +
      atritoMaximoB -
      pesoB * Math.sin(thetaRad) -
      Math.max(-forcaAplicadaBPlano, 0);
  }

  return Math.max(0, contato);
}

function calcularPlanoInclinadoBlocosEmContato(params) {
  const { dados, anguloPlano, thetaRad, forcaAplicadaPlano, forcaAplicadaBPlano, forcaPerpendicularPlanoA, forcaPerpendicularPlanoB } = dadosPlanoBase(params);
  const pesoA = dados.pesoA;
  const pesoB = dados.pesoB;
  const pesoParaleloA = -pesoA * Math.sin(thetaRad);
  const pesoParaleloB = -pesoB * Math.sin(thetaRad);
  const pesoPerpendicularA = pesoA * Math.cos(thetaRad);
  const pesoPerpendicularB = pesoB * Math.cos(thetaRad);
  const normalA = Math.max(0, pesoPerpendicularA + forcaPerpendicularPlanoA);
  const normalB = Math.max(0, pesoPerpendicularB + forcaPerpendicularPlanoB);
  const atritoMaximoA = dados.coeficienteAtrito * normalA;
  const atritoMaximoB = dados.coeficienteAtritoBsolo * normalB;
  const atritoMaximoTotal = atritoMaximoA + atritoMaximoB;
  const forcaSemAtritoTotal = forcaAplicadaPlano + forcaAplicadaBPlano + pesoParaleloA + pesoParaleloB;
  const movimento = resolverMovimentoPlano({
    forcaSemAtrito: forcaSemAtritoTotal,
    atritoMaximo: atritoMaximoTotal,
    massaTotal: dados.massa + dados.massaB,
  });
  const diagnosticoContatoPlano = diagnosticarContatoPlanoInclinado({
    posicaoBPlano: params.posicaoBPlano,
    forcaSemAtritoTotal,
    estadoSistema: movimento.estadoSistema,
  });
  const forcaContatoAB = calcularContatoPlano({
    posicaoBPlano: params.posicaoBPlano,
    sentidoMovimento: movimento.sentidoMovimento,
    aceleracaoSistema: movimento.aceleracaoSistema,
    massaB: dados.massaB,
    atritoMaximoB,
    pesoB,
    thetaRad,
    forcaAplicadaBPlano,
    diagnosticoContatoPlano,
    estadoSistema: movimento.estadoSistema,
  });
  const pressaoContatoAB = forcaContatoAB / dados.areaContatoAB;

  return {
    modo: 'planoInclinado',
    submodoPlano: 'blocosEmContato',
    cenario: 'planoInclinado',
    blocoBAtivo: true,
    posicaoBPlano: params.posicaoBPlano,
    massa: dados.massa,
    peso: pesoA + pesoB,
    pesoA,
    pesoB,
    pesoTotal: pesoA + pesoB,
    anguloPlano,
    pesoParaleloA,
    pesoParaleloB,
    pesoParalelo: pesoParaleloA + pesoParaleloB,
    pesoParaleloModulo: Math.abs(pesoParaleloA + pesoParaleloB),
    pesoPerpendicularA,
    pesoPerpendicularB,
    pesoPerpendicular: pesoPerpendicularA + pesoPerpendicularB,
    normal: normalA + normalB,
    normalA,
    normalB,
    atritoMaximo: atritoMaximoTotal,
    atritoMaximoA,
    atritoMaximoB,
    atritoMaximoTotal,
    forcaAplicadaPlano,
    forcaAplicadaBPlano,
    forcaPerpendicularPlanoA,
    forcaPerpendicularPlanoB,
    forcaSemAtrito: forcaSemAtritoTotal,
    forcaSemAtritoTotal,
    atritoAtuante: movimento.atritoAtuante,
    ...movimento,
    descricaoSistema: movimento.estadoSistema === 'parado' ? 'conjunto parado na rampa' : `conjunto ${movimento.sentidoMovimento} a rampa`,
    mensagemDidatica: 'Os dois blocos estão em contato ao longo da rampa. O contato pode transmitir compressão, mas não tração.',
    diagnosticoContatoPlano,
    forcaContatoAB,
    pressaoContatoAB,
    direcaoAtrito: forcaSemAtritoTotal > 0 ? 'descendo' : forcaSemAtritoTotal < 0 ? 'subindo' : 'nenhuma',
    forcaExternaTotal: forcaSemAtritoTotal,
    forcaA_vetor: forcaAplicadaPlano,
    forcaA_vertical: 0,
    moduloForcaA: dados.forcaAplicada,
    tipoForcaA: 'paralela ao plano',
    diagnosticoForcaInclinada: 'No plano inclinado, as forças aplicadas são tratadas como paralelas à rampa.',
    ...pacoteGeometria(dados),
    ...tensoesPlano(dados, normalA, forcaAplicadaPlano),
  };
}

function calcularPlanoInclinadoBlocosEmpilhados(params) {
  const { dados, anguloPlano, thetaRad, forcaAplicadaPlano, forcaAplicadaBPlano, forcaPerpendicularPlanoA, forcaPerpendicularPlanoB } = dadosPlanoBase(params);
  const pesoA = dados.pesoA;
  const pesoB = dados.pesoB;
  const pesoTotal = pesoA + pesoB;
  const pesoParaleloA = -pesoA * Math.sin(thetaRad);
  const pesoParaleloB = -pesoB * Math.sin(thetaRad);
  const pesoParaleloTotal = pesoParaleloA + pesoParaleloB;
  const pesoPerpendicularA = pesoA * Math.cos(thetaRad);
  const pesoPerpendicularB = pesoB * Math.cos(thetaRad);
  const pesoPerpendicularTotal = pesoPerpendicularA + pesoPerpendicularB;
  const normalAB = Math.max(0, pesoPerpendicularB + forcaPerpendicularPlanoB);
  const normalSoloA = Math.max(0, pesoPerpendicularTotal + forcaPerpendicularPlanoA + forcaPerpendicularPlanoB);
  const atritoMaximoSoloA = dados.coeficienteAtrito * normalSoloA;
  const atritoMaximoAB = dados.coeficienteAtritoAB * normalAB;
  const forcaSemAtritoTotal = forcaAplicadaPlano + forcaAplicadaBPlano + pesoParaleloTotal;
  const movimento = resolverMovimentoPlano({
    forcaSemAtrito: forcaSemAtritoTotal,
    atritoMaximo: atritoMaximoSoloA,
    massaTotal: dados.massa + dados.massaB,
  });
  const forcaAtritoNecessariaAB = Math.abs(
    dados.massaB * movimento.aceleracaoSistema - forcaAplicadaBPlano - pesoParaleloB,
  );
  const estadoRelativoAB =
    forcaAtritoNecessariaAB <= atritoMaximoAB
      ? 'B acompanha A sem escorregar'
      : 'B escorrega sobre A';

  return {
    modo: 'planoInclinado',
    submodoPlano: 'empilhado',
    cenario: 'planoInclinado',
    blocoBAtivo: true,
    posicaoBPlano: 'emCimaDeA',
    massa: dados.massa,
    peso: pesoTotal,
    pesoA,
    pesoB,
    pesoTotal,
    anguloPlano,
    pesoParaleloA,
    pesoParaleloB,
    pesoParalelo: pesoParaleloTotal,
    pesoParaleloModulo: Math.abs(pesoParaleloTotal),
    pesoPerpendicularA,
    pesoPerpendicularB,
    pesoPerpendicular: pesoPerpendicularTotal,
    normal: normalSoloA,
    normalA: normalSoloA,
    normalSoloA,
    normalAB,
    atritoMaximo: atritoMaximoSoloA,
    atritoMaximoA: atritoMaximoSoloA,
    atritoMaximoSoloA,
    atritoMaximoAB,
    forcaAplicadaPlano,
    forcaAplicadaBPlano,
    forcaPerpendicularPlanoA,
    forcaPerpendicularPlanoB,
    forcaSemAtrito: forcaSemAtritoTotal,
    forcaSemAtritoTotal,
    atritoAtuante: movimento.atritoAtuante,
    ...movimento,
    descricaoSistema: movimento.estadoSistema === 'parado' ? 'conjunto empilhado parado' : `conjunto empilhado ${movimento.sentidoMovimento}`,
    mensagemDidatica: 'B está apoiado sobre A. O atrito entre A e B precisa ser suficiente para que B acompanhe o movimento do conjunto sem escorregar.',
    diagnosticoContatoPlano: 'B está em cima de A no plano inclinado.',
    forcaContatoAB: 0,
    pressaoContatoAB: normalAB / dados.areaContatoAB,
    forcaAtritoNecessariaAB,
    estadoRelativoAB,
    direcaoAtrito: forcaSemAtritoTotal > 0 ? 'descendo' : forcaSemAtritoTotal < 0 ? 'subindo' : 'nenhuma',
    forcaExternaTotal: forcaSemAtritoTotal,
    forcaA_vetor: forcaAplicadaPlano,
    forcaA_vertical: 0,
    moduloForcaA: dados.forcaAplicada,
    tipoForcaA: 'paralela ao plano',
    diagnosticoForcaInclinada: 'No plano inclinado, as forças aplicadas são tratadas como paralelas à rampa.',
    ...pacoteGeometria(dados),
    ...tensoesPlano(dados, normalSoloA, forcaAplicadaPlano),
  };
}

function calcularPlanoInclinado(params) {
  if (!params.blocoBAtivo) {
    return calcularPlanoInclinadoBlocoA(params);
  }

  if (params.posicaoBPlano === 'emCimaDeA') {
    return calcularPlanoInclinadoBlocosEmpilhados(params);
  }

  return calcularPlanoInclinadoBlocosEmContato(params);
}

export function calcularMecanica(params) {
  if (params.cenario === 'planoInclinado') {
    return calcularPlanoInclinado(params);
  }

  if (!params.blocoBAtivo) {
    return calcularBlocoA(params);
  }

  if (params.posicaoB === 'direita' || params.posicaoB === 'esquerda') {
    return calcularBlocosLadoALado(params);
  }

  return calcularBlocosEmpilhados(params);
}
