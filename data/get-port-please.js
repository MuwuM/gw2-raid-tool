module.exports = {async getPort(...args) {
  const {getPort} = (await import("get-port-please"));
  return getPort(...args);
}};
