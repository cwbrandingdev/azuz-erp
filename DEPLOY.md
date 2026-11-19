# Deploy do backend

O backend roda no Fly.io (app `atria-backend-broken-night-9242`). A publicação é feita **pelo GitHub**, e não pela
pasta de alguém, para nunca subir código desatualizado.

## Publicar

1. O PR é aprovado e mergeado na `master`. Isso **não** publica nada.
2. No GitHub: aba **Actions**, workflow **Deploy backend**, botão **Run workflow**, branch **master**.
3. O workflow compila a `master` do zero, publica e testa (versão no `/health` e login com `rememberMe`).
   Se o teste falhar, ele volta para a imagem anterior.

Só o usuário definido em `DEPLOY_USER` (em `.github/workflows/deploy-backend.yml`) consegue publicar. Qualquer outra pessoa
vê o job falhar logo no primeiro passo.

## Configuração única

- Criar o token: `flyctl tokens create deploy -a atria-backend-broken-night-9242`.
- Cadastrar no GitHub (Settings, Secrets and variables, Actions) com o nome `FLY_API_TOKEN`.
- O token é um segredo: não colar em chat, arquivo ou PR.

## Por que `fly deploy` direto falha

O `Dockerfile` exige o argumento `GIT_SHA`. Um `fly deploy` feito da pasta de alguém não o informa e para com uma mensagem
explicando. O `fly deploy` envia a **pasta local**, e uma pasta desatualizada já derrubou o login em produção
(`rememberMe` ausente, 400). Dar `git push` antes não resolve: o que vale é a pasta de onde se publica.

Em emergência: `fly deploy --build-arg GIT_SHA=manual-seunome`, a partir de uma pasta na `master`, limpa e igual à `origin/master`.

## Conferir o que está no ar

`GET https://atria-backend-broken-night-9242.fly.dev/health` devolve `version` com o commit publicado.

## Voltar a uma versão anterior

`flyctl releases -a atria-backend-broken-night-9242 --image` lista as imagens. Para voltar:

```
flyctl deploy -a atria-backend-broken-night-9242 --image registry.fly.io/atria-backend-broken-night-9242:deployment-<ID>
```

Os segredos e o banco não mudam com um rollback de imagem.
