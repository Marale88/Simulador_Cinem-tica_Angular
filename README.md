# Simulador de Mecanica V5.1

Aplicacao web local em React + Vite para simulacoes didaticas de blocos, forcas, atrito, deformacao, plano inclinado, movimento no tempo e pista segmentada.

## Novidades da V5

- Modo `Analise de forcas`, preservando a experiencia anterior.
- Modo `Movimento no tempo`, com cinematica de aceleracao constante.
- Movimento horizontal do Corpo A com posicao, velocidade, distancia de parada e chegada ao fim da pista.
- Movimento em plano inclinado com rampa + trecho plano apos a rampa.
- Controles de velocidade inicial, posicao inicial, tempo e comprimentos dos trechos.
- Animacao simples com Play, Pausar e Reiniciar.
- Tema visual `Laboratorio retro`, com fundo escuro, grid, bordas fortes, tipografia monoespacada e cores neon.

## Novidades da V5.1

- Novo cenario `Pista segmentada`.
- Pista composta por reta inferior, rampa e reta superior.
- Coordenada unica `s` ao longo da pista.
- Posicionamento inicial de A e B nos pontos 1, 2, 3 ou por `s` personalizado.
- Velocidade e sentido inicial independentes para A e B.
- Movimento por passos de tempo com aceleracao por trecho.
- Deteccao simples de encontro entre A e B, deixando colisao/impulso para a V6.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois acesse:

```text
http://localhost:5173/
```

Se a porta 5173 estiver ocupada, o Vite informara outra porta no terminal.

## Publicar no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie este projeto para o repositorio.
3. No GitHub, abra `Settings > Pages`.
4. Em `Build and deployment`, selecione `GitHub Actions`.
5. Envie uma alteracao para a branch `main`.

O GitHub vai executar o workflow em `.github/workflows/deploy.yml` e gerar um link publico do simulador.
