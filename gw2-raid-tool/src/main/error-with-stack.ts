export default class ErrorWithStack extends Error {
  constructor(errorLike: Error | any) {
    super(errorLike.stack || errorLike)
  }
}
