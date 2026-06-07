export function criarPistaSegmentada(params) {
  const L1 = Math.max(Number(params.comprimentoRetaInferior) || 0, 0);
  const L2 = Math.max(Number(params.comprimentoRampa) || 5, 0.1);
  const L3 = Math.max(Number(params.comprimentoRetaSuperior) || 0, 0);
  const angulo = Math.max(0, Math.min(Number(params.anguloPlano) || 0, 60));

  return {
    L1,
    L2,
    L3,
    angulo,
    sInicioRampa: L1,
    sFimRampa: L1 + L2,
    sFimPista: L1 + L2 + L3,
  };
}

export function obterTrechoDaPista(s, pista) {
  if (s < 0) return 'foraAntes';
  if (s <= pista.L1) return 'retaInferior';
  if (s <= pista.L1 + pista.L2) return 'rampa';
  if (s <= pista.sFimPista) return 'retaSuperior';
  return 'foraDepois';
}

export function obterSInicialPorPonto(tipo, pista, sPersonalizado = 0) {
  if (tipo === 'ponto1') return pista.L1 / 2;
  if (tipo === 'ponto2') return pista.L1 + pista.L2 / 2;
  if (tipo === 'ponto3') return pista.L1 + pista.L2 + pista.L3 / 2;
  return Math.max(0, Math.min(Number(sPersonalizado) || 0, pista.sFimPista));
}

export function criarGeometriaVisualPista(pista, largura = 900, altura = 380) {
  const margemX = 74;
  const baseY = altura - 78;
  const topoMin = 64;
  const thetaRad = (pista.angulo * Math.PI) / 180;
  const projecaoRampa = pista.L2 * Math.cos(thetaRad);
  const alturaRampa = pista.L2 * Math.sin(thetaRad);
  const larguraFisica = Math.max(pista.L1 + projecaoRampa + pista.L3, 0.1);
  const alturaFisica = Math.max(alturaRampa, 0.1);
  const pxPorMetro = Math.min((largura - margemX * 2) / larguraFisica, (baseY - topoMin) / alturaFisica);
  const L1px = pista.L1 * pxPorMetro;
  const L2px = pista.L2 * pxPorMetro;
  const L3px = pista.L3 * pxPorMetro;
  const p0 = { x: margemX, y: baseY };
  const p1 = { x: p0.x + L1px, y: p0.y };
  const p2 = {
    x: p1.x + Math.cos(thetaRad) * L2px,
    y: p1.y - Math.sin(thetaRad) * L2px,
  };
  const p3 = { x: p2.x + L3px, y: p2.y };

  return { largura, altura, p0, p1, p2, p3, pxPorMetro, thetaRad };
}

function interpolar(a, b, progress) {
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
  };
}

export function mapearSParaXY(s, pista, visual) {
  const trecho = obterTrechoDaPista(s, pista);
  const thetaRad = visual.thetaRad;

  if (trecho === 'retaInferior' || trecho === 'foraAntes') {
    const progress = pista.L1 > 0 ? Math.max(0, Math.min(s / pista.L1, 1)) : 0;
    return {
      ...interpolar(visual.p0, visual.p1, progress),
      trecho: 'retaInferior',
      anguloVisual: 0,
      tangent: { x: 1, y: 0 },
      normal: { x: 0, y: -1 },
    };
  }

  if (trecho === 'rampa') {
    const progress = Math.max(0, Math.min((s - pista.L1) / pista.L2, 1));
    return {
      ...interpolar(visual.p1, visual.p2, progress),
      trecho: 'rampa',
      anguloVisual: -pista.angulo,
      tangent: { x: Math.cos(thetaRad), y: -Math.sin(thetaRad) },
      normal: { x: -Math.sin(thetaRad), y: -Math.cos(thetaRad) },
    };
  }

  const progress = pista.L3 > 0 ? Math.max(0, Math.min((s - pista.L1 - pista.L2) / pista.L3, 1)) : 0;
  return {
    ...interpolar(visual.p2, visual.p3, progress),
    trecho: 'retaSuperior',
    anguloVisual: 0,
    tangent: { x: 1, y: 0 },
    normal: { x: 0, y: -1 },
  };
}
