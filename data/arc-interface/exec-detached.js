
const {spawn} = require("child_process");

module.exports = async function execDetached(app, params, options) {
  return new Promise((res, rej) => {
    const bat = spawn(app, params, {
      ...options,
      detached: true
    });
    bat.on("error", (err) => {
      console.error(new Error(err.stack || err));
      rej(new Error("exec failed"));
    });

    /*bat.stdout.on("data", (data) => {
      console.log(`${data}`);
    });*/
    bat.stderr.on("data", (data) => {
      console.error(new Error(`${data}`));
    });
    bat.on("exit", (code) => {
      if (code > 0) {
        rej(new Error("exec failed"));
      } else {
        res();
      }
    });
  });
};
