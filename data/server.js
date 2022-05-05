const {getPort} = require("get-port-please");
const Koa = require("koa");
const path = require("path");
const {promisify} = require("util");
const Router = require("koa-better-router");
const serve = require("koa-static");
const mount = require("koa-mount");
const fs = require("fs-extra");
const https = require("https");
const {Server: SocketIo} = require("socket.io");
const ejs = require("ejs");
const selfsigned = require("selfsigned");
const crypto = require("crypto");

const signCert = promisify(selfsigned.generate);

/**
 * @param {{db:import("./raid-tool").NedbDatabase, baseConfig:import("./raid-tool").BaseConfig, backendConfig:import("./raid-tool").BackendConfig, eventHub:import("./raid-tool").EventHub}}
 */
module.exports = async({
  db, baseConfig, backendConfig, eventHub
}) => {
  backendConfig.port = await getPort({port: 7002});

  const koaApp = new Koa();
  const router = Router().loadMethods();


  const viewPath = path.join(__dirname, "view", "template.ejs");

  const i18nFiles = await fs.readdir(path.join(__dirname, "i18n"));
  const i18nContent = [];
  for (const file of i18nFiles) {
    if (!file.endsWith(".js")) {
      continue;
    }
    const fileContent = `${await fs.readFile(path.join(__dirname, "i18n", file))}`;
    const lang = path.basename(file, ".js");
    i18nContent.push(fileContent.replace(/module\.exports\s*=\s*\{/, `window['i18n/${lang}'] = {`));
  }

  const _global = {
    stylecss: await hashStaticFile("style.css"),
    bootstrapcss: await hashNodeModuleHard("bootswatch"),
    luxonversion: await hashNodeModule("luxon"),
    socketversion: await hashNodeModule("socket.io"),
    vueversion: await hashNodeModule("vue"),
    i18nversion: await hashStr(i18nContent.join("\n")),
    indexjsversion: await hashStaticFile("../public/index.js")
  };
  koaApp.context._global = _global;
  koaApp.context.renderView = async function() {
    const ctx = this;
    _global.stylecss = await hashStaticFile("style.css");
    _global.indexjsversion = await hashStaticFile("../public/index.js");
    const tpl = await fs.readFile(viewPath, "utf8");
    const html = await ejs.render(tpl, {
      ..._global,
      lang: baseConfig.lang
    }, {
      filename: viewPath,
      debug: false,
      cache: false,
      async: true
    });
    ctx.type = "html";
    ctx.body = html;
  };


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
  async function hashNodeModuleHard(pack) {
    const hash = crypto.createHash("md5");
    hash.update(await fs.readFile(path.join(__dirname, `node_modules/${pack}/package.json`)));
    return hash.digest("hex").substring(0, 25);
  }
  async function hashStr(str) {
    const hash = crypto.createHash("md5");
    hash.update(str);
    return hash.digest("hex").substring(0, 25);
  }


  router.get("/i18n.js", (ctx) => {
    ctx.body = i18nContent.join("\n");
  });

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
      backendConfig,
      eventHub
    });
  }

  koaApp.use(mount("/", serve(`${__dirname}/public`)));
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
  const vueDir = path.join(path.dirname(require.resolve("vue")), "dist");
  //console.log({vueDir});
  koaApp.use(mount("/ext/vue", serve(vueDir, {
    maxAge: 31556952000,
    immutable: true
  })));
  const bootswatchDir = path.join(__dirname, "node_modules/bootswatch/dist/darkly");
  koaApp.use(mount("/ext/bootswatch", serve(bootswatchDir, {
    maxAge: 31556952000,
    immutable: true
  })));

  koaApp.use(router.middleware());

  /*const keys = await createCertificate({
    selfSigned: true,
    days: 90
  });*/

  const signedCert = await signCert(null, {days: 90});

  backendConfig.certificate = signedCert.cert;

  const httpsServer = https.createServer({
    key: signedCert.private,
    cert: signedCert.cert
  }, koaApp.callback());
  const io = new SocketIo(httpsServer, {allowRequest: (req, callback) => {
    console.log("Check backend socket cert");
    callback(null, true);
  }});
  httpsServer.listen(backendConfig.port);

  return {io};
};
