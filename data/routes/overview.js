/**
 * @type {import("../raid-tool").ServerRouteHandler}
 */
module.exports = async({router}) => {
  router.get("/", async(ctx) => {
    await ctx.renderView();
  });
};
