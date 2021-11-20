const {getPort} = require("get-port-please");
const Koa = require("koa");
const render = require("koa-ejs");
const path = require("path");
const Router = require("koa-better-router");
const serve = require("koa-static");
const mount = require("koa-mount");
const koaBody = require("koa-body");
const fs = require("fs-extra");

const crypto = require("crypto");
const hashLog = require("./hash-log");
const i18n = require("./i18n");

module.exports = async({
  db, baseConfig
}) => {
  const port = await getPort({port: 7002});

  const koaApp = new Koa();
  const router = Router().loadMethods();

  render(koaApp, {
    root: path.join(__dirname, "view"),
    layout: "template",
    viewExt: "ejs",
    async: true,
    cache: false,
    debug: false
  });


  async function hashStaticFile(file) {
    const hash = crypto.createHash("md5");
    hash.update(await fs.readFile(path.join(__dirname, "static", file)));
    return hash.digest("hex").substring(0, 25);
  }
  async function hashNodeModule(pack) {
    const hash = crypto.createHash("md5");
    hash.update(await fs.readFile(require.resolve(pack)));
    return hash.digest("hex").substring(0, 25);
  }

  let _global = null;
  koaApp.use(async(ctx, next) => {
    if (!_global) {
      _global = {
        stylecss: await hashStaticFile("style.css"),
        bootstrapcss: await hashStaticFile("bootstrap.min.css"),
        luxonversion: hashNodeModule("luxon")
      };
    }
    ctx._global = _global;
    ctx.renderView = async(name, opts) => {
      if (ctx.request.query.check) {
        ctx.type = "application/json";
        ctx.body = JSON.stringify({refresh: ctx.request.query.check !== opts.logsHash});
        return;
      }
      const accounts = opts.accounts || await db.accounts.find({});
      return ctx.render(name, {
        ..._global,
        ...opts,
        lang: baseConfig.lang,
        i18n: i18n[baseConfig.lang],
        accounts,
        noNav: ctx.request.query.inner,
        gw2Dir: baseConfig.gw2Dir,
        gw2Instances: baseConfig.gw2Instances,
        launchBuddyDir: baseConfig.launchBuddyDir,
        anyNvidiaShareInstanceRunning: baseConfig.gw2Instances && baseConfig.gw2Instances.nvidiaShare && baseConfig.gw2Instances.nvidiaShare.length > 0,
        pageUrl: ctx.request.url
      });
    };
    await next();
  });

  koaApp.use(koaBody({multipart: true}));


  const files = await fs.readdir(path.join(__dirname, "routes"));

  for (const file of files) {
    if (!file.endsWith(".js")) {
      continue;
    }
    /* eslint-disable global-require */
    const routeHandler = require(path.join(__dirname, "routes", file));
    /* eslint-enable global-require */
    await routeHandler({
      router,
      db,
      baseConfig,
      hashLog(file) {
        return hashLog(`${file}.${JSON.stringify({
          gw2Dir: baseConfig.gw2Dir,
          anyGw2InstanceRunning: baseConfig.gw2Instances && baseConfig.gw2Instances.running && baseConfig.gw2Instances.running.length > 0,
          anyLBInstanceRunning: baseConfig.gw2Instances && baseConfig.gw2Instances.lauchbuddy && baseConfig.gw2Instances.lauchbuddy.length > 0,
          anyNvidiaShareInstanceRunning: baseConfig.gw2Instances && baseConfig.gw2Instances.nvidiaShare && baseConfig.gw2Instances.nvidiaShare.length > 0
        })}`);
      }
    });
  }

  koaApp.use(mount("/img", serve(`${__dirname}/img`, {maxAge: 36000000})));
  koaApp.use(mount("/static", serve(`${__dirname}/static`, {
    maxAge: 31556952000,
    immutable: true
  })));
  const luxonDir = path.join(path.dirname(require.resolve("luxon")), "../global");
  //console.log(luxonDir);
  koaApp.use(mount("/ext/luxon", serve(luxonDir, {
    maxAge: 31556952000,
    immutable: true
  })));

  koaApp.use(router.middleware());
  koaApp.listen(port);

  return {port};
};
